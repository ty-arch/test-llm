"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIResponse, UIAction } from "./types";
import ComponentRenderer from "./ComponentRenderer";
import { sendUiAction, sendUiChat } from "@/lib/ui-api";

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  ui?: UIResponse[];
  error?: boolean;
}

function createEntryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 空会话时的快捷输入示例（与后端 ui-flow 的验收输入一致）。
const SUGGESTIONS = [
  "我要提一个新需求：用户希望能够批量导入 Excel 数据",
  "查看需求 REQ-20240315-001",
  "帮我分析下订单审批流程",
];

// AIChatContainer：管理聊天历史（message + UI 组件），处理文本输入与 UIAction，
// 通过后端 /api/ui-chat/chat 与 /api/ui-chat/action 完成一轮轮交互。
export default function AIChatContainer() {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(createEntryId);
  const pendingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新消息 / busy 变化时把滚动区滚到底部。
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  function pushUser(text: string) {
    setMessages((prev) => [...prev, { id: createEntryId(), role: "user", content: text }]);
  }

  function pushAssistant(content: string, ui?: UIResponse[]) {
    setMessages((prev) => [...prev, { id: createEntryId(), role: "assistant", content, ui }]);
  }

  // 统一请求入口：避免并发点击；结束后回到可交互状态。
  async function run(request: () => Promise<{ sessionId: string; data: { message: string; ui: UIResponse[] } }>) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    try {
      const result = await request();
      pushAssistant(result.data.message, result.data.ui);
    } catch (error) {
      pushAssistant(error instanceof Error ? error.message : String(error), undefined);
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  async function handleSend(text: string) {
    const content = text.trim();
    if (!content || pendingRef.current) return;
    setInput("");
    pushUser(content);
    await run(() => sendUiChat(content, sessionId));
  }

  const handleAction = useCallback(
    (action: UIAction) => {
      void run(() => sendUiAction(sessionId, action));
    },
    [sessionId],
  );

  // 支持用户从「后续操作」重新开始时换一个新会话。
  function reset() {
    if (pendingRef.current) return;
    setMessages([]);
    setInput("");
    setSessionId(createEntryId());
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(input);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      {/* 顶栏 */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-sm font-semibold text-slate-800">需求分析助手</h1>
          <p className="text-xs text-slate-400">会话：{sessionId.slice(0, 8)}…</p>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          新会话
        </button>
      </header>

      {/* 消息区 */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">你好，我是需求分析助手。可以帮你提出并分析新需求。</p>
            <div className="mx-auto mt-4 flex max-w-md flex-col gap-2">
              {SUGGESTIONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => void handleSend(text)}
                  disabled={busy}
                  className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-xs text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-50"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2 text-sm leading-relaxed text-white shadow-sm">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-500">
                AI
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                {message.error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
                    {message.content}
                  </div>
                ) : (
                  <>
                    {message.content && (
                      <p className="whitespace-pre-wrap rounded-xl bg-white px-4 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm">
                        {message.content}
                      </p>
                    )}
                    {(message.ui ?? []).map((ui, index) => (
                      <ComponentRenderer key={index} ui={ui} onAction={handleAction} />
                    ))}
                  </>
                )}
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-500">
              AI
            </span>
            <div className="flex items-center gap-1 rounded-xl bg-white px-4 py-3 shadow-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.3s]" />
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <footer className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={1}
            placeholder="输入你的需求或问题，Enter 发送，Shift+Enter 换行"
            className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => void handleSend(input)}
            disabled={busy || input.trim().length === 0}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? "…" : "发送"}
          </button>
        </div>
      </footer>
    </div>
  );
}
