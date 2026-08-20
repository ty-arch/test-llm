import { Body, Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { LlmService } from "./llm.service";
import { BatchChatDto, ChatDto } from "./dto/chat.dto";

@Controller("api/langchain")
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post("invoke")
  async invoke(@Body() body?: ChatDto) {
    const content = await this.llmService.invoke(body?.input);
    return { content };
  }

  @Post("stream")
  async stream(@Body() body: ChatDto | undefined, @Res() res: Response) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      for await (const text of this.llmService.stream(body?.input)) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post("batch")
  async batch(@Body() body?: BatchChatDto) {
    const results = await this.llmService.batch(body?.inputs);
    return { results };
  }
}
