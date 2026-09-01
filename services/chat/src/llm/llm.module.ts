import { Module } from "@nestjs/common";
import { LlmController } from "./llm.controller";
import { LlmService } from "./llm.service";
import { RequirementService } from "./requirement.service";
import { MemoryController } from "./memory/memory.controller";
import { RunnableMemoryService } from "./memory/runnable-memory.service";
import { FilesController } from "./filesystem/files.controller";
import { FilesystemService } from "./filesystem/filesystem.service";
import { EmbeddingController } from "./embedding/embedding.controller";
import { EmbeddingService } from "./embedding/embedding.service";
import { VectorStoreService } from "./embedding/vector-store.service";
import { AgentsController } from "./agents/agents.controller";
import { OrchestratorService } from "./agents/orchestrator.service";

@Module({
  controllers: [LlmController, MemoryController, FilesController, EmbeddingController, AgentsController],
  providers: [
    LlmService,
    RequirementService,
    RunnableMemoryService,
    FilesystemService,
    EmbeddingService,
    VectorStoreService,
    OrchestratorService,
  ],
  exports: [LlmService, RequirementService],
})
export class LlmModule {}
