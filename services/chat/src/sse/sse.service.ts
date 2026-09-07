import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TaskStatus, Prisma } from "@prisma/client";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

// 待持久化的任务事件输入。
export interface TaskEventInput {
  taskType: string;
  taskId: string;
  status: TaskStatus;
  message?: string;
  metadata?: Prisma.InputJsonValue;
}

// 持久化后推送的完整事件。
export interface TaskEventPush {
  id: string;
  taskType: string;
  taskId: string;
  status: TaskStatus;
  message: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  read: boolean;
}

// SSE 任务推送：维护 用户 -> 在线连接 的映射，emit 时先落库 task_events 再实时推送。
// 同一用户多 Tab 打开多个连接，共用同一个 Set。
@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly connections = new Map<string, Set<Response>>();

  constructor(private readonly prisma: PrismaService) {}

  // 注册一条在线连接。
  addConnection(userId: string, res: Response): void {
    let set = this.connections.get(userId);
    if (!set) {
      set = new Set();
      this.connections.set(userId, set);
    }
    set.add(res);
  }

  // 移除一条在线连接（连接关闭/出错时调用）。
  removeConnection(userId: string, res: Response): void {
    const set = this.connections.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.connections.delete(userId);
  }

  // 是否仍有在线连接（供心跳等判断）。
  hasConnections(userId: string): boolean {
    return (this.connections.get(userId)?.size ?? 0) > 0;
  }

  // 先持久化 task_events，再实时推送给该用户的所有在线连接。返回落库后的事件。
  async emit(userId: string, event: TaskEventInput): Promise<TaskEventPush> {
    const row = await this.prisma.taskEvent.create({
      data: {
        userId,
        taskType: event.taskType,
        taskId: event.taskId,
        status: event.status,
        message: event.message ?? null,
        metadata: event.metadata,
      },
    });

    const push: TaskEventPush = {
      id: row.id,
      taskType: row.taskType,
      taskId: row.taskId,
      status: row.status,
      message: row.message,
      metadata: row.metadata,
      createdAt: row.createdAt,
      read: row.readAt !== null,
    };

    const payload = `data: ${JSON.stringify(push)}\n\n`;
    const set = this.connections.get(userId);
    if (!set) return push;
    for (const res of set) {
      try {
        res.write(payload);
      } catch {
        // 连接可能已断开（broken pipe）：移除并关闭。
        this.removeConnection(userId, res);
        res.end();
      }
    }
    return push;
  }

  // 定期清理：空 userId entry 与 30 天前的 task_events。
  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupRoutine(): Promise<void> {
    for (const [userId, set] of this.connections) {
      if (set.size === 0) this.connections.delete(userId);
    }
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.taskEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`清理了 ${result.count} 条 30 天前的 task_events`);
    }
  }
}
