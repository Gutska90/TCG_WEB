import { Readable } from "node:stream";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { objectStorageConfigured } from "@tcg/config";

export type StoredObject = {
  body: Readable;
  contentType?: string;
  contentLength?: number;
};

export type ObjectStore = {
  kind: "deferred" | "object";
  bucket: string;
  presignPut(key: string, mime: string): Promise<string | null>;
  head(key: string): Promise<boolean>;
  get(key: string): Promise<StoredObject | null>;
};

const PRESIGN_TTL_SEC = 900;

export class DeferredObjectStore implements ObjectStore {
  readonly kind = "deferred";
  readonly bucket = "deferred";

  async presignPut(): Promise<string | null> {
    return null;
  }

  async head(): Promise<boolean> {
    return true;
  }

  async get(): Promise<StoredObject | null> {
    return null;
  }
}

function envTrimmed(value: string | undefined): string {
  return value?.trim() ?? "";
}

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function toReadable(body: unknown): Readable {
  if (body instanceof Readable) return body;
  if (body && typeof body === "object" && "transformToWebStream" in body) {
    const web = (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
    return Readable.fromWeb(web);
  }
  throw new Error("unsupported object body");
}

export class S3ObjectStore implements ObjectStore {
  readonly kind = "object";

  constructor(
    private readonly client: S3Client,
    readonly bucket: string,
  ) {}

  async presignPut(key: string, mime: string): Promise<string | null> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mime }),
      { expiresIn: PRESIGN_TTL_SEC },
    );
  }

  async head(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      const name = (err as { name?: string }).name;
      if (status === 404 || name === "NotFound" || name === "NoSuchKey") return false;
      throw err;
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!out.Body) return null;
      return {
        body: toReadable(out.Body),
        contentType: out.ContentType,
        contentLength: out.ContentLength,
      };
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      const name = (err as { name?: string }).name;
      if (status === 404 || name === "NotFound" || name === "NoSuchKey") return null;
      throw err;
    }
  }
}

type S3Resolved = {
  client: S3Client;
  bucket: string;
};

export function resolveS3Config(env: NodeJS.Dict<string> = process.env): S3Resolved | null {
  if (!objectStorageConfigured(env)) return null;

  const s3Endpoint = envTrimmed(env.S3_ENDPOINT);
  const publicEndpoint = envTrimmed(env.S3_PUBLIC_ENDPOINT) || s3Endpoint;
  const r2Account = envTrimmed(env.R2_ACCOUNT_ID);

  if (s3Endpoint) {
    const region = envTrimmed(env.S3_REGION) || "us-east-1";
    const bucket = envTrimmed(env.S3_BUCKET);
    const client = new S3Client({
      region,
      endpoint: publicEndpoint,
      credentials: {
        accessKeyId: envTrimmed(env.S3_ACCESS_KEY_ID),
        secretAccessKey: envTrimmed(env.S3_SECRET_ACCESS_KEY),
      },
      forcePathStyle: envFlag(env.S3_FORCE_PATH_STYLE, true),
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    return { client, bucket };
  }

  const bucket = envTrimmed(env.R2_BUCKET);
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${r2Account}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: envTrimmed(env.R2_ACCESS_KEY_ID),
      secretAccessKey: envTrimmed(env.R2_SECRET_ACCESS_KEY),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return { client, bucket };
}

/**
 * SDK interno (Head/Get) usa S3_ENDPOINT (p.ej. http://minio:9000).
 * Presign para el browser usa S3_PUBLIC_ENDPOINT (p.ej. http://localhost:9100).
 */
export function createObjectStoreFromEnv(env: NodeJS.Dict<string> = process.env): ObjectStore {
  const resolved = resolveS3Config(env);
  if (!resolved) return new DeferredObjectStore();

  const s3Endpoint = envTrimmed(env.S3_ENDPOINT);
  const publicEndpoint = envTrimmed(env.S3_PUBLIC_ENDPOINT);
  if (s3Endpoint && publicEndpoint && publicEndpoint !== s3Endpoint) {
    const internal = new S3Client({
      region: envTrimmed(env.S3_REGION) || "us-east-1",
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId: envTrimmed(env.S3_ACCESS_KEY_ID),
        secretAccessKey: envTrimmed(env.S3_SECRET_ACCESS_KEY),
      },
      forcePathStyle: envFlag(env.S3_FORCE_PATH_STYLE, true),
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    return new SplitEndpointStore(internal, resolved.client, resolved.bucket);
  }

  return new S3ObjectStore(resolved.client, resolved.bucket);
}

/** Head/Get contra endpoint interno; PUT prefirmado contra el host público. */
class SplitEndpointStore implements ObjectStore {
  readonly kind = "object";
  readonly bucket: string;
  private readonly internal: S3ObjectStore;
  private readonly publicStore: S3ObjectStore;

  constructor(internalClient: S3Client, publicClient: S3Client, bucket: string) {
    this.bucket = bucket;
    this.internal = new S3ObjectStore(internalClient, bucket);
    this.publicStore = new S3ObjectStore(publicClient, bucket);
  }

  presignPut(key: string, mime: string): Promise<string | null> {
    return this.publicStore.presignPut(key, mime);
  }

  head(key: string): Promise<boolean> {
    return this.internal.head(key);
  }

  get(key: string): Promise<StoredObject | null> {
    return this.internal.get(key);
  }
}

export const OBJECT_STORE = "OBJECT_STORE";
