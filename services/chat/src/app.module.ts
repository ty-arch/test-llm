import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { LlmModule } from "./llm/llm.module";
import { AdvancedModule } from "./llm/advanced.module";
import { AuthModule } from "./auth/auth.module";
import { ConversationModule } from "./conversation/conversation.module";

@Module({
  imports: [AuthModule, LlmModule, AdvancedModule, PrismaModule, ConversationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
