import { Body, Controller, Post } from "@nestjs/common";
import { AdvancedAnalysisService } from "./advanced-analysis.service";

@Controller("api/advanced")
export class AdvancedController {
  constructor(private readonly advancedAnalysisService: AdvancedAnalysisService) {}

  // 统一入口：接收 { sessionId, input }，返回完整分析报告。
  @Post("analyze")
  async analyze(@Body() body: { sessionId: string; input: string }) {
    return this.advancedAnalysisService.analyze(body.sessionId, body.input);
  }
}
