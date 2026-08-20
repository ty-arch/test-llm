"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export function Sidebar() {
  const menuTree = useAuthStore((s) => s.menuTree);
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r p-4">
      <nav className="space-y-1">
        {menuTree.map((menu) => (
          <Link
            key={menu.id}
            href={menu.path ?? "/"}
            className={`block rounded px-3 py-2 ${pathname.startsWith(menu.path ?? "/") ? "bg-primary text-white" : ""}`}
          >
            {menu.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
