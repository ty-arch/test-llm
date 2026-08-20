import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async codesForUser(userId: string): Promise<Set<string>> {
    const userRoles = await this.prisma.userRole.findMany({ where: { userId }, select: { roleId: true } });
    if (userRoles.length === 0) return new Set();
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: userRoles.map((r) => r.roleId) } },
      select: { permission: { select: { code: true } } },
    });
    return new Set(rolePermissions.map((rp) => rp.permission.code));
  }
}
