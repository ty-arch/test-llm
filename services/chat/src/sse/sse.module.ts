import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SseController } from "./sse.controller";
import { SseService } from "./sse.service";
import { TaskEventController } from "./task-event.controller";

// SSE 任务推送模块：对外暴露 SseService，供文档处理等异步任务 emit 进度事件。
@Module({
  imports: [AuthModule],
  controllers: [SseController, TaskEventController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
