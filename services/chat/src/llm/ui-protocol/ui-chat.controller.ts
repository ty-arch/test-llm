import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { uiActionSchema } from "./ui-schemas";
import { UIAction } from "./ui-types";
import { UiFlowService } from "./ui-flow.service";
import { UiResponseService } from "./ui-response.service";

interface UiChatBody {
  sessionId?: string;
  input: string;
  history?: string;
  context?: string;
}

interface UiActionBody {
  sessionId: string;
  action: UIAction;
}

// UI 聊天路由（06-01）：聊天入口生成 UI 响应，action 入口推进确定性状态机。
@Controller("api/ui-chat")
export class UiChatController {
  constructor(
    private readonly uiResponseService: UiResponseService,
    private readonly uiFlowService: UiFlowService,
  ) {}

  // POST /api/ui-chat/chat —— 根据输入生成含 UI 组件的结构化回复。
  @Post("chat")
  async chat(@Body() body?: UiChatBody) {
    const input = body?.input?.trim();
    if (!input) return { error: "input 不能为空" };
    const sessionId = body?.sessionId ?? "default";
    const data = await this.uiResponseService.generateUIResponse(
      input,
      body?.history,
      body?.context,
    );
    return { sessionId, data };
  }

  // POST /api/ui-chat/action —— 处理用户 UI 操作（选择/表单/确认）并返回下一步。
  @Post("action")
  async action(@Body() body?: UiActionBody) {
    const sessionId = body?.sessionId?.trim();
    const action = body?.action;
    if (!sessionId || !action) return { error: "sessionId 与 action 不能为空" };

    const parsed = uiActionSchema.safeParse(action);
    if (!parsed.success) {
      return { error: "action 格式不正确", issues: parsed.error.issues };
    }

    const data = await this.uiFlowService.handleAction(sessionId, parsed.data);
    return { sessionId, data };
  }

  // GET /api/ui-chat/state/:sessionId —— 查看某个会话的流程状态（调试用）。
  @Get("state/:sessionId")
  async state(@Param("sessionId") sessionId: string) {
    return this.uiFlowService.getState(sessionId) ?? { sessionId, state: null };
  }
}
