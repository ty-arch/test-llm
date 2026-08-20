"use client";

import { usePermission } from "@/hooks/use-permission";

export function HasPermission({ code, children }: { code: string; children: React.ReactNode }) {
  const ok = usePermission(code);
  return ok ? <>{children}</> : null;
}
