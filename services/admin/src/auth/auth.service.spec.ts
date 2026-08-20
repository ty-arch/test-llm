import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { RefreshTokenService } from "./refresh-token.service";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionsService } from "../authz/permissions.service";

const mockUser = { id: "u1", username: "admin", passwordHash: "hash", isSuperAdmin: true, status: "ACTIVE", nickname: null };

describe("AuthService", () => {
  let svc: AuthService;
  const prisma = { user: { findUnique: jest.fn() } };
  const password = { verify: jest.fn() };
  const refresh = { issue: jest.fn() };
  const jwt = { sign: jest.fn().mockReturnValue("access-token") };
  const audit = { record: jest.fn() };
  const permissions = {
    codesForUser: jest.fn().mockResolvedValue(new Set()),
    menuTreeForUser: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: password },
        { provide: RefreshTokenService, useValue: refresh },
        { provide: JwtService, useValue: jwt },
        { provide: AuditService, useValue: audit },
        { provide: PermissionsService, useValue: permissions },
      ],
    }).compile();
    svc = mod.get(AuthService);
    jest.clearAllMocks();
  });

  it("密码正确时返回 accessToken 与 refreshToken", async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    password.verify.mockResolvedValue(true);
    refresh.issue.mockResolvedValue({ raw: "raw-refresh", id: "rt1" });

    const res = await svc.login({ username: "admin", password: "x" });
    expect(res.accessToken).toBe("access-token");
    expect(res.refreshToken).toBe("raw-refresh");
  });

  it("密码错误时抛 401 并记录失败审计", async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    password.verify.mockResolvedValue(false);
    await expect(svc.login({ username: "admin", password: "bad" })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "auth:login", detail: { success: false } }));
  });

  it("logout 吊销对应 refresh 并写审计", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: "rt1", userId: "u1" });
    (prisma as any).refreshToken = { findUnique };
    const revoke = jest.fn().mockResolvedValue(undefined);
    (svc as any).refreshTokenService = { ...refresh, revoke };

    await svc.logout("raw");
    expect(revoke).toHaveBeenCalledWith("raw");
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "auth:logout" }));
  });
});
