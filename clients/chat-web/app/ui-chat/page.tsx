import Link from "next/link";
import AIChatContainer from "@/components/ai-ui/AIChatContainer";

// /ui-chat —— AI UI 聊天（06-03）：文本输入 + UI 组件渲染的交互界面。
export default function UiChatPage() {
  return (
    <main className="flex h-dvh flex-col bg-slate-50">
      {/* 顶部导航：在各演示页之间切换 */}
      <nav className="flex items-center gap-4 border-b border-slate-200 bg-white/80 px-4 py-2 text-xs text-slate-400 backdrop-blur">
        <Link href="/" className="transition hover:text-indigo-600">
          需求抽取
        </Link>
        <Link href="/demo" className="transition hover:text-indigo-600">
          LangChain 演示
        </Link>
        <span className="font-medium text-slate-600">AI UI 聊天</span>
      </nav>
      <div className="min-h-0 flex-1">
        <AIChatContainer />
      </div>
    </main>
  );
}
