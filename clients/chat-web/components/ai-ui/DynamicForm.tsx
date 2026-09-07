"use client";

import { useState } from "react";
import type { UIActionFieldValue, FormField, FormUI, UIAction } from "./types";

interface DynamicFormProps {
  ui: FormUI;
  onAction: (action: UIAction) => void;
}

// 通用的受控输入控件样式。
const CONTROL_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 " +
  "placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: UIActionFieldValue;
  onChange: (name: string, value: UIActionFieldValue) => void;
}) {
  const set = (next: UIActionFieldValue) => onChange(field.name, next);

  if (field.kind === "textarea") {
    return (
      <textarea
        rows={3}
        value={String(value ?? "")}
        placeholder={field.placeholder}
        required={field.required}
        onChange={(e) => set(e.target.value)}
        className={CONTROL_CLASS}
      />
    );
  }

  if (field.kind === "select") {
    return (
      <select
        value={String(value ?? "")}
        required={field.required}
        onChange={(e) => set(e.target.value)}
        className={CONTROL_CLASS}
      >
        <option value="" disabled>
          请选择…
        </option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.kind}
      value={String(value ?? "")}
      placeholder={field.placeholder}
      required={field.required}
      onChange={(e) => set(e.target.value)}
      className={CONTROL_CLASS}
    />
  );
}

// form：按 FormField 动态生成表单，原生 required 校验后提交（form.submitActionId）。
export default function DynamicForm({ ui, onAction }: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, UIActionFieldValue>>({});

  function update(name: string, value: UIActionFieldValue) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAction({ actionId: ui.submitActionId ?? "submit_form", fields: values });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-sm font-semibold text-slate-800">{ui.title}</p>
      {ui.description && <p className="mt-1 text-xs text-slate-500">{ui.description}</p>}

      <div className="mt-3 grid gap-3">
        {ui.fields.map((field) => (
          <label key={field.name} className="block text-sm">
            <span className="mb-1 flex items-center text-slate-700">
              {field.label}
              {field.required && <span className="ml-0.5 text-rose-500">*</span>}
            </span>
            <FieldControl field={field} value={values[field.name]} onChange={update} />
          </label>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          提交
        </button>
      </div>
    </form>
  );
}
