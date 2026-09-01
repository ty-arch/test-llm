import { Body, Controller, Post } from "@nestjs/common";
import { EmbeddingService } from "./embedding.service";
import { VectorStoreService } from "./vector-store.service";

@Controller("api/embedding")
export class EmbeddingController {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  // 单个文本转向量，返回维度与向量。
  @Post("embed")
  async embed(@Body() body: { text: string }) {
    const vector = await this.embeddingService.embedQuery(body.text);
    return { dimensions: vector.length, vector };
  }

  // 批量文本入库。
  @Post("store")
  async store(@Body() body: { texts: string[] }) {
    const count = await this.vectorStoreService.addTexts(body.texts);
    return { stored: count };
  }

  // 相似度检索，返回最相近的 k 个文档。
  @Post("search")
  async search(@Body() body: { query: string; k?: number }) {
    const k = body.k ?? 4;
    const results = await this.vectorStoreService.search(body.query, k);
    return { results };
  }
}
