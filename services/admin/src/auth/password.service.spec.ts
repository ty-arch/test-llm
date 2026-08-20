import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const svc = new PasswordService();

  it("hash 与 verify 往返一致", async () => {
    const hash = await svc.hash("secret123");
    expect(hash).not.toBe("secret123");
    await expect(svc.verify("secret123", hash)).resolves.toBe(true);
    await expect(svc.verify("wrong", hash)).resolves.toBe(false);
  });

  it("同一明文两次 hash 结果不同（加盐）", async () => {
    const a = await svc.hash("secret123");
    const b = await svc.hash("secret123");
    expect(a).not.toBe(b);
  });
});
