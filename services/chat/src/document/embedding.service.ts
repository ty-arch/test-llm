import { Injectable } from "@nestjs/common";
// 复用第四章基于 @xenova/transformers 的本地嵌入服务（Xenova/paraphrase-multilingual-MiniLM-L12-v2），
// 避免再实例化一份模型管线。
import { EmbeddingService as ModelEmbeddingService } from "../llm/embedding/embedding.service";

// 文档域的向量化门面：embedTexts 批量产出 mean pooling + L2 单位化的 384 维向量，
// 具体推理委托给第四章的 EmbeddingService（同一模型实例）。
@Injectable()
export class EmbeddingService {
  constructor(private readonly modelEmbedding: ModelEmbeddingService) {}

  // 批量文本 → 384 维向量数组。
  async embedTexts(texts: string[]): Promise<number[][]> {
    return this.modelEmbedding.embedDocuments(texts);
  }
}
