"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  useEffect(() => { router.replace(user ? "/users" : "/login"); }, [user, router]);
  return null;
}
