import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true } }, permissions: { include: { permission: true } } },
    });
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException("角色 code 已存在");
    return this.prisma.role.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateRoleDto>) {
    await this.ensureExists(id);
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const role = await this.ensureExists(id);
    if (role.isSystem) throw new ForbiddenException("内置角色不可删除");
    await this.prisma.role.delete({ where: { id } });
  }

  async assignPermissions(id: string, permissionIds: string[]) {
    await this.ensureExists(id);
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissionIds.length) {
      await this.prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })) });
    }
    return this.prisma.role.findUnique({ where: { id }, include: { permissions: true } });
  }

  private async ensureExists(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException("角色不存在");
    return role;
  }
}
