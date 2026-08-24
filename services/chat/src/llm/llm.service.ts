import { Injectable } from "@nestjs/common";
import { BaseMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { createChatModel } from "./model.factory";
import { buildRequirementPrompt } from "./requirement.prompt-builder";
import { requirementChain } from "./requirement.chain";
import { BASIC_TOOLS } from "./tools/basic.tools";

// 统一输入。
export const DEFAULT_INPUT = "用户注册时必须绑定手机号，密码至少8位";

// 工具调用场景的 system 提示：引导模型先提取约束/实体，再用工具校验/查询。
const TOOL_SYSTEM_PROMPT = `
你是一名"需求分析助手"。

对给定的需求文本，请：
1. 提取其中所有约束（如"必须绑定手机号""密码至少8位"）
2. 对每条约束调用 check_constraint_validity 校验有效性
3. 提取其中所有实体（如"用户""手机号""密码"）
4. 对每个实体调用 lookup_entity_definition 查询定义
5. 基于工具返回的结果，汇总输出最终分析

请先调用工具，再基于工具结果作答。
`.trim();

@Injectable()
export class LlmService {
  private readonly model = createChatModel();

  // 用 ChatPromptTemplate 渲染 system + human 消息。
  private buildMessages(input: string) {
    return buildRequirementPrompt().formatMessages({ input });
  }

  // AIMessage.content 可能是 string，也可能是分块数组，统一抽成纯文本。
  private extractText(content: unknown): string {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object" && "text" in block) {
          return String((block as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }

  async invoke(input = DEFAULT_INPUT): Promise<string> {
    const messages = await this.buildMessages(input);
    const result = await this.model.invoke(messages);
    return this.extractText(result.content);
  }

  async *stream(input = DEFAULT_INPUT): AsyncGenerator<string> {
    const messages = await this.buildMessages(input);
    const stream = await this.model.stream(messages);
    for await (const chunk of stream) {
      const text = this.extractText(chunk.content);
      if (text) yield text;
    }
  }

  async batch(inputs = [DEFAULT_INPUT]): Promise<string[]> {
    const messages = await Promise.all(inputs.map((input) => this.buildMessages(input)));
    const results = await this.model.batch(messages);
    return results.map((result) => this.extractText(result.content));
  }

  // 只渲染模板，不调模型：返回渲染后的 system + human 消息。
  async previewPrompt(input = DEFAULT_INPUT) {
    const messages = await this.buildMessages(input);
    return messages.map((message) => ({ role: message.type, content: message.content }));
  }

  // 模板 → formatMessages → 模型调用。
  async invokePrompt(input = DEFAULT_INPUT): Promise<string> {
    const messages = await this.buildMessages(input);
    const result = await this.model.invoke(messages);
    return this.extractText(result.content);
  }

  // 链调用：模板 → 模型 → 字符串输出（LCEL pipe 链）。
  async chainInvoke(input = DEFAULT_INPUT): Promise<string> {
    return requirementChain.invoke({ input });
  }

  async *chainStream(input = DEFAULT_INPUT): AsyncGenerator<string> {
    const stream = await requirementChain.stream({ input });
    for await (const chunk of stream) {
      if (chunk) yield chunk;
    }
  }

  async chainBatch(inputs = [DEFAULT_INPUT]): Promise<string[]> {
    return requirementChain.batch(inputs.map((input) => ({ input })));
  }

  // 工具调用场景的消息：固定的 system 提示 + 需求文本作为 human。
  private buildToolMessages(input: string): BaseMessage[] {
    return [new SystemMessage(TOOL_SYSTEM_PROMPT), new HumanMessage(input)];
  }

  // 绑定工具并单次调用：观察模型是否决定调用工具（tool_calls）。
  async toolBind(input = DEFAULT_INPUT) {
    const messages = this.buildToolMessages(input);
    const result = await this.model.bindTools(BASIC_TOOLS).invoke(messages);
    return {
      content: this.extractText(result.content),
      toolCalls: result.tool_calls ?? [],
    };
  }

  // 工具循环：模型调用工具 → 执行并回填结果 → 直到模型给出最终答案（或达到上限）。
  async toolLoop(input = DEFAULT_INPUT) {
    const messages = this.buildToolMessages(input);
    const modelWithTools = this.model.bindTools(BASIC_TOOLS);
    const trace: { name: string; args: Record<string, any>; output: string }[] = [];

    const MAX_ITERATIONS = 5;
    let content = "";
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const result = await modelWithTools.invoke(messages);
      messages.push(result);

      const toolCalls = result.tool_calls ?? [];
      if (toolCalls.length === 0) {
        content = this.extractText(result.content);
        break;
      }

      for (const call of toolCalls) {
        const matched = BASIC_TOOLS.find((t) => t.name === call.name);
        if (!matched) continue;
        // DynamicStructuredTool.invoke 是泛型方法，异质工具联合类型无法直接调用，这里收窄签名后再调用。
        const loose = matched as unknown as { invoke: (input: Record<string, any>) => Promise<unknown> };
        const output = await loose.invoke(call.args);
        const text = String(output);
        trace.push({ name: call.name, args: call.args, output: text });
        messages.push(
          new ToolMessage({ content: text, tool_call_id: call.id ?? `${call.name}_${i}`, name: call.name }),
        );
      }
    }

    return { content, toolCalls: trace };
  }
}
