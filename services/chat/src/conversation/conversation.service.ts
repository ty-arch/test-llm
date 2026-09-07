import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { Conversation } from "@prisma/client";
import { createChatModel } from "../llm/model.factory";
import { MessageService } from "../message/message.service";
import { DbChatHistory } from "../message/db-chat-history";
import { PrismaService } from "../prisma/prisma.service";

// 会话内多轮对话的 system 提示。
const CONVERSATION_SYSTEM_PROMPT = `
你是一名乐于助人的 AI 助手。
请结合当前会话的历史对话来理解上下文，并直接回答用户的最新问题。
`.trim();

// 会话领域的服务：会话 CRUD 与「在会话中发送消息」的多轮对话。
@Injectable()
export class ConversationService {
  private readonly model = createChatModel();

  // 带历史占位符的模板：system + 历史 + 当前输入。
  private readonly prompt = ChatPromptTemplate.fromMessages([
    ["system", CONVERSATION_SYSTEM_PROMPT],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  private readonly chain = this.prompt.pipe(this.model).pipe(new StringOutputParser());

  // 历史即会话消息：getMessageHistory(sessionId=conversationId) 返回 DB 落库的历史。
  private readonly chainWithHistory = new RunnableWithMessageHistory({
    runnable: this.chain,
    getMessageHistory: (sessionId) => new DbChatHistory(sessionId, this.messageService),
    inputMessagesKey: "input",
    historyMessagesKey: "history",
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService,
  ) {}

  // 创建会话（title 缺省给「新会话」）。
  async create(userId: string, title?: string): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: { userId, title: title?.trim() || "新会话" },
    });
  }

  // 某用户的所有会话（最近更新的在前）。
  async findByUser(userId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  // 按 id 查会话，并校验归属（非本人不可见）。
  async findById(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException("会话不存在");
    if (conversation.userId !== userId) throw new ForbiddenException("无权访问该会话");
    return conversation;
  }

  // 删除会话（消息随外键级联删除）。
  async delete(conversationId: string, userId: string): Promise<void> {
    await this.findById(conversationId, userId);
    await this.prisma.conversation.delete({ where: { id: conversationId } });
  }

  // 在指定会话中发送消息：带全量历史调模型，RunnableWithMessageHistory 会自动把
  // 本轮 human/ai 回写到 messages 表（经 DbChatHistory）。
  async chat(conversationId: string, userId: string, input: string): Promise<string> {
    await this.findById(conversationId, userId);
    return this.chainWithHistory.invoke({ input }, { configurable: { sessionId: conversationId } });
  }
}
