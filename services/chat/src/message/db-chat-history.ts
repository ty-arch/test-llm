import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { MessageRole } from "@prisma/client";
import { MessageService, messageText } from "./message.service";

// 用 PostgreSQL（messages 表）落库的 ChatMessageHistory，替代 InMemoryChatMessageHistory。
// 与 RunnableWithMessageHistory 兼容：getMessageHistory(sessionId) 返回本实例即可。
export class DbChatHistory extends BaseListChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "db"];

  constructor(
    private readonly conversationId: string,
    private readonly messageService: MessageService,
  ) {
    super();
  }

  async getMessages(): Promise<BaseMessage[]> {
    return this.messageService.getHistoryAsLangChainMessages(this.conversationId);
  }

  async addMessage(message: BaseMessage): Promise<void> {
    const role =
      message instanceof HumanMessage
        ? MessageRole.USER
        : message instanceof AIMessage
          ? MessageRole.ASSISTANT
          : null;
    if (!role) {
      throw new Error(`无法写入不支持的消息类型: ${message.constructor?.name ?? "unknown"}`);
    }
    await this.messageService.addMessage(this.conversationId, role, messageText(message));
  }

  async clear(): Promise<void> {
    await this.messageService.clearByConversation(this.conversationId);
  }
}
