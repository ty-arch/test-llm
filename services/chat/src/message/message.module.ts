import { Module } from "@nestjs/common";
import { MessageService } from "./message.service";

// messages 表读写服务：会话模块与 DbChatHistory 共用。
@Module({
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
