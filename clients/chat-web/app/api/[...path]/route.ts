// 流式代理：把 /api/* 转发到 chat 后端，并透传 ReadableStream 以保留流式响应。
//
// 之前用 next.config.ts 的 rewrites 代理，但 rewrites 会缓冲整个响应体，
// SSE（text/event-stream）的流式特性就丢了；这里改用 Route Handler 直接透传。
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://localhost:${process.env.CHAT_API_PORT ?? 4001}`;

async function proxy(req: Request, path: string[]): Promise<Response> {
  const url = `${API_BASE_URL}/${path.join("/")}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("content-type") ?? "application/json",
        Accept: req.headers.get("accept") ?? "*/*",
      },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
    });
  } catch {
    return new Response(JSON.stringify({ message: "后端服务不可用" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 直接透传上游 body（ReadableStream），不加 Content-Length、不缓冲。
  // no-transform 阻止中间层/压缩对响应做缓冲式改写。
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
