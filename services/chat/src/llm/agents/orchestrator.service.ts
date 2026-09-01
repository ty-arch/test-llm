import { Injectable } from "@nestjs/common";
import {
  extractAgent,
  clarifyAgent,
  analysisAgent,
  riskAgent,
  summaryAgent,
  type ExtractResult,
  type ClarifyResult,
} from "./sub-agents";

// 编排中单个步骤的记录。
export interface OrchestrateStep {
  agent: string;
  status: "ok" | "error";
  output: string;
}

// 编排结果（固定字段集合，保证返回结构稳定）。
export interface OrchestrateResult {
  mode: "fixed";
  status: "completed" | "clarification_needed" | "failed";
  clarificationQuestions: string[];
  usedAgents: string[];
  fallback: "manual_review" | null;
  steps: OrchestrateStep[];
  report: string | null;
}

// 从模型输出的字符串中稳健地解析 JSON（容忍 markdown 代码块与前后多余文字）。
function parseJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

@Injectable()
export class OrchestratorService {
  // 固定编排：抽取 → 澄清判断 → 并行(分析 + 风控) → 汇总。
  async orchestrate(input: string): Promise<OrchestrateResult> {
    const steps: OrchestrateStep[] = [];
    const usedAgents: string[] = [];

    try {
      // 1. 抽取结构化字段。
      const extractRaw = await extractAgent.invoke({ input });
      usedAgents.push("extractAgent");
      steps.push({ agent: "extractAgent", status: "ok", output: extractRaw });
      const parsed = parseJson<Partial<ExtractResult>>(extractRaw);
      const extractResult: ExtractResult = {
        title: parsed?.title ?? "",
        description: parsed?.description ?? input,
        action: parsed?.action ?? "",
        constraints: Array.isArray(parsed?.constraints) ? parsed.constraints : [],
        entities: Array.isArray(parsed?.entities) ? parsed.entities : [],
      };

      // 2. 澄清判断。
      const clarifyRaw = await clarifyAgent.invoke({
        input,
        extractResult: JSON.stringify(extractResult),
      });
      usedAgents.push("clarifyAgent");
      steps.push({ agent: "clarifyAgent", status: "ok", output: clarifyRaw });
      const clarifyParsed = parseJson<Partial<ClarifyResult>>(clarifyRaw);
      const needsClarification = clarifyParsed?.needsClarification === true;
      const questions = Array.isArray(clarifyParsed?.questions) ? clarifyParsed.questions : [];

      // 3. 需要澄清则终止流程。
      if (needsClarification) {
        return {
          mode: "fixed",
          status: "clarification_needed",
          clarificationQuestions: questions,
          usedAgents,
          fallback: null,
          steps,
          report: null,
        };
      }

      // 4. 并行执行：多维度分析 + 风险识别。
      const [analysisRaw, riskRaw] = await Promise.all([
        analysisAgent.invoke({ input, extractResult: JSON.stringify(extractResult) }),
        riskAgent.invoke({ input, extractResult: JSON.stringify(extractResult) }),
      ]);
      usedAgents.push("analysisAgent", "riskAgent");
      steps.push({ agent: "analysisAgent", status: "ok", output: analysisRaw });
      steps.push({ agent: "riskAgent", status: "ok", output: riskRaw });

      // 5. 汇总生成最终报告。
      const reportRaw = await summaryAgent.invoke({
        input,
        extractResult: JSON.stringify(extractResult),
        analysisResult: analysisRaw,
        riskResult: riskRaw,
      });
      usedAgents.push("summaryAgent");
      steps.push({ agent: "summaryAgent", status: "ok", output: reportRaw });

      return {
        mode: "fixed",
        status: "completed",
        clarificationQuestions: [],
        usedAgents,
        fallback: null,
        steps,
        report: reportRaw,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      steps.push({ agent: "orchestrator", status: "error", output: message });
      return {
        mode: "fixed",
        status: "failed",
        clarificationQuestions: [],
        usedAgents,
        fallback: "manual_review",
        steps,
        report: null,
      };
    }
  }
}
