import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { AUDIT_ACTION_KEY } from "./audit.decorator";
import { AuditService } from "./audit.service";
import { AuthUser } from "../auth/current-user.decorator";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private auditService: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!action) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;

    return next.handle().pipe(
      tap(() => {
        this.auditService.record({
          action,
          userId: user?.id,
          username: user?.username ?? "",
          targetId: req.params?.id,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        });
      }),
    );
  }
}
