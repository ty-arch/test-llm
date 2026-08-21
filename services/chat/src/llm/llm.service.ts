import { Injectable } from "@nestjs/common";
import { createChatModel } from "./model.factory";
import { buildRequirementPrompt } from "./requirement.prompt-builder";
import { requirementChain } from "./requirement.chain";

// 统一输入。
export const DEFAULT_INPUT = "用户注册时必须绑定手机号，密码至少8位";

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
}
