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

  @Post("prompt-preview")
  async promptPreview(@Body() body?: ChatDto) {
    const messages = await this.llmService.previewPrompt(body?.input);
    return { messages };
  }

  @Post("prompt-to-model")
  async promptToModel(@Body() body?: ChatDto) {
    const content = await this.llmService.invokePrompt(body?.input);
    return { content };
  }

  @Post("chain-invoke")
  async chainInvoke(@Body() body?: ChatDto) {
    const content = await this.llmService.chainInvoke(body?.input);
    return { content };
  }

  @Post("chain-stream")
  async chainStream(@Body() body: ChatDto | undefined, @Res() res: Response) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      for await (const text of this.llmService.chainStream(body?.input)) {
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

  @Post("chain-batch")
  async chainBatch(@Body() body?: BatchChatDto) {
    const results = await this.llmService.chainBatch(body?.inputs);
    return { results };
  }
}
