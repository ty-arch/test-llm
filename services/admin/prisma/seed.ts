import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash(process.env.SEED_ADMIN_PASSWORD ?? "admin123");

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      nickname: "超级管理员",
      isSuperAdmin: true,
    },
  });

  const operator = await prisma.role.upsert({
    where: { code: "operator" },
    update: {},
    create: { code: "operator", name: "运营", isSystem: true },
  });

  const menus = [
    { code: "menu:user-mgmt", name: "用户管理", type: "MENU" as const, path: "/users", sort: 1 },
    { code: "menu:role-mgmt", name: "角色管理", type: "MENU" as const, path: "/roles", sort: 2 },
    { code: "menu:perm-mgmt", name: "权限管理", type: "MENU" as const, path: "/permissions", sort: 3 },
    { code: "menu:audit", name: "审计日志", type: "MENU" as const, path: "/audit-logs", sort: 4 },
  ];
  const apis = [
    "user:list", "user:create", "user:update", "user:delete", "user:disable",
    "role:list", "role:create", "role:update", "role:delete", "role:assign",
    "permission:list", "permission:create", "permission:update", "permission:delete", "permission:assign",
    "audit:list",
  ];

  const menuIds: Record<string, string> = {};
  for (const m of menus) {
    const p = await prisma.permission.upsert({
      where: { code: m.code },
      update: {},
      create: m,
    });
    menuIds[m.code] = p.id;
  }
  for (const code of apis) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code, name: code, type: "API" } });
  }
  for (const menuCode of Object.keys(menuIds)) {
    const menuPerm = await prisma.permission.findUnique({ where: { code: menuCode } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: operator.id, permissionId: menuPerm!.id } },
      update: {},
      create: { roleId: operator.id, permissionId: menuPerm!.id },
    });
  }
}

main().finally(() => prisma.$disconnect());
