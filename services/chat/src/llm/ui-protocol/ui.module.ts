import { Module } from "@nestjs/common";
import { UiChatController } from "./ui-chat.controller";
import { UiFlowService } from "./ui-flow.service";
import { UiResponseService } from "./ui-response.service";

// 第六章（06-01 UI 协议 + Structured Output）模块：api/ui-chat 路由。
@Module({
  controllers: [UiChatController],
  providers: [UiResponseService, UiFlowService],
})
export class UiModule {}
