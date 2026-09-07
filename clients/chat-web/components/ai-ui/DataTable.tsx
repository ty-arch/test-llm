import type { TableUI } from "./types";

interface DataTableProps {
  ui: TableUI;
}

// table：把 columns + rows 渲染成轻量表格（空单元格显示占位符）。
export default function DataTable({ ui }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {ui.title && (
        <div className="border-b border-slate-100 px-4 py-2.5">
          <p className="text-sm font-semibold text-slate-800">{ui.title}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500">
              {ui.columns.map((column) => (
                <th key={column.key} className="px-4 py-2 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ui.rows.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 1 ? "bg-slate-50/40" : ""}
              >
                {ui.columns.map((column) => (
                  <td key={column.key} className="px-4 py-2 text-slate-700">
                    {row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
