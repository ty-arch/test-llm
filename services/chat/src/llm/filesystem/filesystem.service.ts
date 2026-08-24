import { Injectable } from "@nestjs/common";
import { join } from "node:path";
import { BaseMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { createChatModel } from "../model.factory";
import { createBusinessTools } from "../tools/business.tools";

// workspace 根目录：services/chat/workspace。
// 源码运行（bun）与构建运行（dist）下，__dirname 相对层级一致（src/llm/filesystem 与 dist/llm/filesystem）。
const WORKSPACE_ROOT = join(__dirname, "../../../workspace");

const FILESYSTEM_SYSTEM_PROMPT = `
你是一名"需求分析助手"，可以借助工具读写 workspace 目录下的文件：
- 查询需求单详情：query_requirement（需要需求单号）
- 读取规范/标准等文件：read_file（需要相对路径）
- 写入分析报告/制品：write_file（需要相对路径与完整内容）
请按需调用工具，再基于工具返回的结果作答。
`.trim();

@Injectable()
export class FilesystemService {
  private readonly model = createChatModel();
  private readonly tools = createBusinessTools(WORKSPACE_ROOT);

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

  private buildMessages(input: string): BaseMessage[] {
    return [new SystemMessage(FILESYSTEM_SYSTEM_PROMPT), new HumanMessage(input)];
  }

  // 完整工具执行闭环：模型调用工具 → 执行并回填结果 → 直到模型给出最终答案（或达到上限）。
  async chat(input: string) {
    const messages = this.buildMessages(input);
    const modelWithTools = this.model.bindTools(this.tools);
    const trace: { name: string; args: Record<string, any>; output: string }[] = [];

    const MAX_ITERATIONS = 6;
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
        const matched = this.tools.find((t) => t.name === call.name);
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
