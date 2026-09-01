import { StringOutputParser } from "@langchain/core/output_parsers";
import { createChatModel } from "../model.factory";
import {
  extractPrompt,
  clarifyPrompt,
  analysisPrompt,
  riskPrompt,
  summaryPrompt,
} from "../prompts/requirement.prompts";

// 五个子 Agent 共享一个模型实例（ChatOpenAI 无状态，并发调用安全）。
const model = createChatModel();

// 每个 Agent = prompt.pipe(model).pipe(StringOutputParser)。
// extract / clarify 输出 JSON 字符串，由编排服务解析；analysis / risk / summary 输出 Markdown。
export const extractAgent = extractPrompt.pipe(model).pipe(new StringOutputParser());
export const clarifyAgent = clarifyPrompt.pipe(model).pipe(new StringOutputParser());
export const analysisAgent = analysisPrompt.pipe(model).pipe(new StringOutputParser());
export const riskAgent = riskPrompt.pipe(model).pipe(new StringOutputParser());
export const summaryAgent = summaryPrompt.pipe(model).pipe(new StringOutputParser());

// extractAgent 的 JSON 输出结构。
export interface ExtractResult {
  title: string;
  description: string;
  action: string;
  constraints: string[];
  entities: string[];
}

// clarifyAgent 的 JSON 输出结构。
export interface ClarifyResult {
  needsClarification: boolean;
  questions: string[];
}
