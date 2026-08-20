"use client";

import { useState } from "react";
import { APP_NAME } from "@autix/contracts";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function callChat() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/hello");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessage(data.message);
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
