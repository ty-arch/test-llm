import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { RunnableMemoryService } from "./runnable-memory.service";

interface MemoryChatBody {
  sessionId: string;
  input: string;
}

@Controller("api/memory")
export class MemoryController {
  constructor(private readonly memoryService: RunnableMemoryService) {}

  // 多轮对话：同一 sessionId 下带历史上下文。
  @Post("chat")
  async chat(@Body() body: MemoryChatBody) {
    const reply = await this.memoryService.chat(body.sessionId, body.input);
    return { sessionId: body.sessionId, reply };
  }

  // 查看指定会话的历史记录。
  @Get("history/:sessionId")
  async history(@Param("sessionId") sessionId: string) {
    const history = await this.memoryService.getHistory(sessionId);
    return { sessionId, history };
  }

  // 清空指定会话的记忆。
  @Delete("history/:sessionId")
  async clear(@Param("sessionId") sessionId: string) {
    await this.memoryService.clearSession(sessionId);
    return { sessionId, cleared: true };
  }
}
