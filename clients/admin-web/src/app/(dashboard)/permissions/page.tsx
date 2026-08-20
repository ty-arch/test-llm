"use client";

import { useEffect, useState } from "react";
import {
  Button, Input, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from "@heroui/react";
import { apiFetch } from "@/lib/api";
import { HasPermission } from "@/components/has-permission";

type PermissionType = "MENU" | "BUTTON" | "API";
interface PermissionRow {
  id: string;
  code: string;
  name: string;
  type: PermissionType;
  parentId: string | null;
  path: string | null;
  sort: number;
}

const TYPE_LABELS: Record<PermissionType, string> = { MENU: "菜单", BUTTON: "按钮", API: "接口" };

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<PermissionType>("MENU");
  const [path, setPath] = useState("");
  const [sort, setSort] = useState("");

  const load = async () => setPermissions(await apiFetch<PermissionRow[]>("/permissions"));
  useEffect(() => { load(); }, []);

  const create = async () => {
    await apiFetch("/permissions", {
      method: "POST",
      body: JSON.stringify({
        code,
        name,
        type,
        path: path || undefined,
        sort: sort === "" ? undefined : Number(sort),
      }),
    });
    setCode(""); setName(""); setPath(""); setSort("");
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">权限点管理</h1>
      <HasPermission code="permission:create">
        <div className="flex gap-2">
          <Input placeholder="权限编码" value={code} onValueChange={setCode} />
          <Input placeholder="权限名称" value={name} onValueChange={setName} />
          <Select
            label="类型"
            className="w-32"
            selectedKeys={[type]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0];
              if (value === "MENU" || value === "BUTTON" || value === "API") setType(value);
            }}
          >
            <SelectItem key="MENU">菜单</SelectItem>
            <SelectItem key="BUTTON">按钮</SelectItem>
            <SelectItem key="API">接口</SelectItem>
          </Select>
          <Input placeholder="路径" value={path} onValueChange={setPath} />
          <Input placeholder="排序" type="number" value={sort} onValueChange={setSort} />
          <Button color="primary" onPress={create}>新建</Button>
        </div>
      </HasPermission>
      <Table aria-label="permissions">
        <TableHeader>
          <TableColumn>编码</TableColumn>
          <TableColumn>名称</TableColumn>
          <TableColumn>类型</TableColumn>
          <TableColumn>路径</TableColumn>
          <TableColumn>排序</TableColumn>
        </TableHeader>
        <TableBody>
          {permissions.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.code}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{TYPE_LABELS[p.type] ?? p.type}</TableCell>
              <TableCell>{p.path ?? "-"}</TableCell>
              <TableCell>{p.sort}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
