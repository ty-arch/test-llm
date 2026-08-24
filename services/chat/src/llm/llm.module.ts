import { Module } from "@nestjs/common";
import { LlmController } from "./llm.controller";
import { LlmService } from "./llm.service";
import { RequirementService } from "./requirement.service";
import { MemoryController } from "./memory/memory.controller";
import { RunnableMemoryService } from "./memory/runnable-memory.service";

@Module({
  controllers: [LlmController, MemoryController],
  providers: [LlmService, RequirementService, RunnableMemoryService],
  exports: [LlmService, RequirementService],
})
export class LlmModule {}
