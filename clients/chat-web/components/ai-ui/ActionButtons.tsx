import type { ActionButtonVariant, ActionButtonsUI, UIAction } from "./types";

interface ActionButtonsProps {
  ui: ActionButtonsUI;
  onAction: (action: UIAction) => void;
}

// 按钮样式映射（primary 主按钮 / default 次按钮 / danger 危险 / text 纯文字）。
const VARIANT_STYLE: Record<ActionButtonVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  default: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  text: "text-indigo-600 hover:bg-indigo-50",
};

// action_buttons：渲染一组可点击的操作按钮。
export default function ActionButtons({ ui, onAction }: ActionButtonsProps) {
  const base = "rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      {ui.title && <p className="mb-2 px-1 text-xs font-medium text-slate-500">{ui.title}</p>}
      <div className="flex flex-wrap gap-2">
        {ui.buttons.map((button) => (
          <button
            key={button.actionId}
            type="button"
            disabled={button.disabled}
            onClick={() => onAction({ actionId: button.actionId })}
            className={`${base} ${VARIANT_STYLE[button.variant ?? "default"]}`}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}
