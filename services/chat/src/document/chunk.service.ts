import { Injectable } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { EmbeddingService } from "./embedding.service";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentService } from "./document.service";
import { extractText, UnsupportedFormatError } from "./parsers/parser.factory";

// 将向量数组格式化为 pgvector 可识别的文本字面量，如 "[0.1,0.2,...]"。
function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

// 解析 → 分块 → 向量化流水线。解析细节收敛在 parsers/，分块用 LangChain 的
// RecursiveCharacterTextSplitter（chunkSize 500 / chunkOverlap 50）。
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
  ) {}

  // 解析 → 分块 → 向量化 → 落库（含 pgvector 向量）→ 更新 status/chunkCount。
  async processDocument(documentId: string, userId: string): Promise<{ chunkCount: number }> {
    const doc = await this.documentService.findById(documentId, userId);
    if (!doc.filePath) throw new Error("文档缺少物理文件路径");

    let text: string;
    try {
      text = await extractText(doc.filePath, doc.mimeType);
    } catch (error) {
      if (error instanceof UnsupportedFormatError) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { status: "unsupported" },
        });
      } else {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { status: "error" },
        });
      }
      throw error;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      await this.prisma.document.update({ where: { id: documentId }, data: { status: "error" } });
      throw new Error("未能从文件中提取到文本内容");
    }

    const chunks = await this.splitter.splitText(trimmed);
    if (chunks.length === 0) {
      await this.prisma.document.update({ where: { id: documentId }, data: { status: "error" } });
      throw new Error("未能从文件中分块出任何文本");
    }
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
    return { chunkCount: chunks.length };
  }

  // 供 process 路由使用：校验归属并把状态置为 processing，随后后台执行流水线
  // （不 await，保证接口快速返回 202；失败已把状态写成 error/unsupported）。
  async startProcessing(documentId: string, userId: string): Promise<void> {
    await this.documentService.findById(documentId, userId);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: "processing" },
    });
    this.processDocument(documentId, userId).catch(() => undefined);
  }
}
