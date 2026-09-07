import { z } from "zod";

// UI 响应协议的 Zod Schema（06-01）。
// 每个组件类型一个 Schema，再用 z.discriminatedUnion 基于 type 字段做精确匹配。
// aiUIResponseSchema 用于 model.withStructuredOutput 约束模型输出。

const textSchema = z.object({
  type: z.literal("text"),
  content: z.string().describe("Markdown 文本内容"),
});

const selectionOptionSchema = z.object({
  value: z.string().describe("选项值"),
  label: z.string().describe("展示文字"),
  description: z.string().optional().describe("选项补充说明"),
});

const selectionSchema = z.object({
  type: z.literal("selection"),
  title: z.string().describe("卡片标题"),
  description: z.string().optional().describe("说明文字"),
  mode: z.enum(["single", "multiple"]).describe("单选 / 多选"),
  required: z.boolean().optional().describe("是否必选"),
  options: z.array(selectionOptionSchema).min(1).describe("可选项"),
});

const formFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const formFieldSchema = z.object({
  name: z.string().describe("字段标识，提交时作为 key"),
  label: z.string().describe("字段标签"),
  kind: z.enum(["input", "select", "textarea", "date", "number"]).describe("字段控件类型"),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(formFieldOptionSchema).optional().describe("select 字段的可选项"),
});

const formSchema = z.object({
  type: z.literal("form"),
  title: z.string().describe("表单标题"),
  description: z.string().optional(),
  submitActionId: z.string().optional().describe("提交按钮回传的 actionId"),
  fields: z.array(formFieldSchema).min(1).describe("表单字段"),
});

const detailRowSchema = z.object({
  label: z.string().describe("键"),
  value: z.string().describe("值"),
});

const confirmationSchema = z.object({
  type: z.literal("confirmation"),
  title: z.string(),
  summary: z.string().optional().describe("操作摘要"),
  details: z.array(detailRowSchema).optional().describe("逐行摘要"),
  confirmActionId: z.string().describe("确认按钮 actionId"),
  cancelActionId: z.string().describe("取消按钮 actionId"),
  confirmLabel: z.string().optional(),
  cancelLabel: z.string().optional(),
  danger: z.boolean().optional().describe("确认按钮是否用危险样式"),
});

const cardSchema = z.object({
  type: z.literal("card"),
  title: z.string(),
  subtitle: z.string().optional(),
  tag: z.string().optional().describe("角标，如状态"),
  rows: z.array(detailRowSchema).describe("键值信息行"),
  footer: z.string().optional(),
});

const stepItemSchema = z.object({
  label: z.string(),
  status: z.enum(["pending", "active", "done", "error"]),
});

const stepsSchema = z.object({
  type: z.literal("steps"),
  title: z.string().optional(),
  currentLabel: z.string().optional().describe("当前阶段描述"),
  items: z.array(stepItemSchema).min(1).describe("步骤项（含状态）"),
});

const tableColumnSchema = z.object({
  key: z.string().describe("列 key"),
  label: z.string().describe("列标题"),
});

const tableSchema = z.object({
  type: z.literal("table"),
  title: z.string().optional(),
  columns: z.array(tableColumnSchema).min(1),
  rows: z.array(z.record(z.string(), z.string())).describe("表格行"),
});

const actionButtonSchema = z.object({
  actionId: z.string().describe("回传 actionId"),
  label: z.string(),
  variant: z.enum(["primary", "default", "danger", "text"]).optional(),
  disabled: z.boolean().optional(),
});

const actionButtonsSchema = z.object({
  type: z.literal("action_buttons"),
  title: z.string().optional(),
  buttons: z.array(actionButtonSchema).min(1),
});

// UIResponse 联合 Schema：按 type 字面量做精确匹配。
export const uiResponseSchema = z.discriminatedUnion("type", [
  textSchema,
  selectionSchema,
  formSchema,
  confirmationSchema,
  cardSchema,
  stepsSchema,
  tableSchema,
  actionButtonsSchema,
]);

// 一轮 AI 回复：自然语言 + 一个或多个 UI 组件。
export const aiUIResponseSchema = z.object({
  message: z.string().describe("对用户的中文自然语言回复"),
  ui: z.array(uiResponseSchema).min(1).describe("本次回复需要渲染的 UI 组件列表"),
});

// UIAction 回传数据的 Schema（供 action 路由校验）。
export const uiActionSchema = z.object({
  actionId: z.string().min(1),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
  fields: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});
