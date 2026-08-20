// 统一 API 层：所有对 chat 后端的请求都走这里，统一 base、headers 与错误处理。
//
// chat-web 通过 Route Handler（app/api/[...path]/route.ts）把 /api/* 代理到 chat 后端，
// 浏览器始终同源请求，无需处理 CORS。因此这里的 base 是代理前缀 `/api`，
// `path` 传后端真实路径（如 `/api/langchain/invoke`）。
const API_PREFIX = "/api";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("网络异常，请检查连接后重试", 0);
  }

  if (!res.ok) {
    const message = await readErrorMessage(res, `请求失败（HTTP ${res.status}）`);
    throw new ApiError(message, res.status);
  }

  // 204 无内容，避免 res.json() 抛错
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// 解析单个 SSE 事件的 data 字段（`data: {...}` 行）。
function parseSseData(event: string): string | null {
  for (const line of event.split("\n")) {
    if (line.startsWith("data:")) return line.slice(5).trim();
  }
  return null;
}

// 流式请求：消费 chat 后端返回的 SSE（text/event-stream），逐个 yield 文本 chunk。
// 服务端每块为 `data: {"content":"..."}\n\n`，结束为 `data: [DONE]\n\n`（见 llm.controller.ts 的 stream）。
export async function* apiStream(path: string, options: RequestInit = {}): AsyncGenerator<string> {
  let res: Response;
  try {
    res = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("网络异常，请检查连接后重试", 0);
  }

  if (!res.ok || !res.body) {
    const message = await readErrorMessage(res, `请求失败（HTTP ${res.status}）`);
    throw new ApiError(message, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 事件以空行分隔；最后一个可能不完整，留在 buffer 等下一块
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const data = parseSseData(event);
        if (!data || data === "[DONE]") continue;
        let payload: { content?: string; error?: string };
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }
        if (payload.error) throw new ApiError(payload.error, res.status);
        if (payload.content) yield payload.content;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
