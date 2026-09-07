// AI UI 组件协议的前端类型定义（06-03）。
// 与 services/chat/src/llm/ui-protocol/ui-types.ts 保持同构 —— 前端只依赖这里的形状，
// 通过 /api/ui-chat/* 与后端交换该协议。

/** text：纯文本 / Markdown 回复。 */
export interface TextUI {
  type: "text";
  content: string;
}

/** selection 选项。 */
export interface SelectionOption {
  value: string;
  label: string;
  description?: string;
}

/** selection：单选 / 多选卡片。 */
export interface SelectionUI {
  type: "selection";
  title: string;
  description?: string;
  mode: "single" | "multiple";
  required?: boolean;
  options: SelectionOption[];
}

/** form 字段的可选值（select 专用）。 */
export interface FormFieldOption {
  value: string;
  label: string;
}

/** form 支持的字段类型。 */
export type FormFieldKind = "input" | "select" | "textarea" | "date" | "number";

/** form 字段定义。 */
export interface FormField {
  name: string;
  label: string;
  kind: FormFieldKind;
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
}

/** form：动态表单。 */
export interface FormUI {
  type: "form";
  title: string;
  description?: string;
  /** 提交时回传给后端的 actionId。 */
  submitActionId?: string;
  fields: FormField[];
}

/** 卡片 / 摘要里的一行键值。 */
export interface DetailRow {
  label: string;
  value: string;
}

/** confirmation：确认对话框。 */
export interface ConfirmationUI {
  type: "confirmation";
  title: string;
  summary?: string;
  details?: DetailRow[];
  confirmActionId: string;
  cancelActionId: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger=true 时确认按钮用危险样式。 */
  danger?: boolean;
}

/** card：信息展示卡片。 */
export interface CardUI {
  type: "card";
  title: string;
  subtitle?: string;
  tag?: string;
  rows: DetailRow[];
  footer?: string;
}

/** steps 项状态。 */
export type StepStatus = "pending" | "active" | "done" | "error";

/** steps 项。 */
export interface StepItem {
  label: string;
  status: StepStatus;
}

/** steps：步骤进度条。 */
export interface StepsUI {
  type: "steps";
  title?: string;
  currentLabel?: string;
  items: StepItem[];
}

/** table 列定义。 */
export interface TableColumn {
  key: string;
  label: string;
}

/** table：数据表格。 */
export interface TableUI {
  type: "table";
  title?: string;
  columns: TableColumn[];
  rows: Record<string, string>[];
}

/** action_buttons 按钮样式。 */
export type ActionButtonVariant = "primary" | "default" | "danger" | "text";

/** action_buttons 按钮定义。 */
export interface ActionButton {
  actionId: string;
  label: string;
  variant?: ActionButtonVariant;
  disabled?: boolean;
}

/** action_buttons：操作按钮组。 */
export interface ActionButtonsUI {
  type: "action_buttons";
  title?: string;
  buttons: ActionButton[];
}

/** UI 组件联合类型 —— 与后端 UIResponse 一一对应，是 ComponentRenderer 的输入。 */
export type UIResponse =
  | TextUI
  | SelectionUI
  | FormUI
  | ConfirmationUI
  | CardUI
  | StepsUI
  | TableUI
  | ActionButtonsUI;

/** AIUIResponse：AI 一轮回复 = 自然语言 message + 一组 UI 组件。 */
export interface AIUIResponse {
  message: string;
  ui: UIResponse[];
}

/** 后端 /api/ui-chat/chat 与 /action 的响应外层结构。 */
export interface UiChatResult {
  sessionId: string;
  data: AIUIResponse;
}

/** UIAction：用户在 UI 上的操作回传数据。 */
export type UIActionFieldValue = string | number;

export interface UIAction {
  /** 动作标识，如 select / submit_form / confirm / cancel / start_over。 */
  actionId: string;
  /** 单选值（selection 单选 / 按钮附带的值）。 */
  value?: string;
  /** 多选值（selection 多选）。 */
  values?: string[];
  /** 表单提交字段（name -> value）。 */
  fields?: Record<string, UIActionFieldValue>;
}
