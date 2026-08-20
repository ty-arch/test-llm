import { Injectable } from "@nestjs/common";
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
}
