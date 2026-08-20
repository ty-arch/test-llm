import { Injectable } from "@nestjs/common";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "./model.factory";

// 所有路由的 SystemMessage 角色统一为“需求结构化抽取助手”。
const SYSTEM_ROLE = "需求结构化抽取助手";
// 统一输入。
const DEFAULT_INPUT = "用户注册时必须绑定手机号，密码至少8位";

@Injectable()
export class LlmService {
  private readonly model = createChatModel();

  private buildMessages(input: string) {
    return [new SystemMessage(SYSTEM_ROLE), new HumanMessage(input)];
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
    const result = await this.model.invoke(this.buildMessages(input));
    return this.extractText(result.content);
  }

  async *stream(input = DEFAULT_INPUT): AsyncGenerator<string> {
    const stream = await this.model.stream(this.buildMessages(input));
    for await (const chunk of stream) {
      const text = this.extractText(chunk.content);
      if (text) yield text;
    }
  }

  async batch(inputs = [DEFAULT_INPUT]): Promise<string[]> {
    const results = await this.model.batch(inputs.map((input) => this.buildMessages(input)));
    return results.map((result) => this.extractText(result.content));
  }
}
