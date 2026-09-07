import { Controller, Get, Logger, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AuthUser } from "../auth/current-user.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SseService } from "./sse.service";

// SSE 心跳间隔（15s）。
const HEARTBEAT_MS = 15_000;

// SSE 端点：GET /api/sse/tasks（需 JWT）。注册连接，后台任务通过 SseService 推送事件。
@Controller("api/sse")
@UseGuards(JwtAuthGuard)
export class SseController {
  private readonly logger = new Logger(SseController.name);

  constructor(private readonly sseService: SseService) {}

  @Get("tasks")
  tasks(@CurrentUser() user: AuthUser, @Req() req: Request, @Res() res: Response): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    this.sseService.addConnection(user.id, res);

    const heartbeat = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        cleanup();
      }
    }, HEARTBEAT_MS);

    const cleanup = (): void => {
      clearInterval(heartbeat);
      this.sseService.removeConnection(user.id, res);
      res.end();
    };

    req.on("close", cleanup);
    req.on("error", cleanup);

    this.logger.log(`SSE connected: user=${user.id}`);
  }
}
