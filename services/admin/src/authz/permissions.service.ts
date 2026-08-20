import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface MenuNode {
  id: string;
  code: string;
  name: string;
  path?: string;
  sort: number;
  children: MenuNode[];
}

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

  async menuTreeForUser(userId: string, isSuperAdmin: boolean): Promise<MenuNode[]> {
    let perms;
    if (isSuperAdmin) {
      perms = await this.prisma.permission.findMany({ orderBy: { sort: "asc" } });
    } else {
      const userRoles = await this.prisma.userRole.findMany({ where: { userId }, select: { roleId: true } });
      if (userRoles.length === 0) return [];
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { roleId: { in: userRoles.map((r) => r.roleId) } },
        select: { permission: true },
      });
      perms = rolePermissions.map((rp) => rp.permission);
    }
    const menus = perms.filter((p) => p.type === "MENU");
    const byParent = new Map<string | null, MenuNode[]>();
    for (const m of menus) {
      const key = m.parentId ?? null;
      (byParent.get(key) ?? byParent.set(key, []).get(key)!).push({
        id: m.id, code: m.code, name: m.name, path: m.path ?? undefined, sort: m.sort, children: [],
      });
    }
    const build = (parentId: string | null): MenuNode[] =>
      (byParent.get(parentId) ?? []).map((node) => ({ ...node, children: build(node.id) }));
    return build(null);
  }
}
