import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingService } from "./embedding.service";

// 将向量数组格式化为 pgvector 可识别的文本字面量，如 "[0.1,0.2,...]"。
function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

// 单条命中（content + 相似度分）。
export interface SearchHit {
  id: string;
  documentId: string;
  content: string;
  score: number;
}

// 语义检索：查询向量与 pgvector 做余弦距离（<=>），并按文档归属过滤用户。
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // 语义相似度检索，返回 topK 条（content + score，score 越接近 1 越相似）。
  async similaritySearch(query: string, userId: string, topK = 5): Promise<SearchHit[]> {
    const queryText = query.trim();
    if (!queryText) return [];

    const [vector] = await this.embeddingService.embedTexts([queryText]);
    const limit = Math.min(Math.max(Math.trunc(topK) || 5, 1), 50);

    // pgvector <=> 给出余弦距离；score = 1 - 距离。userId 过滤实现用户隔离。
    const rows = await this.prisma.$queryRaw<SearchHit[]>`
      SELECT c."id", c."documentId", c.content,
             (1 - (c.embedding <=> ${vectorLiteral(vector)}::vector)) AS score
      FROM "DocumentChunk" c
      JOIN "Document" d ON d."id" = c."documentId"
      WHERE d."userId" = ${userId}
      ORDER BY c.embedding <=> ${vectorLiteral(vector)}::vector
      LIMIT ${limit}
    `;

    return rows.map((row) => ({ ...row, score: Number(row.score) }));
  }
}
