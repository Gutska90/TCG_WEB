import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ERROR_CODES } from "@tcg/config";
import type { FileUploadView } from "@tcg/types";
import type { CreateFileUploadInput } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async createUpload(userId: string, input: CreateFileUploadInput): Promise<FileUploadView> {
    const id = randomUUID();
    await this.prisma.file.create({
      data: {
        id,
        bucket: "deferred",
        key: `${input.purpose.toLowerCase()}/${userId}/${id}`,
        mime: input.mime,
        size: input.size,
        uploadedById: userId,
        status: "PENDING",
      },
    });
    return { fileId: id, uploadUrl: null, storage: "deferred" };
  }

  async complete(userId: string, fileId: string): Promise<{ fileId: string; status: "READY" }> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.uploadedById !== userId) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Archivo no encontrado");
    }
    if (file.status === "READY") {
      return { fileId, status: "READY" };
    }
    await this.prisma.file.update({ where: { id: fileId }, data: { status: "READY" } });
    return { fileId, status: "READY" };
  }
}
