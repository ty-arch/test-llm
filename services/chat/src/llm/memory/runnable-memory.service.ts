import { Injectable } from "@nestjs/common";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, trimMessages } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createChatModel } from "../model.factory";

// 需求分析助手的多轮记忆 system 提示。
const MEMORY_SYSTEM_PROMPT = `
你是一名"需求分析助手"。
请记住与用户的多轮对话，并在回答时结合之前提到的上下文（如目标、需求单号等）。
`.trim();

// trimMessages 版本的历史保留上限（字符级估算）。
const TRIM_MAX_TOKENS = 2000;

// 简单的字符级 token 估算，供 trimMessages 使用（不引入额外分词器）。
const charTokenCounter = (messages: BaseMessage[]): number =>
  messages.reduce(
    (sum, message) =>
      sum + String(typeof message.content === "string" ? message.content : JSON.stringify(message.content)).length,
    0,
  );

// 抽取 BaseMessage 的纯文本内容（content 可能是 string 或分块数组）。
function messageText(message: BaseMessage): string {
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
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
  return "";
}

// 把消息类型转成可读的角色名。
function messageRole(message: BaseMessage): string {
  if (message instanceof HumanMessage) return "human";
  if (message instanceof AIMessage) return "ai";
  if (message instanceof SystemMessage) return "system";
  return "other";
}

@Injectable()
export class RunnableMemoryService {
  private readonly model = createChatModel();

  // 标准版会话存储：sessionId -> InMemoryChatMessageHistory。
  private readonly histories = new Map<string, InMemoryChatMessageHistory>();

  // 裁剪版会话存储：同样按 sessionId 隔离。
  private readonly trimmedHistories = new Map<string, InMemoryChatMessageHistory>();

  // 带历史占位符的模板：system + 历史 + 当前输入。
  private readonly prompt = ChatPromptTemplate.fromMessages([
    ["system", MEMORY_SYSTEM_PROMPT],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  // 基础链：模板 -> 模型 -> 字符串。
  private readonly chain = this.prompt.pipe(this.model).pipe(new StringOutputParser());

  // 标准版：RunnableWithMessageHistory 负责自动加载/保存历史。
  private readonly chainWithHistory = new RunnableWithMessageHistory({
    runnable: this.chain,
    getMessageHistory: (sessionId) => this.getOrCreate(sessionId),
    inputMessagesKey: "input",
    historyMessagesKey: "history",
  });

  private getOrCreate(sessionId: string): InMemoryChatMessageHistory {
    let history = this.histories.get(sessionId);
    if (!history) {
      history = new InMemoryChatMessageHistory();
      this.histories.set(sessionId, history);
    }
    return history;
  }

  private getOrCreateTrimmed(sessionId: string): InMemoryChatMessageHistory {
    let history = this.trimmedHistories.get(sessionId);
    if (!history) {
      history = new InMemoryChatMessageHistory();
      this.trimmedHistories.set(sessionId, history);
    }
    return history;
  }

  // 标准版多轮对话：自动带历史并回写本轮 human/ai。
  async chat(sessionId: string, input: string): Promise<string> {
    return this.chainWithHistory.invoke({ input }, { configurable: { sessionId } });
  }

  // 裁剪版多轮对话：先把历史裁剪到 maxTokens，再进模型，并手动回写本轮。
  async chatTrimmed(sessionId: string, input: string): Promise<string> {
    const history = this.getOrCreateTrimmed(sessionId);
    const historyMessages = await history.getMessages();
    const trimmed = await trimMessages(historyMessages, {
      maxTokens: TRIM_MAX_TOKENS,
      strategy: "last",
      tokenCounter: charTokenCounter,
    });

    const result = await this.model.invoke([
      new SystemMessage(MEMORY_SYSTEM_PROMPT),
      ...trimmed,
      new HumanMessage(input),
    ]);
    const text = messageText(result);

    await history.addMessage(new HumanMessage(input));
    await history.addMessage(new AIMessage(text));
    return text;
  }

  // 返回指定会话的历史记录（标准版）。
  async getHistory(sessionId: string): Promise<{ role: string; content: string }[]> {
    const history = this.histories.get(sessionId);
    if (!history) return [];
    return (await history.getMessages()).map((message) => ({
      role: messageRole(message),
      content: messageText(message),
    }));
  }

  // 手动追加一轮 human/ai 消息（标准版）。
  async appendMessage(sessionId: string, human: string, ai: string): Promise<void> {
    const history = this.getOrCreate(sessionId);
    await history.addMessage(new HumanMessage(human));
    await history.addMessage(new AIMessage(ai));
  }

  // 清空指定会话（标准版 + 裁剪版一起清）。
  async clearSession(sessionId: string): Promise<void> {
    this.histories.delete(sessionId);
    this.trimmedHistories.delete(sessionId);
  }
}
