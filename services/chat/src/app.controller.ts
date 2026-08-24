import { Body, Controller, Get, Post } from "@nestjs/common";
import type { RequirementResult } from "@autix/contracts";
import { AppService } from "./app.service";
import { RequirementService } from "./llm/requirement.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly requirementService: RequirementService,
  ) {}

  @Get("health")
  health() {
    return this.appService.health();
  }

  @Get("hello")
  hello() {
    return this.appService.hello();
  }

  // 需求结构化抽取：POST /requirement/extract，接收 { input: string }。
  @Post("requirement/extract")
  extract(@Body() body: { input: string }): Promise<RequirementResult> {
    return this.requirementService.extract(body.input);
  }
}
