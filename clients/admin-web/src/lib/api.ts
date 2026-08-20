import { addToast } from "@heroui/react";
import { useAuthStore } from "@/store/auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://localhost:${process.env.ADMIN_API_PORT ?? 4002}`;

let refreshPromise: Promise<boolean> | null = null;

// 统一的接口报错提示：所有 apiFetch 失败都会在这里弹一个 danger toast。
function notifyError(message: string) {
  addToast({
    title: "请求失败",
    description: message,
    color: "danger",
    severity: "danger",
    timeout: 5000,
  });
}

// 从 NestJS 错误响应里抽出可读信息（ValidationPipe 的 message 是 string[]）。
async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (Array.isArray(data?.message)) return data.message.join("；");
    if (typeof data?.message === "string" && data.message) return data.message;
  } catch {
    // 响应体不是 JSON（如网关 5xx 的 HTML），走兜底文案
  }
  return fallback;
}

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

  let res: Response;
  try {
    res = await doFetch();
  } catch {
    notifyError("网络异常，请检查连接后重试");
    throw new Error("network");
  }

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      try {
        res = await doFetch();
      } catch {
        notifyError("网络异常，请检查连接后重试");
        throw new Error("network");
      }
    } else {
      useAuthStore.getState().clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.href = "/login";
      throw new Error("unauthorized");
    }
  }

  if (!res.ok) {
    const message = await readErrorMessage(res, `请求失败（HTTP ${res.status}）`);
    notifyError(message);
    throw new Error(message);
  }

  return res.json();
}
