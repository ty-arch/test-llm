import { Reflector } from "@nestjs/core";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { PermissionsGuard } from "./permissions.guard";
import { PermissionsService } from "./permissions.service";

describe("PermissionsGuard", () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const permissions = { codesForUser: jest.fn() };
  const guard = new PermissionsGuard(reflector as any, permissions as any);

  const ctx = (user: any) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user }) }), getHandler: () => ({}), getClass: () => ({}) }) as any;

  it("无声明放行", async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(ctx(undefined))).resolves.toBe(true);
  });

  it("super_admin 短路放行", async () => {
    reflector.getAllAndOverride.mockReturnValue(["user:create"]);
    await expect(guard.canActivate(ctx({ id: "u1", isSuperAdmin: true }))).resolves.toBe(true);
    expect(permissions.codesForUser).not.toHaveBeenCalled();
  });

  it("缺权限抛 403", async () => {
    reflector.getAllAndOverride.mockReturnValue(["user:create"]);
    permissions.codesForUser.mockResolvedValue(new Set(["user:list"]));
    await expect(guard.canActivate(ctx({ id: "u1", isSuperAdmin: false }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
