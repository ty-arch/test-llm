import { of } from "rxjs";
import { AuditInterceptor } from "./audit.interceptor";

describe("AuditInterceptor", () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const audit = { record: jest.fn() };
  const interceptor = new AuditInterceptor(reflector as any, audit as any);

  it("无 @Audit 元数据时直接放行不记录", (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const callHandler = { handle: () => of("x") };
    const ctx = { getHandler: () => ({}), getClass: () => ({}) };
    interceptor.intercept(ctx as any, callHandler as any).subscribe(() => {
      expect(audit.record).not.toHaveBeenCalled();
      done();
    });
  });

  it("有 @Audit 时在响应后记录", (done) => {
    reflector.getAllAndOverride.mockReturnValue("user:create");
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { id: "u1", username: "admin" }, params: { id: "u9" }, ip: "1.2.3.4", headers: {} }) }),
    };
    interceptor.intercept(ctx as any, { handle: () => of("ok") } as any).subscribe(() => {
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "user:create", userId: "u1", targetId: "u9" }));
      done();
    });
  });
});
