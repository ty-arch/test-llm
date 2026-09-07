import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { LlmModule } from "./llm/llm.module";
import { AdvancedModule } from "./llm/advanced.module";
import { AuthModule } from "./auth/auth.module";
import { ConversationModule } from "./conversation/conversation.module";
import { DocumentModule } from "./document/document.module";
import { SseModule } from "./sse/sse.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    LlmModule,
    AdvancedModule,
    PrismaModule,
    ConversationModule,
    DocumentModule,
    SseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
