import { randomUUID } from "node:crypto";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
  AVATAR_MIMES,
  DISPUTE_EVIDENCE_MIMES,
  ERROR_CODES,
  LISTING_IMAGE_MIMES,
  PLATFORM,
} from "@tcg/config";
import type { FileUploadView } from "@tcg/types";
import type { CreateFileUploadInput } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { OBJECT_STORE, type ObjectStore, type StoredObject } from "./object-store";

export type OpenedFile = StoredObject & {
  mime: string;
  size: number;
  fileId: string;
};

function allowedMimes(purpose: CreateFileUploadInput["purpose"]): readonly string[] {
  if (purpose === "DISPUTE_EVIDENCE") return DISPUTE_EVIDENCE_MIMES;
  if (purpose === "AVATAR") return AVATAR_MIMES;
  return LISTING_IMAGE_MIMES;
}

function purposeFromKey(key: string): CreateFileUploadInput["purpose"] | null {
  if (key.startsWith("listing/")) return "LISTING";
  if (key.startsWith("avatar/")) return "AVATAR";
  if (key.startsWith("dispute_evidence/")) return "DISPUTE_EVIDENCE";
  return null;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORE) private readonly store: ObjectStore,
  ) {}

  async createUpload(userId: string, input: CreateFileUploadInput): Promise<FileUploadView> {
    if (!allowedMimes(input.purpose).includes(input.mime)) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.FILE_NOT_ALLOWED, "Tipo de archivo no permitido");
    }
    if (input.purpose === "DISPUTE_EVIDENCE" && input.size > PLATFORM.disputeEvidenceMaxBytes) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.FILE_NOT_ALLOWED, "Archivo demasiado grande");
    }
    if (input.purpose !== "DISPUTE_EVIDENCE" && input.size > PLATFORM.listingMaxImageBytes) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.FILE_NOT_ALLOWED, "Archivo demasiado grande");
    }
    const id = randomUUID();
    const key = `${input.purpose.toLowerCase()}/${userId}/${id}`;
    await this.prisma.file.create({
      data: {
        id,
        bucket: this.store.bucket,
        key,
        mime: input.mime,
        size: input.size,
        uploadedById: userId,
        status: "PENDING",
      },
    });
    const uploadUrl = await this.store.presignPut(key, input.mime);
    return {
      fileId: id,
      uploadUrl,
      storage: this.store.kind === "object" ? "object" : "deferred",
    };
  }

  async complete(userId: string, fileId: string): Promise<{ fileId: string; status: "READY" }> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.uploadedById !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Archivo no encontrado");
    }
    if (file.status === "READY") {
      return { fileId, status: "READY" };
    }
    const exists = await this.store.head(file.key);
    if (!exists) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.FILE_NOT_READY, "El archivo aún no está en storage");
    }
    await this.prisma.file.update({ where: { id: fileId }, data: { status: "READY" } });
    return { fileId, status: "READY" };
  }

  async openPublic(fileId: string): Promise<OpenedFile> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status !== "READY") {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Archivo no encontrado");
    }
    const purpose = purposeFromKey(file.key);
    if (purpose !== "LISTING" && purpose !== "AVATAR") {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Archivo no encontrado");
    }
    return this.openStored(file);
  }

  async openStored(file: { id: string; key: string; mime: string; size: number }): Promise<OpenedFile> {
    const stored = await this.store.get(file.key);
    if (!stored) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.FILE_NOT_STORED, "El archivo no está disponible");
    }
    return {
      ...stored,
      mime: file.mime,
      size: stored.contentLength ?? file.size,
      fileId: file.id,
    };
  }
}
