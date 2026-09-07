import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdvancedModule } from "../llm/advanced.module";
import { AdvancedAnalysisService } from "../llm/advanced-analysis.service";
import { MessageModule } from "../message/message.module";
import { DocumentModule } from "../document/document.module";
import { ConversationController } from "./conversation.controller";
import { ConversationService } from "./conversation.service";

// 会话模块：提供会话 CRUD 与「统一分析入口」（AdvancedAnalysisService）。
// 统一分析服务依赖多 Agent 编排（AdvancedModule）与语义检索（DocumentModule），
// 由本模块提供，避免 AdvancedModule <-> DocumentModule 的循环依赖。
@Module({
  imports: [MessageModule, AuthModule, AdvancedModule, DocumentModule],
  controllers: [ConversationController],
  providers: [ConversationService, AdvancedAnalysisService],
})
export class ConversationModule {}
