import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

// 复用 admin 服务签发的 JWT（共享 JWT_SECRET），仅做验签与身份提取。
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const [type, token] = (req.headers.authorization ?? "").split(" ");
    if (type !== "Bearer" || !token) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync(token);
      // 与 admin JwtAuthGuard 保持一致的 req.user 形状。
      req.user = { id: payload.sub, username: payload.username, isSuperAdmin: payload.isSuperAdmin };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
