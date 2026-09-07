import { Injectable } from "@nestjs/common";
import type { AIUIResponse, UIAction } from "./ui-types";
import type { RequirementCollected } from "./scenario";
import {
  confirmAndCard,
  detailForm,
  fallbackText,
  resolveTypeValue,
  resultView,
  startSelection,
} from "./scenario";

// 需求分析流程的确定性状态机阶段（06-02）。
export type UiStage = "select_type" | "fill_detail" | "confirm" | "result";

// 一个 session 的交互上下文：sessionStage + collectedData（收集到的需求数据）。
interface UiFlowState {
  sessionId: string;
  stage: UiStage;
  collectedData: RequirementCollected;
  updatedAt: number;
}

// 全局自增序号，用于生成演示用需求单号（REQ-YYYYMMDD-NNN）。
let requirementSeq = 0;

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function todayStamp(): string {
  const date = new Date();
  return `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}`;
}

function generateRequirementId(): string {
  requirementSeq += 1;
  return `REQ-${todayStamp()}-${pad(requirementSeq % 1000, 3)}`;
}

// 从「提新需求」输入里截取冒号/逗号之后的补充说明（若无则空）。
function extractSupplement(rawInput: string): string {
  const match = rawInput.trim().match(/[:：,，;；]\s*([\s\S]+)$/);
  if (match && match[1].trim()) return match[1].trim();
  return "";
}

// actionId 归一：去空白、小写、去掉分隔符，便于多种写法命中同一动作。
function normalizeActionId(actionId: string): string {
  return String(actionId ?? "").trim().toLowerCase().replace(/[\s_\-./]+/g, "");
}

// 动作归类：把常见的 actionId 写法映射到统一动作类别。
type ActionKind = "select_type" | "submit_form" | "confirm" | "cancel" | "start_over";

function actionKind(actionId: string): ActionKind | null {
  const key = normalizeActionId(actionId);
  const table: Record<string, ActionKind> = {
    selecttype: "select_type",
    select: "select_type",
    choose_type: "select_type",
    choosetype: "select_type",
    selection: "select_type",
    submitform: "submit_form",
    submit: "submit_form",
    formsubmit: "submit_form",
    form: "submit_form",
    submitdetail: "submit_form",
    confirm: "confirm",
    confirmanalysis: "confirm",
    confirmsubmit: "confirm",
    proceed: "confirm",
    确认: "confirm",
    开始分析: "confirm",
    cancel: "cancel",
    cancelanalysis: "cancel",
    back: "cancel",
    back_previous: "cancel",
    取消: "cancel",
    返回: "cancel",
    startover: "start_over",
    restart: "start_over",
    重新开始: "start_over",
    再提一个需求: "start_over",
  };
  return table[key] ?? null;
}

// UI Action 处理：根据当前 session stage 与 UIAction 推进流程，更新 context
// （sessionStage + collectedData），返回下一阶段的 AIUIResponse。
// 阶段流转：select_type → fill_detail → confirm → result；取消回退到上一阶段。
@Injectable()
export class UiFlowService {
  private readonly states = new Map<string, UiFlowState>();

  private getOrCreate(sessionId: string): UiFlowState {
    let state = this.states.get(sessionId);
    if (!state) {
      state = { sessionId, stage: "select_type", collectedData: {}, updatedAt: Date.now() };
      this.states.set(sessionId, state);
    }
    return state;
  }

  private save(state: UiFlowState): void {
    state.updatedAt = Date.now();
    this.states.set(state.sessionId, state);
  }

  private reset(sessionId: string): void {
    this.states.delete(sessionId);
  }

  // 展示会话交互上下文（stage + collectedData），供调试 / 前端恢复。
  getState(sessionId: string): { sessionId: string; stage: UiStage; collectedData: RequirementCollected } | null {
    const state = this.states.get(sessionId);
    return state ? { sessionId, stage: state.stage, collectedData: state.collectedData } : null;
  }

  // Stage 1 入口：用户说「我要提一个新需求…」→ 进入 select_type 并返回 selection。
  // rawInput 冒号后的补充说明会存入 collectedData.note，随流程带到后面的表单/确认。
  async startNew(sessionId: string, rawInput: string): Promise<AIUIResponse> {
    const state = this.getOrCreate(sessionId);
    const note = extractSupplement(rawInput);
    state.stage = "select_type";
    state.collectedData = { note: note || undefined };
    this.save(state);
    return startSelection(
      note ? `收到需求补充：${note}。请先选择需求类型，便于走对应分析流程。` : "好的，我们先确定需求类型。",
    );
  }

  async handleAction(sessionId: string, action: UIAction): Promise<AIUIResponse> {
    const state = this.getOrCreate(sessionId);
    const kind = actionKind(action.actionId);

    // 未知动作 / 无 actionId 且不是选择、提交等：兜底并引导。
    if (!kind) {
      if (resolveTypeValue(action.value ?? "")) {
        return this.selectType(state, action);
      }
      return fallbackText(`暂不支持的动作：${action.actionId}。`);
    }

    switch (kind) {
      case "select_type":
        return this.selectType(state, action);

      case "submit_form":
        return this.submitForm(state, action);

      case "confirm":
        return this.confirm(state);

      case "cancel":
        return this.cancel(state);

      case "start_over":
        this.reset(sessionId);
        return startSelection("好的，重新来一次。请选择需求类型：");
    }
  }

  // select_type → fill_detail：记录类型，返回 form。
  private selectType(state: UiFlowState, action: UIAction): AIUIResponse {
    const raw = action.value ?? action.values?.[0] ?? String(action.fields?.type ?? "");
    const type = resolveTypeValue(raw);
    if (!type) {
      return fallbackText(`无效的需求类型：${raw || "(空)"}，请重新选择。`);
    }
    state.stage = "fill_detail";
    state.collectedData.type = type.value;
    state.collectedData.typeLabel = type.label;
    this.save(state);
    return detailForm(type.value, type.label);
  }

  // fill_detail → confirm：收集表单字段，生成需求单号，返回 confirmation + card。
  private submitForm(state: UiFlowState, _action: UIAction): AIUIResponse {
    if (!state.collectedData.typeLabel) {
      return startSelection("请先选择需求类型，再填写需求详情。");
    }
    const fields = _action.fields ?? {};
    const toText = (v: string | number | undefined): string => (v === undefined ? "" : String(v).trim());

    const note = state.collectedData.note ?? "";
    let title = toText(fields.title) || (note ? note.slice(0, 30) : "");
    let description = toText(fields.description) || note;
    const priority = toText(fields.priority) || "中";
    const due = toText(fields.due);

    // 需求标题可能落在 fields 的其它命名下，兜底用补充说明首句。
    if (!title && description) title = description.slice(0, 30);

    state.collectedData.title = title || undefined;
    state.collectedData.description = description || undefined;
    state.collectedData.priority = priority;
    state.collectedData.due = due || undefined;
    if (!state.collectedData.id) state.collectedData.id = generateRequirementId();
    state.stage = "confirm";
    this.save(state);
    return confirmAndCard(state.collectedData);
  }

  // confirm → result：确认后展示 steps + action_buttons。
  private confirm(state: UiFlowState): AIUIResponse {
    if (!state.collectedData.typeLabel && !state.collectedData.note) {
      return startSelection("当前还没有待分析的需求，请先走提需求流程。");
    }
    if (!state.collectedData.id) state.collectedData.id = generateRequirementId();
    state.stage = "result";
    this.save(state);
    return resultView(state.collectedData);
  }

  // 取消 / 回退到上一阶段。
  private cancel(state: UiFlowState): AIUIResponse {
    const type = state.collectedData.type;
    const typeLabel = state.collectedData.typeLabel;
    switch (state.stage) {
      case "confirm":
        // confirm ← fill_detail：返回表单修改（已填信息保留在 context）。
        state.stage = "fill_detail";
        this.save(state);
        if (type && typeLabel) {
          return detailForm(type, typeLabel, "已返回填写页，之前填写的信息已保留，可直接修改后再次提交。");
        }
        return startSelection("已取消，请重新选择需求类型。");
      case "fill_detail":
        // fill_detail ← select_type。
        state.stage = "select_type";
        state.collectedData.type = undefined;
        state.collectedData.typeLabel = undefined;
        this.save(state);
        return startSelection("已返回上一步，请重新选择需求类型。");
      case "result":
        this.reset(state.sessionId);
        return startSelection("已结束本次分析，如需新的需求请重新选择类型。");
      default:
        return startSelection();
    }
  }
}
