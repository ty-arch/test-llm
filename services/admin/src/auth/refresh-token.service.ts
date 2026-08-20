import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { sha256 } from "../common/sha256";

export interface IssueContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class RefreshTokenService {
  constructor(private prisma: PrismaService) {}

  async issue(userId: string, ctx: IssueContext = {}): Promise<{ raw: string; id: string }> {
    const raw = randomBytes(32).toString("hex");
    const days = Number(process.env.REFRESH_EXPIRES_DAYS ?? 7);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const token = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(raw),
        expiresAt,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
    return { raw, id: token.id };
  }

  async rotate(rawToken: string, ctx: IssueContext = {}): Promise<{ userId: string; raw: string }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
    });
    if (!stored) throw new UnauthorizedException("无效的 refresh token");
    if (stored.revokedAt) {
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException("refresh token 已失效");
    }
    if (stored.expiresAt.getTime() < Date.now()) throw new UnauthorizedException("refresh token 已过期");

    const next = await this.issue(stored.userId, ctx);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: next.id },
    });
    return { userId: stored.userId, raw: next.raw };
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revoke(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async list(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, ip: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeById(userId: string, id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
