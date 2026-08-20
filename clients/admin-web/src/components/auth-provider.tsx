"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const restore = useAuthStore((s) => s.restore);
  const ready = useAuthStore((s) => s.ready);

  useEffect(() => { restore(); }, [restore]);

  if (!ready) return <div>加载中…</div>;
  return <>{children}</>;
}
