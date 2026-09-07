import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MessageModule } from "../message/message.module";
import { ConversationController } from "./conversation.controller";
import { ConversationService } from "./conversation.service";

@Module({
  imports: [MessageModule, AuthModule],
  controllers: [ConversationController],
  providers: [ConversationService],
})
export class ConversationModule {}
