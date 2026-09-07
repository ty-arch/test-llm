import type { StepsUI, StepStatus } from "./types";

interface StepsProgressProps {
  ui: StepsUI;
}

// 单个步骤节点的样式：done=已完成(绿勾)，active=当前(蓝)，pending=待办(灰)，error=失败(红)。
const STATUS_STYLE: Record<StepStatus, { dot: string; line: string }> = {
  done: { dot: "bg-emerald-500 text-white border-emerald-500", line: "bg-emerald-300" },
  active: { dot: "bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100", line: "bg-slate-200" },
  pending: { dot: "bg-white text-slate-400 border-slate-300", line: "bg-slate-200" },
  error: { dot: "bg-rose-500 text-white border-rose-500", line: "bg-rose-300" },
};

function StepDot({ status }: { status: StepStatus }) {
  const style = STATUS_STYLE[status];
  if (status === "done") {
    return <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${style.dot}`}>✓</span>;
  }
  if (status === "error") {
    return <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${style.dot}`}>!</span>;
  }
  return <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${style.dot}`} />;
}

// steps：步骤进度条，展示流程的已完成 / 当前 / 待办阶段。
export default function StepsProgress({ ui }: StepsProgressProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {(ui.title || ui.currentLabel) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {ui.title && <p className="text-sm font-semibold text-slate-800">{ui.title}</p>}
          {ui.currentLabel && <p className="text-xs text-slate-500">{ui.currentLabel}</p>}
        </div>
      )}

      <ol className="flex items-center">
        {ui.items.map((item, index) => {
          const last = index === ui.items.length - 1;
          const style = STATUS_STYLE[item.status];
          return (
            <li key={index} className={`flex items-center ${last ? "" : "flex-1"}`}>
              <div className="flex flex-col items-center">
                <StepDot status={item.status} />
                <span
                  className={
                    "mt-1 max-w-16 truncate text-center text-[11px] leading-tight " +
                    (item.status === "active"
                      ? "font-medium text-indigo-600"
                      : item.status === "done"
                        ? "text-slate-600"
                        : "text-slate-400")
                  }
                >
                  {item.label}
                </span>
              </div>
              {!last && <div className={`mx-2 h-0.5 flex-1 rounded ${style.line}`} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
