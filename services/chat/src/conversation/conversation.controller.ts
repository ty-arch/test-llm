import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdvancedAnalysisService } from "../llm/advanced-analysis.service";
import { MessageService } from "../message/message.service";
import { ConversationService } from "./conversation.service";

class CreateConversationBody {
  title?: string;
}

class ChatBody {
  input: string;
}

// 会话路由：全部需要 JWT（复用 admin 签发的 token）。
@Controller("api/conversations")
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly advancedAnalysis: AdvancedAnalysisService,
  ) {}

  // POST /api/conversations —— 创建会话
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body?: CreateConversationBody) {
    return this.conversationService.create(user.id, body?.title);
  }

  // GET /api/conversations —— 当前用户会话列表
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.conversationService.findByUser(user.id);
  }

  // GET /api/conversations/:id/messages —— 会话消息历史
  @Get(":id/messages")
  async messages(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.conversationService.findById(id, user.id);
    return this.messageService.getHistory(id);
  }

  // POST /api/conversations/:id/chat —— 统一分析入口（非流式 JSON）。
  // 走 AdvancedAnalysisService：读历史 → 检索文档 → 多 Agent 分析 → 落库消息，
  // 返回 report / usedAgents / retrievedDocuments。第六章再升级为流式 UI。
  @Post(":id/chat")
  async chat(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body?: ChatBody) {
    const input = body?.input?.trim();
    if (!input) return { error: "input 不能为空" };
    return this.advancedAnalysis.analyze(user.id, id, input);
  }

  // DELETE /api/conversations/:id —— 删除会话
  @Delete(":id")
  async delete(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.conversationService.delete(id, user.id);
    return { ok: true };
  }
}
