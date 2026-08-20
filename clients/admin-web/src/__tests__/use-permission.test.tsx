import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuthStore } from "@/store/auth";
import { usePermission } from "@/hooks/use-permission";

describe("usePermission", () => {
  it("super_admin 恒放行", () => {
    useAuthStore.setState({ user: { id: "1", username: "a", nickname: null, isSuperAdmin: true }, permissions: [] });
    const { result } = renderHook(() => usePermission("user:create"));
    expect(result.current).toBe(true);
  });

  it("普通用户按权限码判断", () => {
    useAuthStore.setState({ user: { id: "1", username: "a", nickname: null, isSuperAdmin: false }, permissions: ["user:list"] });
    const { result } = renderHook(() => usePermission("user:create"));
    expect(result.current).toBe(false);
  });
});
