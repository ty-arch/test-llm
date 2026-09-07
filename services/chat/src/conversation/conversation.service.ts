import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Conversation } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

// 会话领域的服务：会话 CRUD 与归属校验。
// 05-07 起「发送消息」改为统一分析入口 AdvancedAnalysisService（见 conversation.controller
// 的 POST /:id/chat），原 ConversationService.chat 通用对话链已被其取代、不再保留。
@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

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
}
