import { Injectable } from "@nestjs/common";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { MessageRole } from "@prisma/client";
import { ConversationService } from "../conversation/conversation.service";
import { SearchService, SearchHit } from "../document/search.service";
import { DbChatHistory } from "../message/db-chat-history";
import { MessageService, messageText } from "../message/message.service";
import { OrchestratorService, OrchestrateResult } from "./agents/orchestrator.service";

// 统一分析结果（固定字段集合，保证返回结构稳定）。
export interface AnalyzeResult {
  status: "completed" | "clarification_needed" | "failed";
  clarificationQuestions: string[];
  report: string | null;
  usedAgents: string[];
  retrievedDocuments: SearchHit[];
}

// 拼接进背景资料的历史消息条数上限（防止无限增长撑爆上下文）。
const MAX_HISTORY = 8;

// 统一分析入口：读取会话历史 → 语义检索用户文档 → 多 Agent 编排分析 →
// 把用户输入与分析结论落库 messages 表 → 返回 report/usedAgents/retrievedDocuments。
// 该服务在 ConversationModule 中提供（避免 AdvancedModule <-> DocumentModule 循环依赖）。
@Injectable()
export class AdvancedAnalysisService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly searchService: SearchService,
    private readonly messageService: MessageService,
    private readonly orchestrator: OrchestratorService,
  ) {}

  // 把 LangChain 历史消息格式化为「用户/助手」文本（只取最近 MAX_HISTORY 条）。
  private formatHistory(messages: BaseMessage[]): string {
    const recent = messages.slice(-MAX_HISTORY);
    return recent
      .map((message) => {
        const who = message instanceof HumanMessage ? "用户" : message instanceof AIMessage ? "助手" : "系统";
        return `${who}：${messageText(message)}`;
      })
      .join("\n");
  }

  // 编排失败时的兜底结论文案（failed 状态不产出 report）。
  private assistantConclusion(result: OrchestrateResult): string | null {
    if (result.status === "completed" && result.report) return result.report;
    if (result.status === "clarification_needed" && result.clarificationQuestions.length > 0) {
      return ["需要补充以下信息：", ...result.clarificationQuestions.map((q) => `- ${q}`)].join("\n");
    }
    if (result.status === "failed") {
      return "抱歉，本次需求分析未能完成。请补充更明确的需求描述后重试，或转人工处理。";
    }
    return null;
  }

  // 统一入口：会话归属校验 → 历史 + 检索上下文 + 当前输入 → 多 Agent 分析 → 落库。
  async analyze(userId: string, conversationId: string, input: string): Promise<AnalyzeResult> {
    // 0. 归属校验（非本人或不存在则抛 403/404）。
    await this.conversationService.findById(conversationId, userId);

    // 1. DbChatHistory 读取会话历史。
    const history = new DbChatHistory(conversationId, this.messageService);
    const past = await history.getMessages();
    const historyText = this.formatHistory(past);

    // 2. SearchService 语义检索当前用户文档（topK=3）。
    const hits = await this.searchService.similaritySearch(input, userId, 3);

    // 3. 拼接「历史 + 检索上下文」作为背景资料（当前输入单独作为抽取/分析对象）。
    const parts: string[] = [];
    if (historyText) parts.push(`【会话历史】\n${historyText}`);
    if (hits.length > 0) {
      const docsText = hits.map((hit) => `- ${hit.content}`).join("\n");
      parts.push(`【检索到的文档资料】\n${docsText}`);
    }
    const retrievedContext = parts.join("\n\n");

    // 4. OrchestratorService 执行多 Agent 分析（输入 + 背景资料）。
    const result = await this.orchestrator.orchestrate(input, retrievedContext);

    // 5. 用户输入与分析结论写入 messages 表。
    await this.messageService.addMessage(conversationId, MessageRole.USER, input);
    const assistantContent = this.assistantConclusion(result);
    if (assistantContent) {
      await this.messageService.addMessage(conversationId, MessageRole.ASSISTANT, assistantContent, {
        status: result.status,
        usedAgents: result.usedAgents,
      });
    }

    // 6. 返回 report、usedAgents、retrievedDocuments。
    return {
      status: result.status,
      clarificationQuestions: result.clarificationQuestions,
      report: result.report,
      usedAgents: result.usedAgents,
      retrievedDocuments: hits,
    };
  }
}
