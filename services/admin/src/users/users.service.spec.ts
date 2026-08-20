import { BadRequestException } from "@nestjs/common";
import { UsersService } from "./users.service";

describe("UsersService.create", () => {
  const prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
  const password = { hash: jest.fn().mockResolvedValue("hashed") };
  const svc = new UsersService(prisma as any, password as any);

  it("用户名已存在抛 400", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1" });
    await expect(svc.create({ username: "admin", password: "123456" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("创建成功时密码经 argon2 哈希", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "u1" });
    await svc.create({ username: "new", password: "123456" });
    expect(password.hash).toHaveBeenCalledWith("123456");
  });
});
