import { Controller, Get, NotFoundException, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import type { AuthUser } from "../auth/current-user.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

// 历史查询参数（均为可选字符串，代码内做解析与校验）。
interface HistoryQuery {
  page?: string;
  pageSize?: string;
  status?: string;
  taskType?: string;
}

// 任务事件查询/已读路由：GET /history、GET /:taskId、PATCH /:taskId/read。
@Controller("api/tasks")
@UseGuards(JwtAuthGuard)
export class TaskEventController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/tasks/history?page=1&pageSize=20&status=done&taskType=document.process
  @Get("history")
  async history(@CurrentUser() user: AuthUser, @Query() query?: HistoryQuery) {
    const page = Math.max(Math.trunc(Number(query?.page)) || 1, 1);
    const pageSize = Math.min(Math.max(Math.trunc(Number(query?.pageSize)) || 20, 1), 100);
    const status = query?.status as TaskStatus | undefined;
    const statusFilter = status && Object.values(TaskStatus).includes(status) ? { status } : {};
    const taskType = query?.taskType?.trim();

    const where = {
      userId: user.id,
      ...statusFilter,
      ...(taskType ? { taskType } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.taskEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.taskEvent.count({ where }),
    ]);

    return {
      items: items.map((row) => ({ ...row, read: row.readAt !== null })),
      total,
      page,
      pageSize,
    };
  }

  // GET /api/tasks/:taskId —— 单条事件（归属校验）。
  @Get(":taskId")
  async detail(@CurrentUser() user: AuthUser, @Param("taskId") taskId: string) {
    const row = await this.prisma.taskEvent.findFirst({ where: { id: taskId, userId: user.id } });
    if (!row) throw new NotFoundException("任务事件不存在");
    return { ...row, read: row.readAt !== null };
  }

  // PATCH /api/tasks/:taskId/read —— 标记为已读。
  @Patch(":taskId/read")
  async markRead(@CurrentUser() user: AuthUser, @Param("taskId") taskId: string) {
    const result = await this.prisma.taskEvent.updateMany({
      where: { id: taskId, userId: user.id },
      data: { readAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("任务事件不存在");
    return { ok: true };
  }
}
