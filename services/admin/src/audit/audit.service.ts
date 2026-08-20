import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditInput {
  action: string;
  userId?: string;
  username: string;
  targetType?: string;
  targetId?: string;
  detail?: object;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        username: input.username,
        targetType: input.targetType,
        targetId: input.targetId,
        detail: input.detail as any,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  }

  async list(query: { action?: string; username?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.username ? { username: { contains: query.username } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
