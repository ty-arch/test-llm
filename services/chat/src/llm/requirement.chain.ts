import { StringOutputParser } from "@langchain/core/output_parsers";
import { createChatModel } from "./model.factory";
import { buildRequirementPrompt } from "./requirement.prompt-builder";

// 用 LCEL 的 pipe() 组装最小调用链：模板 → 模型 → 字符串输出。
const requirementPrompt = buildRequirementPrompt();
const model = createChatModel();

export const requirementChain = requirementPrompt
  .pipe(model)
  .pipe(new StringOutputParser());
