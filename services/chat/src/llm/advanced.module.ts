import { Module } from "@nestjs/common";
import { RunnableMemoryService } from "./memory/runnable-memory.service";
import { EmbeddingService } from "./embedding/embedding.service";
import { VectorStoreService } from "./embedding/vector-store.service";
import { FilesystemService } from "./filesystem/filesystem.service";
import { OrchestratorService } from "./agents/orchestrator.service";
import { MemoryController } from "./memory/memory.controller";
import { FilesController } from "./filesystem/files.controller";
import { EmbeddingController } from "./embedding/embedding.controller";
import { AgentsController } from "./agents/agents.controller";

// 第四章（08.md 记忆 / 09.md 文件系统 / 10.md 向量 / 11.md 多 Agent）能力模块。
// 提供 EmbeddingService（供 DocumentModule 的文件向量化）与 OrchestratorService
// （供 ConversationModule 的统一分析服务做多 Agent 编排）。
// 统一分析服务 AdvancedAnalysisService 已在 05-07 迁至 ConversationModule 提供，
// 旧的 sessionId 版 /api/advanced/analyze 入口由会话版 POST /api/conversations/:id/chat 取代。
@Module({
  controllers: [MemoryController, FilesController, EmbeddingController, AgentsController],
  providers: [
    RunnableMemoryService,
    EmbeddingService,
    VectorStoreService,
    FilesystemService,
    OrchestratorService,
  ],
  exports: [OrchestratorService, EmbeddingService],
})
export class AdvancedModule {}
