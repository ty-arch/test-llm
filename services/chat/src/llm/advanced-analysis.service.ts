import { Injectable } from "@nestjs/common";
import { join } from "node:path";
import { OrchestratorService } from "./agents/orchestrator.service";
import { FilesystemService } from "./filesystem/filesystem.service";
import { RunnableMemoryService } from "./memory/runnable-memory.service";

// 统一分析结果（固定字段集合，保证返回结构稳定）。
export interface AnalyzeResult {
  status: "completed" | "clarification_needed" | "failed";
  clarificationQuestions: string[];
  report: string | null;
  reportPath: string | null;
  usedAgents: string[];
  fallback: "manual_review" | null;
}

// 会话 id 转安全文件名（只保留字母数字、-、_，其余替换为 -）。
function sanitize(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "-");
  return cleaned || "session";
}

@Injectable()
export class AdvancedAnalysisService {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly filesystem: FilesystemService,
    private readonly memory: RunnableMemoryService,
  ) {}

  // 从会话历史中抽取用户侧描述，与本次输入合并为分析上下文。
  private buildContext(history: { role: string; content: string }[], input: string): string {
    const userStated = history.filter((m) => m.role === "human").map((m) => m.content);
    return [...userStated, input].filter((text) => text.trim().length > 0).join("\n");
  }

  // 统一入口：读取历史 → 多 Agent 分析 → 澄清短路 → 写报告 → 回写记忆 → 返回报告。
  async analyze(sessionId: string, input: string): Promise<AnalyzeResult> {
    // 0. 读取会话历史，把前三轮用户描述与本次输入合并，作为分析上下文。
    const history = await this.memory.getHistory(sessionId);
    const context = this.buildContext(history, input);

    // 1. 调用 OrchestratorService 执行多 Agent 分析。
    const result = await this.orchestrator.orchestrate(context);

    // 2. 需要澄清则直接返回澄清问题。
    if (result.status === "clarification_needed") {
      return {
        status: "clarification_needed",
        clarificationQuestions: result.clarificationQuestions,
        report: null,
        reportPath: null,
        usedAgents: result.usedAgents,
        fallback: null,
      };
    }

    // 失败则返回兜底，不写报告、不回写记忆。
    if (result.status === "failed" || !result.report) {
      return {
        status: "failed",
        clarificationQuestions: [],
        report: null,
        reportPath: null,
        usedAgents: result.usedAgents,
        fallback: result.fallback,
      };
    }

    // 3. 将报告写入 reports/ 目录。
    const filename = `${sanitize(sessionId)}-${Date.now()}.md`;
    const reportPath = this.filesystem.writeFile(join("reports", filename), result.report);

    // 4. 用 appendMessage() 写回最终结论（不重新调用模型）。
    await this.memory.appendMessage(sessionId, input, result.report);

    // 5. 返回完整分析报告。
    return {
      status: "completed",
      clarificationQuestions: [],
      report: result.report,
      reportPath,
      usedAgents: result.usedAgents,
      fallback: null,
    };
  }
}
