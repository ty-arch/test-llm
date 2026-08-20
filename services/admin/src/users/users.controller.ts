import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { RequirePermission } from "../authz/require-permission.decorator";
import { Audit } from "../audit/audit.decorator";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get() @RequirePermission("user:list") list() { return this.usersService.list(); }
  @Post() @RequirePermission("user:create") @Audit("user:create") create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }
  @Patch(":id") @RequirePermission("user:update") @Audit("user:update") update(@Param("id") id: string, @Body() dto: UpdateUserDto) { return this.usersService.update(id, dto); }
  @Patch(":id/status") @RequirePermission("user:disable") @Audit("user:disable") setStatus(@Param("id") id: string, @Body("status") status: UserStatus) { return this.usersService.setStatus(id, status); }
  @Delete(":id") @RequirePermission("user:delete") @Audit("user:delete") remove(@Param("id") id: string) { return this.usersService.remove(id); }
  @Post(":id/roles") @RequirePermission("role:assign") @Audit("role:assign") assignRoles(@Param("id") id: string, @Body("roleIds") roleIds: string[]) { return this.usersService.assignRoles(id, roleIds); }
}
