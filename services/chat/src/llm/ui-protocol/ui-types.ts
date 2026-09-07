// UI 响应协议的类型定义（06-01）。
// UIResponse 联合类型：每个组件都有 type 字段作为区分标识，前端据此分派渲染。

// text：纯文本 / Markdown 回复。
export interface TextUI {
  type: "text";
  content: string;
}

// selection 选项。
export interface SelectionOption {
  value: string;
  label: string;
  description?: string;
}

// selection：单选 / 多选卡片（需求类型、审批人选择等）。
export interface SelectionUI {
  type: "selection";
  title: string;
  description?: string;
  mode: "single" | "multiple";
  required?: boolean;
  options: SelectionOption[];
}

// form 字段的可选值（select 专用）。
export interface FormFieldOption {
  value: string;
  label: string;
}

// form 支持的字段类型。
export type FormFieldKind = "input" | "select" | "textarea" | "date" | "number";

// form 字段定义。
export interface FormField {
  name: string;
  label: string;
  kind: FormFieldKind;
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
}

// form：动态表单（需求详情录入、发票信息等）。
export interface FormUI {
  type: "form";
  title: string;
  description?: string;
  // 提交按钮回传的 actionId（交由 ui-flow 的 handleAction 处理）。
  submitActionId?: string;
  fields: FormField[];
}

// 卡片 / 表单摘要里的一行键值。
export interface DetailRow {
  label: string;
  value: string;
}

// confirmation：确认对话框（含操作摘要和确认 / 取消按钮）。
export interface ConfirmationUI {
  type: "confirmation";
  title: string;
  summary?: string;
  details?: DetailRow[];
  confirmActionId: string;
  cancelActionId: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // danger=true 时确认按钮用危险样式（如删除）。
  danger?: boolean;
}

// card：信息展示卡片（需求详情、订单详情、商品信息等）。
export interface CardUI {
  type: "card";
  title: string;
  subtitle?: string;
  tag?: string;
  rows: DetailRow[];
  footer?: string;
}

// steps 项状态。
export type StepStatus = "pending" | "active" | "done" | "error";

// steps 项。
export interface StepItem {
  label: string;
  status: StepStatus;
}

// steps：步骤进度条（展示流程当前阶段）。
export interface StepsUI {
  type: "steps";
  title?: string;
  currentLabel?: string;
  items: StepItem[];
}

// table 列定义。
export interface TableColumn {
  key: string;
  label: string;
}

// table：数据表格（批量展示结构化数据，如需求列表、审批记录）。
export interface TableUI {
  type: "table";
  title?: string;
  columns: TableColumn[];
  rows: Record<string, string>[];
}

// action_buttons 按钮样式。
export type ActionButtonVariant = "primary" | "default" | "danger" | "text";

// action_buttons 按钮定义。
export interface ActionButton {
  actionId: string;
  label: string;
  variant?: ActionButtonVariant;
  disabled?: boolean;
}

// action_buttons：操作按钮组（一组可点击的动作按钮）。
export interface ActionButtonsUI {
  type: "action_buttons";
  title?: string;
  buttons: ActionButton[];
}

// UI 组件联合类型。
export type UIResponse =
  | TextUI
  | SelectionUI
  | FormUI
  | ConfirmationUI
  | CardUI
  | StepsUI
  | TableUI
  | ActionButtonsUI;

// AIUIResponse：AI 一轮回复 = 自然语言 message + 一组 UI 组件。
export interface AIUIResponse {
  message: string;
  ui: UIResponse[];
}

// UIAction：用户在 UI 上的操作回传数据（前端把交互结果回传后端推进状态机）。
export type UIActionFieldValue = string | number;

export interface UIAction {
  // 动作标识，如 choose_type / submit_form / confirm_analysis / cancel / start_over。
  actionId: string;
  // 单选值（selection 单选 / 按钮附带的值）。
  value?: string;
  // 多选值（selection 多选）。
  values?: string[];
  // 表单提交字段（name -> value）。
  fields?: Record<string, UIActionFieldValue>;
}
