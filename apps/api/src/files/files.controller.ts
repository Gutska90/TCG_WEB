import { Body, Controller, Get, Header, Param, Post, StreamableFile } from "@nestjs/common";
import { createFileUploadSchema, uuidParamSchema, type CreateFileUploadInput } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { FilesService } from "./files.service";

@Controller("v1/files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("uploads")
  createUpload(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createFileUploadSchema)) body: CreateFileUploadInput,
  ) {
    return this.files.createUpload(user.id, body);
  }

  @Post(":id/complete")
  complete(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
  ) {
    return this.files.complete(user.id, id);
  }

  @Public()
  @Get(":id")
  @Header("Cache-Control", "public, max-age=300")
  @Header("X-Content-Type-Options", "nosniff")
  async getPublic(@Param("id", new ZodPipe(uuidParamSchema)) id: string): Promise<StreamableFile> {
    const file = await this.files.openPublic(id);
    return new StreamableFile(file.body, {
      type: file.mime,
      length: file.size,
      disposition: "inline",
    });
  }
}
