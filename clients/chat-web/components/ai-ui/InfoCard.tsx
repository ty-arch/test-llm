import type { CardUI } from "./types";

interface InfoCardProps {
  ui: CardUI;
}

// card：展示结构化信息卡片（需求详情、订单详情等）。
export default function InfoCard({ ui }: InfoCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{ui.title}</p>
          {ui.subtitle && <p className="mt-0.5 text-xs text-slate-500">{ui.subtitle}</p>}
        </div>
        {ui.tag && (
          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
            {ui.tag}
          </span>
        )}
      </div>

      {ui.rows.length > 0 && (
        <dl className="mt-3 space-y-1.5 text-sm">
          {ui.rows.map((row, index) => (
            <div key={index} className="flex gap-4">
              <dt className="w-24 shrink-0 text-slate-400">{row.label}</dt>
              <dd className="break-words text-slate-700">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {ui.footer && <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-400">{ui.footer}</p>}
    </div>
  );
}
