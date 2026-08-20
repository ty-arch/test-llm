import { ChatPromptTemplate } from "@langchain/core/prompts";
import { REQUIREMENT_SYSTEM_PROMPT, REQUIREMENT_USER_TEMPLATE } from "./prompts/requirement.prompt";

// 组装 system + human 消息模板；渲染时用 formatMessages({ input }) 替换 {input}。
export function buildRequirementPrompt(): ChatPromptTemplate {
  return ChatPromptTemplate.fromMessages([
    ["system", REQUIREMENT_SYSTEM_PROMPT],
    ["human", REQUIREMENT_USER_TEMPLATE],
  ]);
}
