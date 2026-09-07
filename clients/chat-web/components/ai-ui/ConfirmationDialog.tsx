"use client";

import type { ConfirmationUI, UIAction } from "./types";

interface ConfirmationDialogProps {
  ui: ConfirmationUI;
  onAction: (action: UIAction) => void;
}

// confirmation：展示操作摘要 + 详情，提供确认 / 取消按钮。
export default function ConfirmationDialog({ ui, onAction }: ConfirmationDialogProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">{ui.title}</p>
      {ui.summary && <p className="mt-1 text-xs text-slate-500">{ui.summary}</p>}

      {ui.details && ui.details.length > 0 && (
        <dl className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60 px-3 text-sm">
          {ui.details.map((row, index) => (
            <div key={index} className="flex gap-4 py-1.5">
              <dt className="w-24 shrink-0 text-slate-400">{row.label}</dt>
              <dd className="text-slate-700">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onAction({ actionId: ui.cancelActionId })}
          className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {ui.cancelLabel ?? "取消"}
        </button>
        <button
          type="button"
          onClick={() => onAction({ actionId: ui.confirmActionId })}
          className={
            "rounded-lg px-4 py-1.5 text-sm font-medium text-white transition " +
            (ui.danger
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-indigo-600 hover:bg-indigo-700")
          }
        >
          {ui.confirmLabel ?? "确认"}
        </button>
      </div>
    </div>
  );
}
