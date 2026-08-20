import { PermissionsService } from "./permissions.service";

describe("PermissionsService.menuTreeForUser", () => {
  const prisma = {
    userRole: { findMany: jest.fn().mockResolvedValue([{ roleId: "r1" }]) },
    rolePermission: {
      findMany: jest.fn().mockResolvedValue([
        { permission: { id: "m1", parentId: null, code: "menu:a", name: "A", type: "MENU", sort: 1 } },
        { permission: { id: "m2", parentId: "m1", code: "menu:a1", name: "A1", type: "MENU", sort: 1 } },
      ]),
    },
  };
  const svc = new PermissionsService(prisma as any);

  it("菜单组装成树", async () => {
    const tree = await svc.menuTreeForUser("u1", false);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
  });
});
