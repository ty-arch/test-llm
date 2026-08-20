"use client";

import { useEffect, useState } from "react";
import { Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { apiFetch } from "@/lib/api";
import { HasPermission } from "@/components/has-permission";

interface UserRow { id: string; username: string; nickname: string | null; status: string; isSuperAdmin: boolean }

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const load = async () => setUsers(await apiFetch<UserRow[]>("/users"));
  useEffect(() => { load(); }, []);

  const create = async () => {
    await apiFetch("/users", { method: "POST", body: JSON.stringify({ username, password }) });
    setUsername(""); setPassword(""); await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">用户管理</h1>
      <HasPermission code="user:create">
        <div className="flex gap-2">
          <Input placeholder="用户名" value={username} onValueChange={setUsername} />
          <Input placeholder="密码" type="password" value={password} onValueChange={setPassword} />
          <Button color="primary" onPress={create}>新建</Button>
        </div>
      </HasPermission>
      <Table aria-label="users">
        <TableHeader>
          <TableColumn>用户名</TableColumn><TableColumn>昵称</TableColumn><TableColumn>状态</TableColumn>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.nickname ?? "-"}</TableCell>
              <TableCell>{u.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
