import { Injectable } from "@nestjs/common";
import { AIUIResponse, UIAction } from "./ui-types";
import {
  REQUIREMENT_TYPE_OPTIONS,
  analysisDone,
  detailForm,
  fallbackText,
  formSummary,
  startSelection,
} from "./scenario";

// 流程阶段（需求分析 demo 的确定性状态机）。
type UiStage = "idle" | "fill_detail" | "confirm" | "analyzed";

// 一个 session 内的流程状态（含已收集的需求草稿）。
interface UiFlowState {
  sessionId: string;
  stage: UiStage;
  draft: {
    type?: string;
    typeLabel?: string;
    title?: string;
    description?: string;
    priority?: string;
    due?: string;
  };
  updatedAt: number;
}

function optionLabel(value: string): { value: string; label: string } | null {
  const option = REQUIREMENT_TYPE_OPTIONS.find((item) => item.value === value);
  return option ?? null;
}

function toText(value: string | number | undefined): string {
  return value === undefined ? "" : String(value).trim();
}

// UI Action 处理：根据用户在 UI 上的操作推进确定性状态机。
// 支持：choose_type（选择）/ submit_form（表单提交）/ confirm_analysis、cancel_analysis（确认）/ start_over。
@Injectable()
export class UiFlowService {
  private readonly states = new Map<string, UiFlowState>();

  private getOrCreate(sessionId: string): UiFlowState {
    let state = this.states.get(sessionId);
    if (!state) {
      state = { sessionId, stage: "idle", draft: {}, updatedAt: Date.now() };
      this.states.set(sessionId, state);
    }
    return state;
  }

  private reset(sessionId: string): void {
    this.states.delete(sessionId);
  }

  // 展示一个会话当前流程状态（供调试/前端恢复）。
  getState(sessionId: string): { sessionId: string; stage: UiStage; draft: UiFlowState["draft"] } | null {
    const state = this.states.get(sessionId);
    return state ? { sessionId, stage: state.stage, draft: state.draft } : null;
  }

  // 处理一次 UI 操作并返回下一步的 UI 回复。
  async handleAction(sessionId: string, action: UIAction): Promise<AIUIResponse> {
    const state = this.getOrCreate(sessionId);

    switch (action.actionId) {
      case "choose_type": {
        const chosen = optionLabel(toText(action.value));
        if (!chosen) {
          return fallbackText(`无效的需求类型：${toText(action.value)}，请重新选择。`);
        }
        state.stage = "fill_detail";
        state.draft.type = chosen.value;
        state.draft.typeLabel = chosen.label;
        state.updatedAt = Date.now();
        return detailForm(chosen.value, chosen.label);
      }

      case "submit_form": {
        const fields = action.fields ?? {};
        const title = toText(fields.title);
        const description = toText(fields.description);
        const priority = toText(fields.priority) || "中";
        if (!title || !description) {
          return fallbackText("必填项不完整：请填写需求标题与需求描述后再提交。");
        }
        if (!state.draft.typeLabel) {
          return fallbackText("流程状态异常：请先选择需求类型，再填写详情。");
        }
        state.stage = "confirm";
        state.draft.title = title;
        state.draft.description = description;
        state.draft.priority = priority;
        state.draft.due = toText(fields.due);
        state.updatedAt = Date.now();
        return formSummary({
          typeLabel: state.draft.typeLabel,
          title,
          description,
          priority,
          due: state.draft.due ?? "",
        });
      }

      case "confirm_analysis": {
        if (!state.draft.title) {
          return fallbackText("当前没有可分析的需求，请先填写需求详情。");
        }
        state.stage = "analyzed";
        state.updatedAt = Date.now();
        return analysisDone({
          typeLabel: state.draft.typeLabel ?? "需求",
          title: state.draft.title,
          description: state.draft.description ?? "",
        });
      }

      case "cancel_analysis": {
        this.reset(sessionId);
        return startSelection("已取消本次操作，需要继续的话请重新选择需求类型。");
      }

      case "start_over": {
        this.reset(sessionId);
        return startSelection("好的，重新来一次。请选择需求类型：");
      }

      default:
        return fallbackText(`暂不支持的动作：${action.actionId}。`);
    }
  }
}
