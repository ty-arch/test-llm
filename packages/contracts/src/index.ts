import { z } from "zod";

export const APP_NAME = "llm";

// 需求结构化抽取的字段 schema（action + constraints + entities）。
export const RequirementSchema = z.object({
  action: z.string().describe("唯一核心动作（动词+对象）"),
  constraints: z.array(z.string()).describe("只保留明确约束（必须/至少/不得/不能）"),
  entities: z.array(z.string()).describe("文本中真实出现的名词"),
});

// 结构化抽取的结果 schema（当前与需求字段同构，作为 withStructuredOutput 入参）。
export const RequirementResultSchema = RequirementSchema;

// 结构化抽取结果的类型。
export type RequirementResult = z.infer<typeof RequirementResultSchema>;
