import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./require-permission.decorator";
import { PermissionsService } from "./permissions.service";
import type { AuthUser } from "../auth/current-user.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissionsService: PermissionsService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required || required.length === 0) return true;

    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user) throw new UnauthorizedException();
    if (user.isSuperAdmin) return true;

    const codes = await this.permissionsService.codesForUser(user.id);
    if (required.some((code) => codes.has(code))) return true;
    throw new ForbiddenException("无权限");
  }
}
