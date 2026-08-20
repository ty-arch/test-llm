"use client";

import { useState } from "react";
import { APP_NAME } from "@autix/contracts";
import { apiFetch, apiStream } from "@/lib/api";

const DEFAULT_INPUT = "用户注册时必须绑定手机号，密码至少8个字符";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);

  async function callChat() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await apiFetch<{ content: string }>("/api/langchain/invoke", {
        method: "POST",
        body: JSON.stringify({ input: DEFAULT_INPUT }),
      });
      setMessage(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // 测试 /api/langchain/stream：逐个 chunk 累加输出到页面
  async function callStream() {
    setStreaming(true);
    setError("");
    setMessage("");
    try {
      for await (const chunk of apiStream("/api/langchain/stream", {
        method: "POST",
        body: JSON.stringify({ input: DEFAULT_INPUT }),
      })) {
        setMessage((prev) => prev + chunk);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>App: {APP_NAME}</h1>
      <p>
        API base: <code>{process.env.NEXT_PUBLIC_API_BASE_URL}</code>
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={callChat} disabled={loading || streaming}>
          {loading ? "Calling…" : "Invoke"}
        </button>
        <button onClick={callStream} disabled={loading || streaming}>
          {streaming ? "Streaming…" : "Stream"}
        </button>
      </div>
      {message && (
        <p style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>{message}</p>
      )}
      {error && <p style={{ marginTop: "1rem", color: "crimson" }}>Error: {error}</p>}
    </main>
  );
}
