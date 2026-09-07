import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdvancedModule } from "../llm/advanced.module";
import { ChunkService } from "./chunk.service";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";

@Module({
  imports: [AuthModule, AdvancedModule],
  controllers: [DocumentController],
  providers: [DocumentService, ChunkService],
})
export class DocumentModule {}
