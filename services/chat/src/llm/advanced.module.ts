import { Module } from "@nestjs/common";
import { RunnableMemoryService } from "./memory/runnable-memory.service";
import { EmbeddingService } from "./embedding/embedding.service";
import { VectorStoreService } from "./embedding/vector-store.service";
import { FilesystemService } from "./filesystem/filesystem.service";
import { OrchestratorService } from "./agents/orchestrator.service";
import { AdvancedAnalysisService } from "./advanced-analysis.service";
import { MemoryController } from "./memory/memory.controller";
import { FilesController } from "./filesystem/files.controller";
import { EmbeddingController } from "./embedding/embedding.controller";
import { AgentsController } from "./agents/agents.controller";
import { AdvancedController } from "./advanced.controller";

// 第四章（08.md 记忆 / 09.md 文件系统 / 10.md 向量 / 11.md 多 Agent）的统一模块：
// 统一承载各能力对应的 Controller，并提供统一分析入口 AdvancedAnalysisService。
@Module({
  controllers: [
    MemoryController,
    FilesController,
    EmbeddingController,
    AgentsController,
    AdvancedController,
  ],
  providers: [
    RunnableMemoryService,
    EmbeddingService,
    VectorStoreService,
    FilesystemService,
    OrchestratorService,
    AdvancedAnalysisService,
  ],
  exports: [AdvancedAnalysisService],
})
export class AdvancedModule {}
