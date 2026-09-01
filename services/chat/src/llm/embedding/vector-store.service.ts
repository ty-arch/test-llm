import { Injectable, OnModuleInit } from "@nestjs/common";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { EmbeddingService } from "./embedding.service";

// 初始灌库文档：需求规范片段、验收标准片段、约束说明片段。
const SEED_TEXTS = [
  "一份完整的需求应包含背景与目标、用户与场景、功能范围、业务规则、验收标准和非功能性要求六大要素，缺少任一要素都应标注为不完整。",
  "验收标准必须是可衡量的完成定义，包含量化指标，例如接口响应时间不超过 200 毫秒、系统可用性达到 99.9%。",
  "系统应满足安全性约束：用户数据必须加密存储，密码不得明文保存，接口访问需经过身份认证与权限校验。",
];

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private store: MemoryVectorStore | null = null;

  constructor(private readonly embeddingService: EmbeddingService) {}

  // 启动时用三份初始文档灌库。
  async onModuleInit(): Promise<void> {
    const store = await this.getStore();
    await store.addDocuments(
      SEED_TEXTS.map((pageContent, index) => new Document({ pageContent, metadata: { source: "seed", index } })),
    );
  }

  private async getStore(): Promise<MemoryVectorStore> {
    if (!this.store) {
      this.store = new MemoryVectorStore(this.embeddingService);
    }
    return this.store;
  }

  // 追加文本入库，返回本次入库条数。
  async addTexts(texts: string[]): Promise<number> {
    const store = await this.getStore();
    const documents = texts.map(
      (text, index) => new Document({ pageContent: text, metadata: { source: "store", index } }),
    );
    await store.addDocuments(documents);
    return texts.length;
  }

  // 相似度检索：返回内容与相似度得分（得分越小越相似）。
  async search(query: string, k: number): Promise<{ content: string; score: number }[]> {
    const store = await this.getStore();
    const results = await store.similaritySearchWithScore(query, k);
    return results.map(([document, score]) => ({ content: document.pageContent, score }));
  }
}
