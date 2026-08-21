import { Injectable } from "@nestjs/common";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RequirementResult, RequirementResultSchema } from "@autix/contracts";
import { REQUIREMENT_SYSTEM_PROMPT, REQUIREMENT_USER_TEMPLATE } from "./prompts/requirement.prompt";
import { createChatModel } from "./model.factory";

@Injectable()
export class RequirementService {
  private readonly prompt = ChatPromptTemplate.fromMessages([
    ["system", REQUIREMENT_SYSTEM_PROMPT],
    ["human", REQUIREMENT_USER_TEMPLATE],
  ]);

  // DeepSeek 思考模式不支持 json_schema 响应格式与 function calling（tool_choice），
  // 但支持 json_object（jsonMode）；json_object 要求 prompt 里出现 "json" 字样，已在模板中补齐。
  private readonly structured = createChatModel().withStructuredOutput(RequirementResultSchema, {
    method: "jsonMode",
  });

  // 结构化抽取：模板 → formatMessages → 结构化输出。
  async extract(input: string): Promise<RequirementResult> {
    const messages = await this.prompt.formatMessages({ input });
    return this.structured.invoke(messages);
  }
}
