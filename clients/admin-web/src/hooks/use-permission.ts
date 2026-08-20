"use client";

import { useAuthStore } from "@/store/auth";

export function usePermission(code: string): boolean {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  if (!user) return false;
  if (user.isSuperAdmin || permissions.includes("*")) return true;
  return permissions.includes(code);
}
