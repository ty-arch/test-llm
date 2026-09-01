import { Injectable } from "@nestjs/common";
import { Embeddings } from "@langchain/core/embeddings";
import { env, pipeline } from "@xenova/transformers";

// 本地嵌入模型：多语言 MiniLM，输出 384 维向量，支持中文。
const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

// 支持通过环境变量覆盖模型下载源（默认 huggingface.co；国内可用 https://hf-mirror.com/ 等镜像）。
if (process.env.HF_REMOTE_HOST) {
  env.remoteHost = process.env.HF_REMOTE_HOST;
}

// 特征提取管线（feature-extraction）的调用形态：输入文本，输出浮点向量。
interface Extractor {
  _call(
    texts: string | string[],
    options?: { pooling?: "none" | "mean" | "cls"; normalize?: boolean },
  ): Promise<{ data: Float32Array; dims: number[] }>;
}

@Injectable()
export class EmbeddingService extends Embeddings {
  // 懒加载的本地特征提取管线（首次调用会从 HuggingFace 下载模型到本地缓存）。
  private extractor: Extractor | null = null;

  constructor() {
    super({});
  }

  private async getExtractor(): Promise<Extractor> {
    if (!this.extractor) {
      this.extractor = (await pipeline("feature-extraction", EMBEDDING_MODEL)) as unknown as Extractor;
    }
    return this.extractor;
  }

  // 单条查询文本的向量（mean pooling + L2 归一化，利于余弦相似度计算）。
  async embedQuery(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    const output = await extractor._call(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }

  // 批量文档的向量。
  async embedDocuments(documents: string[]): Promise<number[][]> {
    const extractor = await this.getExtractor();
    const vectors: number[][] = [];
    for (const document of documents) {
      const output = await extractor._call(document, { pooling: "mean", normalize: true });
      vectors.push(Array.from(output.data));
    }
    return vectors;
  }
}
