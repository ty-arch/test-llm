import { useAuthStore } from "@/store/auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4002";

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        useAuthStore.getState().setToken(data.accessToken);
        return true;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  // Read the token fresh on every call so a post-refresh retry uses the new token.
  const doFetch = (): Promise<Response> =>
    fetch(`${BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(useAuthStore.getState().token ? { Authorization: `Bearer ${useAuthStore.getState().token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

  let res = await doFetch();
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) res = await doFetch();
    else {
      useAuthStore.getState().clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.href = "/login";
      throw new Error("unauthorized");
    }
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
