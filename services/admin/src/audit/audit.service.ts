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
}
