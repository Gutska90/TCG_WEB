import { Body, Controller, Param, Post } from "@nestjs/common";
import { createFileUploadSchema, type CreateFileUploadInput } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
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
  complete(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.files.complete(user.id, id);
  }
}
