import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { PermissionAdminService } from "./permissions.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { RequirePermission } from "../authz/require-permission.decorator";

@Controller("permissions")
export class PermissionsController {
  constructor(private permissionsService: PermissionAdminService) {}

  @Get() @RequirePermission("permission:list") list() { return this.permissionsService.list(); }
  @Post() @RequirePermission("permission:create") create(@Body() dto: CreatePermissionDto) { return this.permissionsService.create(dto); }
  @Patch(":id") @RequirePermission("permission:update") update(@Param("id") id: string, @Body() dto: Partial<CreatePermissionDto>) { return this.permissionsService.update(id, dto); }
  @Delete(":id") @RequirePermission("permission:delete") remove(@Param("id") id: string) { return this.permissionsService.remove(id); }
}
