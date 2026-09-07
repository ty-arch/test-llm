import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import type { AuthUser } from "../auth/current-user.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { UploadFile } from "./document.service";
import { ALLOWED_MIME_TYPES, DocumentService, MAX_FILE_SIZE } from "./document.service";

// 文档路由：全部需要 JWT。
@Controller("api/documents")
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // POST /api/documents/upload —— multipart 内存存储上传，fileFilter 拦截非法类型。
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`不允许的文件类型: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadFile | undefined,
    @Body() body?: { filename?: string },
  ) {
    if (!file) throw new BadRequestException("缺少 file 文件字段");
    return this.documentService.upload(user.id, file, body?.filename);
  }

  // POST /api/documents/:id/process —— 触发解析+分块+向量化（异步，返回 202）。
  @Post(":id/process")
  async process(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const doc = await this.documentService.startProcessing(id, user.id);
    res.status(202);
    return { id: doc.id, status: "processing" };
  }

  // GET /api/documents —— 当前用户文档列表。
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.documentService.findByUser(user.id);
  }

  // GET /api/documents/:id —— 文档详情（含 chunks）。
  @Get(":id")
  async detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.documentService.findByIdWithChunks(id, user.id);
  }

  // DELETE /api/documents/:id —— 删除文档（含物理文件）。
  @Delete(":id")
  async delete(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.documentService.delete(id, user.id);
    return { ok: true };
  }
}
