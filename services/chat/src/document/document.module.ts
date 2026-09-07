import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdvancedModule } from "../llm/advanced.module";
import { SseModule } from "../sse/sse.module";
import { ChunkService } from "./chunk.service";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { EmbeddingService } from "./embedding.service";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [AuthModule, AdvancedModule, SseModule],
  controllers: [DocumentController, SearchController],
  providers: [DocumentService, ChunkService, EmbeddingService, SearchService],
})
export class DocumentModule {}
