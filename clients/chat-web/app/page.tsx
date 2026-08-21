"use client";

import { useState } from "react";
import { APP_NAME } from "@autix/contracts";
import { apiFetch, apiStream } from "@/lib/api";

// 与后端 llm.service.ts 的统一输入保持一致
const DEFAULT_INPUT = "用户注册时必须绑定手机号，密码至少8位";

type RouteKey =
  | "invoke"
  | "stream"
  | "batch"
  | "preview"
  | "promptToModel"
  | "chainInvoke"
  | "chainStream"
  | "chainBatch"
  | "structured";

type Mode = "fetch" | "stream" | "batch";

interface RouteDef {
  key: RouteKey;
  label: string;
  path: string;
  group: string;
  mode: Mode;
}

// 后端已实现的 LangChain 路由（见 services/chat/src/llm/llm.controller.ts）。
// mode：fetch 一次性返回 JSON；stream 走 SSE 流式；batch 传 inputs 数组。
const ROUTES: RouteDef[] = [
  { key: "invoke", label: "invoke", path: "/api/langchain/invoke", group: "模型直调", mode: "fetch" },
  { key: "stream", label: "stream", path: "/api/langchain/stream", group: "模型直调", mode: "stream" },
  { key: "batch", label: "batch", path: "/api/langchain/batch", group: "模型直调", mode: "batch" },
  { key: "preview", label: "prompt-preview", path: "/api/langchain/prompt-preview", group: "提示词", mode: "fetch" },
  { key: "promptToModel", label: "prompt-to-model", path: "/api/langchain/prompt-to-model", group: "提示词", mode: "fetch" },
  { key: "chainInvoke", label: "chain-invoke", path: "/api/langchain/chain-invoke", group: "链 (LCEL)", mode: "fetch" },
  { key: "chainStream", label: "chain-stream", path: "/api/langchain/chain-stream", group: "链 (LCEL)", mode: "stream" },
  { key: "chainBatch", label: "chain-batch", path: "/api/langchain/chain-batch", group: "链 (LCEL)", mode: "batch" },
  { key: "structured", label: "structured", path: "/api/langchain/structured", group: "结构化", mode: "fetch" },
];

const GROUPS = ["模型直调", "提示词", "链 (LCEL)", "结构化"];

export default function Home() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<RouteKey | null>(null);

  async function run(route: RouteDef) {
    setBusy(route.key);
    setError("");
    setOutput("");

    // 空输入兜底到默认；batch 系列按换行拆成多个输入
    const trimmed = input.trim();
    const effective = trimmed || DEFAULT_INPUT;
    const lines = trimmed.split("\n").map((s) => s.trim()).filter(Boolean);
    const body = JSON.stringify(
      route.mode === "batch" ? { inputs: lines.length ? lines : [effective] } : { input: effective },
    );

    try {
      if (route.mode === "stream") {
        for await (const chunk of apiStream(route.path, { method: "POST", body })) {
          setOutput((prev) => prev + chunk);
        }
      } else {
        const data = await apiFetch<unknown>(route.path, { method: "POST", body });
        setOutput(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 880, margin: "0 auto", padding: "2rem" }}>
      <h1>App: {APP_NAME}</h1>
      <p>
        API base: <code>{process.env.NEXT_PUBLIC_API_BASE_URL}</code>
      </p>

      <label style={{ display: "block", marginTop: "1rem" }}>
        输入（batch 系列按换行拆成多个）：
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          style={{ width: "100%", marginTop: "0.25rem", padding: "0.5rem", boxSizing: "border-box" }}
        />
      </label>

      {GROUPS.map((group) => (
        <section key={group} style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem", color: "#555" }}>{group}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {ROUTES.filter((r) => r.group === group).map((route) => (
              <button
                key={route.key}
                onClick={() => run(route)}
                disabled={busy !== null}
                style={{ padding: "0.4rem 0.8rem" }}
              >
                {busy === route.key ? "…" : route.label}
              </button>
            ))}
          </div>
        </section>
      ))}

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
    </main>
  );
}
