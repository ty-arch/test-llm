import { Injectable } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { randomUUID } from "node:crypto";
import { TaskStatus, Prisma } from "@prisma/client";
import { EmbeddingService } from "./embedding.service";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentService } from "./document.service";
import { SseService } from "../sse/sse.service";
import { extractText, UnsupportedFormatError } from "./parsers/parser.factory";

// 文档处理任务的 taskType（task_events 里用于关联同一文档的多条进度事件）。
export const DOCUMENT_PROCESS_TASK = "document.process";

// 将向量数组格式化为 pgvector 可识别的文本字面量，如 "[0.1,0.2,...]"。
function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

// 解析 → 分块 → 向量化流水线。解析细节收敛在 parsers/，分块用 LangChain 的
// RecursiveCharacterTextSplitter（chunkSize 500 / chunkOverlap 50）。
// 开始/完成/失败会通过 SseService 先落库 task_events 再实时推送。
@Injectable()
export class ChunkService {
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly embeddingService: EmbeddingService,
    private readonly sseService: SseService,
  ) {}

  // 失败出口：更新文档状态（error/unsupported）→ 推送 error 事件 → 抛错。
  private async fail(
    documentId: string,
    userId: string,
    docStatus: "error" | "unsupported",
    message: string,
  ): Promise<never> {
    await this.prisma.document.update({ where: { id: documentId }, data: { status: docStatus } });
    await this.sseService.emit(userId, {
      taskType: DOCUMENT_PROCESS_TASK,
      taskId: documentId,
      status: TaskStatus.error,
      message,
    });
    throw new Error(message);
  }

  // 解析 → 分块 → 向量化 → 落库（含 pgvector 向量）→ 更新 status/chunkCount。
  async processDocument(documentId: string, userId: string): Promise<{ chunkCount: number }> {
    const doc = await this.documentService.findById(documentId, userId);
    if (!doc.filePath) {
      await this.prisma.document.update({ where: { id: documentId }, data: { status: "error" } });
      await this.sseService.emit(userId, {
        taskType: DOCUMENT_PROCESS_TASK,
        taskId: documentId,
        status: TaskStatus.error,
        message: "文档缺少物理文件路径",
      });
      throw new Error("文档缺少物理文件路径");
    }

    try {
      await this.sseService.emit(userId, {
        taskType: DOCUMENT_PROCESS_TASK,
        taskId: documentId,
        status: TaskStatus.processing,
        message: `开始处理文档「${doc.filename}」`,
        metadata: { filename: doc.filename },
      });

      const text = await extractText(doc.filePath, doc.mimeType);
      const trimmed = text.trim();
      if (!trimmed) throw new Error("未能从文件中提取到文本内容");

      const chunks = await this.splitter.splitText(trimmed);
      if (chunks.length === 0) throw new Error("未能从文件中分块出任何文本");
      const vectors = await this.embeddingService.embedTexts(chunks);

      // pgvector 列（embedding）为 Unsupported("vector")，Prisma 客户端无法直接写入，
      // 故用原始 SQL 一次一个 chunk 插入（embedding 以文本字面量 + ::vector 传入）。
      const inserts = chunks.map(
        (content, index): Prisma.PrismaPromise<number> =>
          this.prisma.$executeRaw`
            INSERT INTO "DocumentChunk" ("id", "documentId", "content", "chunkIndex", "embedding")
            VALUES (${randomUUID()}, ${documentId}, ${content}, ${index}, ${vectorLiteral(vectors[index])}::vector)
          `,
      );
      await this.prisma.$transaction(inserts);

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: "done", chunkCount: chunks.length },
      });
      await this.sseService.emit(userId, {
        taskType: DOCUMENT_PROCESS_TASK,
        taskId: documentId,
        status: TaskStatus.done,
        message: "文档处理完成",
        metadata: { chunkCount: chunks.length },
      });
      return { chunkCount: chunks.length };
    } catch (error) {
      const unsupported = error instanceof UnsupportedFormatError;
      return this.fail(
        documentId,
        userId,
        unsupported ? "unsupported" : "error",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // 供 process 路由使用：校验归属并把状态置为 processing，随后后台执行流水线
  // （不 await，保证接口快速返回 202；失败会写 error/unsupported 状态并推送 error 事件）。
  async startProcessing(documentId: string, userId: string): Promise<void> {
    await this.documentService.findById(documentId, userId);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: "processing" },
    });
    this.processDocument(documentId, userId).catch(() => undefined);
  }
}
