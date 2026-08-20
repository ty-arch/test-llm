"use client";

import { useEffect, useState } from "react";
import { Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { apiFetch } from "@/lib/api";

interface AuditLogRow {
  id: string;
  action: string;
  userId: string | null;
  username: string;
  targetId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
interface AuditPage { items: AuditLogRow[]; total: number; page: number; pageSize: number }

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditPage>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (page: number, filter: string) => {
    const qs = new URLSearchParams({ page: String(page) });
    if (filter) qs.set("action", filter);
    setLoading(true);
    try {
      setData(await apiFetch<AuditPage>(`/audit-logs?${qs.toString()}`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, ""); }, []);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">审计日志</h1>
      <div className="flex gap-2">
        <Input placeholder="操作(action)" value={action} onValueChange={setAction} />
        <Button onPress={() => load(1, action)}>查询</Button>
      </div>
      <Table aria-label="audit-logs">
        <TableHeader>
          <TableColumn>操作</TableColumn>
          <TableColumn>用户名</TableColumn>
          <TableColumn>目标</TableColumn>
          <TableColumn>IP</TableColumn>
          <TableColumn>时间</TableColumn>
        </TableHeader>
        <TableBody>
          {data.items.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.action}</TableCell>
              <TableCell>{log.username}</TableCell>
              <TableCell>{log.targetId ?? "-"}</TableCell>
              <TableCell>{log.ip ?? "-"}</TableCell>
              <TableCell>{log.createdAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between">
        <span className="text-sm text-default-500">共 {data.total} 条，第 {data.page}/{totalPages} 页</span>
        <div className="flex gap-2">
          <Button size="sm" isDisabled={loading || data.page <= 1} onPress={() => load(data.page - 1, action)}>上一页</Button>
          <Button size="sm" isDisabled={loading || data.page >= totalPages} onPress={() => load(data.page + 1, action)}>下一页</Button>
        </div>
      </div>
    </div>
  );
}
