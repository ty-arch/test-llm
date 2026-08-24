import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 需求抽取场景的基础工具集。

// check_constraint_validity：校验约束是否含明确约束词（必须/至少/不得/不能等）。
export const checkConstraintValidity = tool(
  async ({ constraint }) => {
    const valid = /必须|至少|不得|不能|禁止|最多|不超过|不少于/.test(constraint);
    return JSON.stringify({
      valid,
      reason: valid
        ? "包含明确的约束词，判定为有效约束"
        : "未包含明确的约束词（必须/至少/不得/不能等），判定为无效约束",
    });
  },
  {
    name: "check_constraint_validity",
    description: "校验一条需求约束是否有效。约束有效需包含明确的约束词（必须/至少/不得/不能等）。",
    schema: z.object({
      constraint: z.string().describe("要校验的约束文本"),
    }),
  },
);

// lookup_entity_definition：模拟词典，查询实体的定义说明。
const ENTITY_DEFINITIONS: Record<string, string> = {
  手机号: "11 位数字组成的移动通信号码，用于注册、登录与接收验证码",
  密码: "用户登录凭证，通常要求至少 8 位并包含字母与数字",
  用户: "使用系统功能的主体，使用前需完成注册",
};

export const lookupEntityDefinition = tool(
  async ({ entity }) => {
    return ENTITY_DEFINITIONS[entity] ?? `词典中未收录「${entity}」的定义`;
  },
  {
    name: "lookup_entity_definition",
    description: "查询某个实体（名词）的定义说明。当需要解释需求文本中出现的实体时使用。",
    schema: z.object({
      entity: z.string().describe("要查询的实体名称"),
    }),
  },
);

// 两个基础工具组成的工具集，供 LlmService 的 tool-bind / tool-loop 使用。
export const BASIC_TOOLS = [checkConstraintValidity, lookupEntityDefinition];
