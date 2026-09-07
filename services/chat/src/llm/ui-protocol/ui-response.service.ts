import { Injectable, Logger } from "@nestjs/common";
import type { ChatOpenAI } from "@langchain/openai";
import { createChatModel } from "../model.factory";
import { aiUIResponseSchema } from "./ui-schemas";
import { AIUIResponse } from "./ui-types";
import { commitAnalysis, fallbackText, requirementCard, startSelection } from "./scenario";

// 识别到的确定性场景（保证关键验收输入稳定返回指定组件）。
type UiIntent = "new_requirement" | "view_requirement" | "commit_analysis";

// 输入 → 场景识别。自由输入返回 null，走模型结构化生成。
export function detectIntent(input: string): UiIntent | null {
  const text = input.trim();
  // 提交 / 启动需求分析：confirmation + steps。
  if (
    /(提交|开始|执行|启动|生成).*(需求分析)|需求分析(报告|一下)?|提交分析|生成分析/.test(text)
  ) {
    return "commit_analysis";
  }
  // 提新需求：selection（注意要求「提」与「需求」紧邻，避免命中「提交需求」）。
  if (
    /(提(一个新|个新|一个|一)?需求|新需求|发起需求|创建需求|登记需求|我要提)/.test(text) &&
    !/(查看|提交|审批|拒绝).*需求/.test(text)
  ) {
    return "new_requirement";
  }
  // 查看需求单（REQ-xxx）：card。
  if (/查看(?!.*分析)需求/.test(text) || /REQ-\d{8}-\d{3}/.test(text)) {
    return "view_requirement";
  }
  return null;
}

// 从输入中抽取需求单号。
export function extractRequirementId(input: string): string | null {
  const match = input.match(/(REQ-\d{8}-\d{3})/i);
  return match ? match[1].toUpperCase() : null;
}

// UI 组件选择指南（System Prompt 的一部分）：告诉模型何时用哪种组件。
const UI_PROTOCOL_GUIDE = `
你运行在「需求分析系统」中，负责把用户消息组织成 UI 可渲染的结构化回复。
请根据用户意图从以下组件中选择合适的组合（可在一条回复里输出多个组件）：

- text：普通说明、纯文本/Markdown 回复。默认兜底。
- selection：需要用户在有限选项中做单选/多选（如选择需求类型、审批人、是否接入 OA）。
- form：需要用户填写结构化信息（如新需求的标题、描述、优先级、期望上线日期）。
- confirmation：需要用户确认后才能继续（如确认启动需求分析、确认删除），应提供操作摘要与确认/取消。
- card：向用户展示一条聚合信息（需求单详情、分析结论、单据信息）。
- steps：展示流程当前处于哪个阶段（如 选择类型 → 填详情 → 确认 → 分析 → 出报告）。
- table：批量展示多条结构化记录（如需求列表、审批记录）。
- action_buttons：给出下一步可点击的动作按钮组（如「再提一个需求」「导出报告」）。

原则：能点选就不让用户打字；需要审批、确认、删除先出 confirmation；展示当前进度用 steps。`;

// UI 响应服务（Structured Output）：用 model.withStructuredOutput(aiUIResponseSchema)
// 约束模型输出为结构化 UI 组件；关键验收场景走确定性的 scenario 构建，保证稳定。
@Injectable()
export class UiResponseService {
  private readonly logger = new Logger(UiResponseService.name);

  // jsonMode：DeepSeek 不支持 function calling / json_schema，但支持 json_object。
  private readonly structured: ReturnType<ChatOpenAI["withStructuredOutput"]> = createChatModel()
    .withStructuredOutput(aiUIResponseSchema, { method: "jsonMode", name: "ui_chat_response" });

  // 生成 UI 响应。history/context 可选，模型路径下拼进提示增强上下文。
  async generateUIResponse(input: string, history?: string, context?: string): Promise<AIUIResponse> {
    const trimmed = input.trim();
    const intent = detectIntent(trimmed);

    // 确定性场景（保证验收稳定）：
    if (intent === "new_requirement") return startSelection();
    if (intent === "commit_analysis") return commitAnalysis();
    if (intent === "view_requirement") {
      return requirementCard(extractRequirementId(trimmed) ?? trimmed);
    }

    // 自由输入：模型结构化生成。
    return this.generateByModel(trimmed, history, context);
  }

  private async generateByModel(input: string, history?: string, context?: string): Promise<AIUIResponse> {
    const historyBlock = history?.trim() ? `\n\n【会话历史】\n${history.trim()}` : "";
    const contextBlock = context?.trim() ? `\n\n【附加背景】\n${context.trim()}` : "";

    const messages = [
      { role: "system" as const, content: `${UI_PROTOCOL_GUIDE}${historyBlock}${contextBlock}` },
      {
        role: "human" as const,
        content: `当前用户输入：\n${input}\n\n请按 UI 协议输出 JSON（包含 message 与 ui 数组），不要输出 JSON 以外的任何文字。`,
      },
    ];

    // DeepSeek 偶发空输出：失败重试一次后兜底。
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const value = await this.structured.invoke(messages);
        const parsed = aiUIResponseSchema.safeParse(value);
        if (parsed.success) return parsed.data;
      } catch (error) {
        this.logger.warn(`UI 结构化生成第 ${attempt} 次失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return fallbackText(
      "抱歉，这条消息我暂时无法结构化成 UI 组件。你可以试试：\n- 我要提一个新需求\n- 查看需求 REQ-20240315-001\n- 提交需求分析",
    );
  }
}
