import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const jwt = { verifyAsync: jest.fn() };
  const guard = new JwtAuthGuard(reflector as any, jwt as any);

  const ctx = (headers: any) => {
    const req = { headers };
    return ({ switchToHttp: () => ({ getRequest: () => req }), getHandler: () => ({}), getClass: () => ({}) }) as any;
  };

  it("@Public 接口直接放行", async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(ctx({}))).resolves.toBe(true);
  });

  it("无 Bearer 抛 401", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("有效 token 挂载 req.user", async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({ sub: "u1", username: "admin", isSuperAdmin: true });
    const c = ctx({ authorization: "Bearer good" });
    const req = c.switchToHttp().getRequest();
    await expect(guard.canActivate(c)).resolves.toBe(true);
    expect(req.user).toEqual({ id: "u1", username: "admin", isSuperAdmin: true });
  });
});
