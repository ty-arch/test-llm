import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { RequirePermission } from "../authz/require-permission.decorator";
import { Audit } from "../audit/audit.decorator";

@Controller("roles")
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get() @RequirePermission("role:list") list() { return this.rolesService.list(); }
  @Post() @RequirePermission("role:create") @Audit("role:create") create(@Body() dto: CreateRoleDto) { return this.rolesService.create(dto); }
  @Patch(":id") @RequirePermission("role:update") @Audit("role:update") update(@Param("id") id: string, @Body() dto: Partial<CreateRoleDto>) { return this.rolesService.update(id, dto); }
  @Delete(":id") @RequirePermission("role:delete") @Audit("role:delete") remove(@Param("id") id: string) { return this.rolesService.remove(id); }
  @Post(":id/permissions") @RequirePermission("permission:assign") @Audit("permission:assign") assignPermissions(@Param("id") id: string, @Body("permissionIds") permissionIds: string[]) { return this.rolesService.assignPermissions(id, permissionIds); }
}
