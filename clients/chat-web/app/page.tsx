"use client";

import { useState } from "react";
import { APP_NAME } from "@autix/contracts";
import { apiFetch } from "@/lib/api";

// 与后端 requirement.service.ts 的统一输入保持一致。
const DEFAULT_INPUT = "用户注册时必须绑定手机号，密码至少8位";

// 与 @autix/contracts 的 RequirementResult 保持一致（action/constraints/entities）。
interface RequirementResult {
  action: string;
  constraints: string[];
  entities: string[];
}

export default function Home() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    setOutput("");
    try {
      const data = await apiFetch<RequirementResult>("/requirement/extract", {
        method: "POST",
        body: JSON.stringify({ input: input.trim() || DEFAULT_INPUT }),
      });
      setOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 880, margin: "0 auto", padding: "2rem" }}>
      <h1>App: {APP_NAME}</h1>
      <p>需求结构化抽取（POST /requirement/extract）</p>

      <label style={{ display: "block", marginTop: "1rem" }}>
        需求文本：
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          style={{ width: "100%", marginTop: "0.25rem", padding: "0.5rem", boxSizing: "border-box" }}
        />
      </label>

      <button
        onClick={submit}
        disabled={busy}
        style={{ marginTop: "0.75rem", padding: "0.5rem 1rem" }}
      >
        {busy ? "提取中…" : "提交"}
      </button>

      {output && (
        <pre
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            background: "#f6f6f6",
            borderRadius: 6,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {output}
        </pre>
      )}
      {error && <p style={{ marginTop: "1rem", color: "crimson" }}>Error: {error}</p>}

      <p style={{ marginTop: "2rem", color: "#888" }}>
        <a href="/demo">查看全部 LangChain 能力演示 →</a>
      </p>
    </main>
  );
}
