import { ForbiddenException } from "@nestjs/common";
import { RolesService } from "./roles.service";

describe("RolesService.remove", () => {
  const prisma = { role: { findUnique: jest.fn(), delete: jest.fn() } };
  const svc = new RolesService(prisma as any);

  it("内置角色删除抛 403", async () => {
    prisma.role.findUnique.mockResolvedValue({ id: "r1", isSystem: true });
    await expect(svc.remove("r1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
