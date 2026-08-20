import { create } from "zustand";
import { apiFetch } from "@/lib/api";

export interface AuthUser { id: string; username: string; nickname: string | null; isSuperAdmin: boolean }
export interface MenuNode { id: string; code: string; name: string; path?: string; sort: number; children: MenuNode[] }

interface AuthState {
  user: AuthUser | null;
  permissions: string[];
  menuTree: MenuNode[];
  token: string | null;
  ready: boolean;
  setToken: (t: string) => void;
  login: (username: string, password: string) => Promise<void>;
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  menuTree: [],
  token: null,
  ready: false,

  setToken: (t) => set({ token: t }),

  login: async (username, password) => {
    const data = await apiFetch<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    set({ token: data.accessToken });
    await get().restore();
  },

  restore: async () => {
    try {
      const me = await apiFetch<AuthUser & { permissions: string[]; menuTree: MenuNode[] }>("/auth/me");
      set({ user: me, permissions: me.permissions, menuTree: me.menuTree, ready: true });
    } catch {
      set({ ready: true });
    }
  },

  logout: async () => {
    try { await apiFetch("/auth/logout", { method: "POST" }); } catch {}
    get().clear();
  },

  clear: () => set({ user: null, permissions: [], menuTree: [], token: null, ready: true }),
}));
