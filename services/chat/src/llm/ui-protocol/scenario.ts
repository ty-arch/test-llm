// 需求分析系统 UI 场景的确定性构建（06-01）。
// 纯 TS 构建组件，保证关键验收输入（提新需求 / 查看需求单 / 提交需求分析）稳定返回
// 指定组件；自由输入再由 ui-response.service 走 model.withStructuredOutput 生成。

import {
  ActionButtonsUI,
  AIUIResponse,
  CardUI,
  ConfirmationUI,
  FormField,
  FormUI,
  SelectionUI,
  StepItem,
  StepsUI,
  TextUI,
} from "./ui-types";

// 需求分析流程的固定步骤（steps 组件用）。
export const FLOW_STEPS = [
  "选择需求类型",
  "填写需求详情",
  "确认提交",
  "执行需求分析",
  "输出分析报告",
];

// 需求类型选项（selection 用）。
export const REQUIREMENT_TYPE_OPTIONS = [
  { value: "feature", label: "新功能", description: "新增业务能力或模块" },
  { value: "bug", label: "缺陷修复", description: "线上缺陷的修复" },
  { value: "optimize", label: "优化改进", description: "体验或性能优化" },
  { value: "risk", label: "风险/合规", description: "风险控制与合规要求" },
];

// 演示用的需求单（card 用）。REQ-20240315-001 是对应课程的示例单号。
export const DEMO_REQUIREMENT = {
  id: "REQ-20240315-001",
  title: "员工自助报销小程序",
  type: "新功能",
  status: "评审中",
  priority: "P1 高",
  submitter: "张伟（财务部）",
  createdAt: "2024-03-15 10:24",
  version: "v1.2",
  description:
    "为财务部建设员工自助报销小程序：支持差旅与日常报销的在线提单、发票上传、" +
    "多级审批流（部门主管初审 → 财务复核 → 超一万元总经理终审）、进度跟踪与" +
    "审批日志审计，并与 OA 系统集成单点登录与待办推送。",
};

// 按「当前阶段索引」生成步骤条（index 之前的 done，当前 active，之后 pending）。
// activeIndex >= 步骤总数时视为全部完成。
export function stepsFor(activeIndex: number, error?: boolean): StepsUI {
  const items: StepItem[] = FLOW_STEPS.map((label, i) => {
    if (activeIndex >= FLOW_STEPS.length || i < activeIndex) return { label, status: "done" };
    if (i === activeIndex) return { label, status: error ? "error" : "active" };
    return { label, status: "pending" };
  });
  const done = activeIndex >= FLOW_STEPS.length;
  return {
    type: "steps",
    title: "需求分析流程",
    currentLabel: done ? "需求分析流程已完成" : error ? `${FLOW_STEPS[activeIndex]}失败，请重试` : FLOW_STEPS[activeIndex],
    items,
  };
}

// 步骤 1：选择需求类型（selection）。
export function startSelection(message?: string): AIUIResponse {
  const selection: SelectionUI = {
    type: "selection",
    title: "请选择需求类型",
    description: "告诉我你这次想提出的需求属于哪一类：",
    mode: "single",
    required: true,
    options: REQUIREMENT_TYPE_OPTIONS,
  };
  return {
    message: message ?? "好的，我们先确定需求类型，方便走对应的分析流程。",
    ui: [selection],
  };
}

// 查看需求单详情（card）。
export function requirementCard(id: string): AIUIResponse {
  const requirement = DEMO_REQUIREMENT;
  if (id !== requirement.id) {
    const card: CardUI = {
      type: "card",
      title: `未找到需求 ${id}`,
      rows: [
        { label: "需求单号", value: id },
        { label: "提示", value: "没有匹配到该需求单，请确认单号后重试。" },
      ],
    };
    return { message: `没有找到需求单 ${id}。`, ui: [card] };
  }
  const card: CardUI = {
    type: "card",
    title: requirement.title,
    subtitle: `需求单号 ${requirement.id} · ${requirement.type}`,
    tag: requirement.status,
    rows: [
      { label: "需求单号", value: requirement.id },
      { label: "需求类型", value: requirement.type },
      { label: "当前状态", value: requirement.status },
      { label: "优先级", value: requirement.priority },
      { label: "提出人", value: requirement.submitter },
      { label: "期望版本", value: requirement.version },
      { label: "创建时间", value: requirement.createdAt },
    ],
    footer: requirement.description,
  };
  return {
    message: `已为你打开需求单 ${requirement.id} 的详情。`,
    ui: [card],
  };
}

// 步骤 3：确认启动需求分析（confirmation + steps）。
export function commitAnalysis(): AIUIResponse {
  const confirmation: ConfirmationUI = {
    type: "confirmation",
    title: "确认启动需求分析",
    summary: "系统将按以下流程对该需求执行多 Agent 分析：",
    details: [
      { label: "需求单号", value: DEMO_REQUIREMENT.id },
      { label: "需求标题", value: DEMO_REQUIREMENT.title },
      { label: "分析流程", value: "结构化抽取 → 澄清判断 → 多维度分析 → 风险评估 → 汇总报告" },
    ],
    confirmActionId: "confirm_analysis",
    cancelActionId: "cancel_analysis",
    confirmLabel: "开始分析",
    cancelLabel: "取消",
  };
  return {
    message: "确认后立即开始需求分析，过程中会逐步推进。",
    ui: [confirmation, stepsFor(2)],
  };
}

// 步骤 2：填写需求详情（form + steps）。
export function detailForm(typeValue: string, typeLabel: string): AIUIResponse {
  const fields: FormField[] = [
    {
      name: "title",
      label: "需求标题",
      kind: "input",
      required: true,
      placeholder: "一句话描述需求，例如：支持差旅费在线报销",
    },
    {
      name: "description",
      label: "需求描述",
      kind: "textarea",
      required: true,
      placeholder: "请说明背景、现状与期望达成什么效果",
    },
    {
      name: "priority",
      label: "优先级",
      kind: "select",
      required: true,
      options: [
        { value: "高", label: "高（影响核心流程）" },
        { value: "中", label: "中（常规迭代）" },
        { value: "低", label: "低（可选优化）" },
      ],
    },
    {
      name: "due",
      label: "期望上线日期",
      kind: "date",
      required: false,
      placeholder: "如 2026-03-31",
    },
  ];
  const form: FormUI = {
    type: "form",
    title: `填写「${typeLabel}」需求详情`,
    description: "带 * 为必填项，提交后将进入确认环节。",
    submitActionId: "submit_form",
    fields,
  };
  return {
    message: `已选择需求类型：${typeLabel}。请补充以下信息，方便分析。`,
    ui: [form, stepsFor(1)],
  };
}

// 表单提交后的确认摘要（confirmation + steps）。
export function formSummary(draft: { typeLabel: string; title: string; description: string; priority: string; due: string }): AIUIResponse {
  const confirmation: ConfirmationUI = {
    type: "confirmation",
    title: "确认需求信息",
    summary: "请核对以下信息，确认后启动需求分析：",
    details: [
      { label: "需求类型", value: draft.typeLabel },
      { label: "标题", value: draft.title },
      { label: "描述", value: draft.description },
      { label: "优先级", value: draft.priority },
      { label: "期望上线", value: draft.due || "未填写" },
    ],
    confirmActionId: "confirm_analysis",
    cancelActionId: "cancel_analysis",
    confirmLabel: "确认并开始分析",
    cancelLabel: "返回修改",
  };
  return {
    message: "信息已收集完毕，请确认。",
    ui: [confirmation, stepsFor(2)],
  };
}

// 需求分析完成：steps(done) + card(结论摘要) + action_buttons。
export function analysisDone(draft: { typeLabel: string; title: string; description: string }): AIUIResponse {
  const card: CardUI = {
    type: "card",
    title: "需求分析完成",
    subtitle: `${draft.title}（${draft.typeLabel}）`,
    tag: "已完成",
    rows: [
      { label: "需求标题", value: draft.title },
      { label: "分析结论", value: "抽取与多维度分析已通过，风险已识别，报告可下载。" },
    ],
    footer: "完整报告可在此卡片下继续查看或导出。",
  };
  const steps = stepsFor(FLOW_STEPS.length);
  const buttons: ActionButtonsUI = {
    type: "action_buttons",
    title: "后续操作",
    buttons: [
      { actionId: "start_over", label: "再提一个需求", variant: "primary" },
      { actionId: "export_report", label: "导出分析报告", variant: "default" },
    ],
  };
  return {
    message: "需求分析已完成。",
    ui: [steps, card, buttons],
  };
}

// 失败 / 兜底文案。
export function fallbackText(content: string): AIUIResponse {
  const text: TextUI = { type: "text", content };
  return { message: content, ui: [text] };
}
