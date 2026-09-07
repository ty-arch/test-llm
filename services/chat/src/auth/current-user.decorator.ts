import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// 与 admin 服务共享的 JWT 载荷用户信息（token 由 admin 签发）。
export interface AuthUser {
  id: string;
  username: string;
  isSuperAdmin: boolean;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
