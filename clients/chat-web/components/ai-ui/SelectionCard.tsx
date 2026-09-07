"use client";

import { useState } from "react";
import type { SelectionUI, UIAction } from "./types";

interface SelectionCardProps {
  ui: SelectionUI;
  onAction: (action: UIAction) => void;
}

// selection：单选直接点击即触发 onAction；多选先勾选，点「确认选择」后再触发。
export default function SelectionCard({ ui, onAction }: SelectionCardProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function pick(option: { value: string; label: string }) {
    if (ui.mode === "single") {
      onAction({ actionId: "select", value: option.value });
      return;
    }
    setSelected((prev) =>
      prev.includes(option.value)
        ? prev.filter((value) => value !== option.value)
        : [...prev, option.value],
    );
  }

  function submitMultiple() {
    if (selected.length === 0 && ui.required) return;
    onAction({ actionId: "select", values: selected });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">{ui.title}</p>
      {ui.description && <p className="mt-1 text-xs text-slate-500">{ui.description}</p>}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ui.options.map((option) => {
          const checked = selected.includes(option.value);
          const active = ui.mode === "single" ? false : checked;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => pick(option)}
              className={
                "rounded-lg border px-3 py-2 text-left text-sm transition " +
                (active
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40")
              }
            >
              <span className="flex items-center gap-2">
                {ui.mode === "multiple" && (
                  <span
                    className={
                      "inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] leading-none " +
                      (checked ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 text-transparent")
                    }
                  >
                    ✓
                  </span>
                )}
                <span className="font-medium">{option.label}</span>
              </span>
              {option.description && (
                <span className="mt-0.5 block text-xs font-normal text-slate-400">{option.description}</span>
              )}
            </button>
          );
        })}
      </div>

      {ui.mode === "multiple" && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={submitMultiple}
            disabled={ui.required && selected.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            确认选择
          </button>
        </div>
      )}
    </div>
  );
}
