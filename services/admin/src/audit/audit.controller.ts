import { Controller, Get, Query } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { RequirePermission } from "../authz/require-permission.decorator";

@Controller("audit-logs")
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermission("audit:list")
  list(@Query() query: { action?: string; username?: string; page?: string; pageSize?: string }) {
    return this.auditService.list({
      action: query.action,
      username: query.username,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }
}
