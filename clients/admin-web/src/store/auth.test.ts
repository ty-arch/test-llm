import { describe, it, expect } from "vitest";
import { useAuthStore } from "./auth";

describe("auth store", () => {
  it("clear 清空会话", () => {
    useAuthStore.setState({ user: { id: "1", username: "a", nickname: null, isSuperAdmin: false }, token: "t", permissions: ["a"], menuTree: [] });
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
