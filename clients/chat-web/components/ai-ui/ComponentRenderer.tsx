import type { ReactNode } from "react";
import type { UIResponse, UIAction } from "./types";
import SelectionCard from "./SelectionCard";
import DynamicForm from "./DynamicForm";
import ConfirmationDialog from "./ConfirmationDialog";
import InfoCard from "./InfoCard";
import StepsProgress from "./StepsProgress";
import DataTable from "./DataTable";
import ActionButtons from "./ActionButtons";

export interface ComponentRendererProps {
  ui: UIResponse;
  onAction: (action: UIAction) => void;
}

// ComponentRenderer：根据 UIResponse.type 分派到对应的 React 组件。
// text 没有独立交互，直接渲染成纯文本块；其余 7 类映射到同名单文件组件。
export default function ComponentRenderer({ ui, onAction }: ComponentRendererProps): ReactNode {
  switch (ui.type) {
    case "text":
      return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{ui.content}</p>;
    case "selection":
      return <SelectionCard ui={ui} onAction={onAction} />;
    case "form":
      return <DynamicForm ui={ui} onAction={onAction} />;
    case "confirmation":
      return <ConfirmationDialog ui={ui} onAction={onAction} />;
    case "card":
      return <InfoCard ui={ui} />;
    case "steps":
      return <StepsProgress ui={ui} />;
    case "table":
      return <DataTable ui={ui} />;
    case "action_buttons":
      return <ActionButtons ui={ui} onAction={onAction} />;
    default: {
      // UIResponse 是受控联合类型，兜底仅防御未知载荷。
      const unknown = ui as { type?: string };
      return <p className="text-sm text-slate-400">未知组件类型：{String(unknown.type ?? "(空)")}</p>;
    }
  }
}
