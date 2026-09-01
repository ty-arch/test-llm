import { Body, Controller, Post } from "@nestjs/common";
import { OrchestratorService } from "./orchestrator.service";

@Controller("api/agents")
export class AgentsController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  // 固定编排的多 Agent 协作入口：抽取 → 澄清 → 并行(分析+风控) → 汇总。
  @Post("orchestrate")
  async orchestrate(@Body() body: { input: string }) {
    return this.orchestratorService.orchestrate(body.input);
  }
}
