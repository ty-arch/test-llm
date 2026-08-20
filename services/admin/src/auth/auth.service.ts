import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { sha256 } from "../common/sha256";
import { PermissionsService } from "../authz/permissions.service";
import { PasswordService } from "./password.service";
import { RefreshTokenService } from "./refresh-token.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private refreshTokenService: RefreshTokenService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private permissionsService: PermissionsService,
  ) {}

  private signAccess(user: { id: string; username: string; isSuperAdmin: boolean }): string {
    return this.jwtService.sign({
      sub: user.id,
      username: user.username,
      isSuperAdmin: user.isSuperAdmin,
    });
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user || user.status !== "ACTIVE") {
      await this.auditService.record({ action: "auth:login", username: dto.username, ip, userAgent, detail: { success: false } });
      throw new UnauthorizedException("用户名或密码错误");
    }
    const ok = await this.passwordService.verify(dto.password, user.passwordHash);
    if (!ok) {
      await this.auditService.record({ action: "auth:login", userId: user.id, username: user.username, ip, userAgent, detail: { success: false } });
      throw new UnauthorizedException("用户名或密码错误");
    }
    const refresh = await this.refreshTokenService.issue(user.id, { ip, userAgent });
    await this.auditService.record({ action: "auth:login", userId: user.id, username: user.username, ip, userAgent });
    return { accessToken: this.signAccess(user), refreshToken: refresh.raw };
  }

  async refresh(rawToken: string, ip?: string, userAgent?: string) {
    const { userId, raw } = await this.refreshTokenService.rotate(rawToken, { ip, userAgent });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") throw new UnauthorizedException();
    return { accessToken: this.signAccess(user), refreshToken: raw };
  }

  async logout(rawToken: string): Promise<void> {
    if (!rawToken) return;
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (stored) {
      await this.refreshTokenService.revoke(rawToken);
      await this.auditService.record({ action: "auth:logout", userId: stored.userId, username: (await this.prisma.user.findUnique({ where: { id: stored.userId } }))?.username ?? "" });
    }
  }

  async sessions(userId: string) {
    return this.refreshTokenService.list(userId);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const [permissions, menuTree] = await Promise.all([
      this.permissionsService.codesForUser(userId),
      this.permissionsService.menuTreeForUser(userId, user.isSuperAdmin),
    ]);
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.isSuperAdmin ? ["*"] : [...permissions],
      menuTree,
    };
  }

  async revokeSession(userId: string, id: string): Promise<void> {
    await this.refreshTokenService.revokeById(userId, id);
  }
}
