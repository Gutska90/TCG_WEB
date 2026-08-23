import { HttpStatus } from "@nestjs/common";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { FilesService } from "./files.service";
import type { ObjectStore, StoredObject } from "./object-store";

class MemoryStore implements ObjectStore {
  readonly kind = "object";
  readonly bucket = "memory";
  private readonly objects = new Map<string, { mime: string; bytes: Buffer }>();

  async presignPut(key: string): Promise<string | null> {
    return `memory://put/${key}`;
  }

  put(key: string, mime: string, bytes: Buffer): void {
    this.objects.set(key, { mime, bytes });
  }

  clear(): void {
    this.objects.clear();
  }

  async head(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async get(key: string): Promise<StoredObject | null> {
    const row = this.objects.get(key);
    if (!row) return null;
    return { body: Readable.from(row.bytes), contentType: row.mime, contentLength: row.bytes.length };
  }
}

describe("FilesService", () => {
  const prisma = {
    file: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const store = new MemoryStore();
  const service = new FilesService(prisma as never, store);

  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
  });

  it("rejects SVG as listing photo", async () => {
    await expect(
      service.createUpload("u1", { mime: "image/svg+xml", size: 12, purpose: "LISTING" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.FILE_NOT_ALLOWED, status: HttpStatus.BAD_REQUEST });
  });

  it("returns a presigned URL for object storage", async () => {
    prisma.file.create.mockResolvedValue({});
    const created = await service.createUpload("u1", { mime: "image/jpeg", size: 20, purpose: "LISTING" });
    expect(created.storage).toBe("object");
    expect(created.uploadUrl).toMatch(/^memory:\/\/put\//);
    expect(prisma.file.create).toHaveBeenCalled();
  });

  it("does not mark READY until the object exists", async () => {
    prisma.file.findUnique.mockResolvedValue({
      id: "f1",
      uploadedById: "u1",
      status: "PENDING",
      key: "listing/u1/f1",
    });
    await expect(service.complete("u1", "f1")).rejects.toMatchObject({
      code: ERROR_CODES.FILE_NOT_READY,
      status: HttpStatus.CONFLICT,
    });
  });

  it("completes after the object is stored", async () => {
    store.put("listing/u1/f1", "image/jpeg", Buffer.from("xx"));
    prisma.file.findUnique.mockResolvedValue({
      id: "f1",
      uploadedById: "u1",
      status: "PENDING",
      key: "listing/u1/f1",
    });
    prisma.file.update.mockResolvedValue({});
    await expect(service.complete("u1", "f1")).resolves.toEqual({ fileId: "f1", status: "READY" });
  });

  it("does not serve dispute evidence on the public file route", async () => {
    prisma.file.findUnique.mockResolvedValue({
      id: "f1",
      status: "READY",
      key: "dispute_evidence/u1/f1",
      mime: "image/jpeg",
      size: 2,
    });
    await expect(service.openPublic("f1")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });
});
