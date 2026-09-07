// UI 聊天后端调用层（06-03）。
//
// AIChatContainer 只通过这里调用后端 /api/ui-chat/chat 与 /api/ui-chat/action。
// 后端地址由 NEXT_PUBLIC_API_BASE_URL 决定（next.config.ts 注入浏览器；未配置时退回
// 同源代理前缀 /api —— app/api/[...path]/route.ts 会把 /api/** 转发到同一后端）。
// 两种情况下 `${base}/api/ui-chat/...` 都能命中后端同一路由，因此可直接拼接。
import type { AIUIResponse, UiChatResult, UIAction } from "@/components/ai-ui/types";

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(/\/+$/, "");

export class UiApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UiApiError";
    this.status = status;
  }
}

// 解析后端响应：非 2xx 或带顶层 error 字段（控制器返回 { error } 时为 200）都算失败。
async function request<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new UiApiError("网络异常，请检查连接后重试", 0);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const asRecord = (data ?? {}) as { error?: string; message?: string | string[] };
  if (!res.ok || asRecord.error) {
    const message =
      asRecord.error ??
      (Array.isArray(asRecord.message) ? asRecord.message.join("；") : asRecord.message) ??
      `请求失败（HTTP ${res.status}）`;
    throw new UiApiError(message, res.status);
  }
  return data as T;
}

/** POST /api/ui-chat/chat —— 发送一条用户文本，返回结构化回复（message + UI）。 */
export function sendUiChat(input: string, sessionId?: string): Promise<UiChatResult> {
  return request<UiChatResult>("/api/ui-chat/chat", { sessionId, input });
}

/** POST /api/ui-chat/action —— 回传 UI 操作（选择 / 表单 / 确认），推进流程。 */
export function sendUiAction(sessionId: string, action: UIAction): Promise<UiChatResult> {
  return request<UiChatResult>("/api/ui-chat/action", { sessionId, action });
}

/** GET /api/ui-chat/state/:sessionId —— 读取当前会话流程状态（调试 / 恢复用）。 */
export async function fetchUiState(
  sessionId: string,
): Promise<{ sessionId: string; stage: string | null; collectedData: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/ui-chat/state/${encodeURIComponent(sessionId)}`);
  } catch {
    throw new UiApiError("网络异常，请检查连接后重试", 0);
  }
  if (!res.ok) throw new UiApiError(`请求失败（HTTP ${res.status}）`, res.status);
  return res.json() as Promise<{ sessionId: string; stage: string | null; collectedData: Record<string, unknown> }>;
}

// 供调试 / 文档使用的类型再导出。
export type { AIUIResponse };
