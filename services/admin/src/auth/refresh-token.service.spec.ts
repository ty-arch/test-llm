import { UnauthorizedException } from "@nestjs/common";
import { RefreshTokenService } from "./refresh-token.service";
import { sha256 } from "../common/sha256";

describe("RefreshTokenService.rotate", () => {
  let svc: RefreshTokenService;
  const prisma: any = { refreshToken: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() } };

  beforeEach(() => {
    svc = new RefreshTokenService(prisma);
    jest.clearAllMocks();
  });

  it("已撤销 token 触发复用检测，吊销该用户全部会话", async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({ id: "rt1", userId: "u1", tokenHash: sha256("raw"), expiresAt: new Date(Date.now() + 10000), revokedAt: new Date() });

    await expect(svc.rotate("raw")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("有效 token 轮换：旧 token 标 revokedAt 并指向新 token", async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({ id: "rt1", userId: "u1", tokenHash: sha256("raw"), expiresAt: new Date(Date.now() + 10000), revokedAt: null });
    prisma.refreshToken.create.mockResolvedValue({ id: "rt2" });

    const res = await svc.rotate("raw");
    expect(res.userId).toBe("u1");
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: "rt1" },
      data: { revokedAt: expect.any(Date), replacedById: "rt2" },
    });
  });
});
