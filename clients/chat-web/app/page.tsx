"use client";

import { useState } from "react";
import { APP_NAME } from "@autix/contracts";
import { apiFetch } from "@/lib/api";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function callChat() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await apiFetch<{ content: string }>("/api/langchain/invoke", {
        method: "POST",
        body: JSON.stringify({ input: "用户注册时必须绑定手机号，密码至少8个字符" }),
      });
      setMessage(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>App: {APP_NAME}</h1>
      <p>
        API base: <code>{process.env.NEXT_PUBLIC_API_BASE_URL}</code>
      </p>
      <button onClick={callChat} disabled={loading}>
        {loading ? "Calling…" : "Call Chat Service"}
      </button>
      {message && <p style={{ marginTop: "1rem" }}>{message}</p>}
      {error && <p style={{ marginTop: "1rem", color: "crimson" }}>Error: {error}</p>}
    </main>
  );
}
