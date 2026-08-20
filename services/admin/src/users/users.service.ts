import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "../auth/password.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private passwordService: PasswordService) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { roles: { include: { role: true } } },
      omit: { passwordHash: true },
    });
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new BadRequestException("用户名已存在");
    const passwordHash = await this.passwordService.hash(dto.password);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        nickname: dto.nickname,
        isSuperAdmin: dto.isSuperAdmin ?? false,
        roles: dto.roleIds?.length ? { create: dto.roleIds.map((roleId) => ({ roleId })) } : undefined,
      },
      include: { roles: { include: { role: true } } },
      omit: { passwordHash: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);
    const data: Prisma.UserUpdateInput = { nickname: dto.nickname };
    if (dto.password) data.passwordHash = await this.passwordService.hash(dto.password);
    return this.prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
      omit: { passwordHash: true },
    });
  }

  async setStatus(id: string, status: UserStatus) {
    await this.ensureExists(id);
    return this.prisma.user.update({ where: { id }, data: { status }, omit: { passwordHash: true } });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.user.delete({ where: { id } });
  }

  async assignRoles(id: string, roleIds: string[]) {
    await this.ensureExists(id);
    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    if (roleIds.length) {
      await this.prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
    }
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
      omit: { passwordHash: true },
    });
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("用户不存在");
  }
}
