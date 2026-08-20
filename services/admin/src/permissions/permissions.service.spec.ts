import { BadRequestException } from "@nestjs/common";
import { PermissionAdminService } from "./permissions.service";

describe("PermissionAdminService.remove", () => {
  const prisma = { permission: { findUnique: jest.fn().mockResolvedValue({ id: "p1" }), count: jest.fn(), delete: jest.fn() } };
  const svc = new PermissionAdminService(prisma as any);

  it("有子权限时抛 400", async () => {
    prisma.permission.count.mockResolvedValue(1);
    await expect(svc.remove("p1")).rejects.toBeInstanceOf(BadRequestException);
  });
});
