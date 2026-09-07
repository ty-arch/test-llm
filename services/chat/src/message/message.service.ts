import { Injectable } from "@nestjs/common";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Message, MessageRole, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

// 抽取 BaseMessage 的纯文本内容（content 可能是 string 或分块数组）。
export function messageText(message: BaseMessage): string {
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

// messages 表的读写服务：会话历史落库与读回的唯一入口。
@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  // 追加一条消息。metadata 可为空（仅当需要存额外信息时传入）。
  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<Message> {
    return this.prisma.message.create({
      data: { conversationId, role, content, metadata: metadata ?? undefined },
    });
  }

  // 读取某会话的历史（按时间正序；limit 为最近 N 条）。
  async getHistory(conversationId: string, limit?: number): Promise<Message[]> {
    if (limit === undefined) {
      return this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
    }
    const recent = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return recent.reverse();
  }

  // 转为 LangChain BaseMessage 数组（USER -> HumanMessage, ASSISTANT -> AIMessage）。
  async getHistoryAsLangChainMessages(conversationId: string): Promise<BaseMessage[]> {
    const rows = await this.getHistory(conversationId);
    return rows.map((row) =>
      row.role === MessageRole.USER ? new HumanMessage(row.content) : new AIMessage(row.content),
    );
  }

  // 删除某会话的全部消息（会话本身级联删除时也会清掉）。
  async clearByConversation(conversationId: string): Promise<void> {
    await this.prisma.message.deleteMany({ where: { conversationId } });
  }
}
