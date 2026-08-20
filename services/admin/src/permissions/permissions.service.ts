import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";

@Injectable()
export class PermissionAdminService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.permission.findMany({ orderBy: { sort: "asc" } });
  }

  async create(dto: CreatePermissionDto) {
    const exists = await this.prisma.permission.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException("权限码已存在");
    return this.prisma.permission.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreatePermissionDto>) {
    await this.ensureExists(id);
    return this.prisma.permission.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const childCount = await this.prisma.permission.count({ where: { parentId: id } });
    if (childCount > 0) throw new BadRequestException("存在子权限，请先删除子权限");
    await this.prisma.permission.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const p = await this.prisma.permission.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("权限不存在");
  }
}
