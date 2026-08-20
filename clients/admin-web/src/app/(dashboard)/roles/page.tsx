"use client";

import { useEffect, useState } from "react";
import {
  Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Checkbox,
} from "@heroui/react";
import { apiFetch } from "@/lib/api";
import { HasPermission } from "@/components/has-permission";

interface PermissionOption { id: string; code: string; name: string; type: string }
interface RoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: { users: number };
  permissions: { permissionId: string }[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [assigning, setAssigning] = useState<RoleRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const loadRoles = async () => setRoles(await apiFetch<RoleRow[]>("/roles"));
  const loadPermissions = async () => setPermissions(await apiFetch<PermissionOption[]>("/permissions"));

  useEffect(() => { loadRoles(); loadPermissions(); }, []);

  const create = async () => {
    await apiFetch("/roles", {
      method: "POST",
      body: JSON.stringify({ code, name, description: description || undefined }),
    });
    setCode(""); setName(""); setDescription(""); await loadRoles();
  };

  const openAssign = (role: RoleRow) => {
    setAssigning(role);
    setSelected(role.permissions.map((p) => p.permissionId));
  };

  const toggleSelected = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const saveAssign = async () => {
    if (!assigning) return;
    await apiFetch(`/roles/${assigning.id}/permissions`, {
      method: "POST",
      body: JSON.stringify({ permissionIds: selected }),
    });
    setAssigning(null);
    await loadRoles();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">角色管理</h1>
      <HasPermission code="role:create">
        <div className="flex gap-2">
          <Input placeholder="角色编码" value={code} onValueChange={setCode} />
          <Input placeholder="角色名称" value={name} onValueChange={setName} />
          <Input placeholder="描述" value={description} onValueChange={setDescription} />
          <Button color="primary" onPress={create}>新建</Button>
        </div>
      </HasPermission>
      <Table aria-label="roles">
        <TableHeader>
          <TableColumn>编码</TableColumn>
          <TableColumn>名称</TableColumn>
          <TableColumn>描述</TableColumn>
          <TableColumn>用户数</TableColumn>
          <TableColumn>操作</TableColumn>
        </TableHeader>
        <TableBody>
          {roles.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.code}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.description ?? "-"}</TableCell>
              <TableCell>{r._count.users}</TableCell>
              <TableCell>
                <HasPermission code="permission:assign">
                  <Button size="sm" variant="light" onPress={() => openAssign(r)}>分配权限点</Button>
                </HasPermission>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={!!assigning} onOpenChange={(open) => { if (!open) setAssigning(null); }}>
        <ModalContent>
          <ModalHeader>分配权限点</ModalHeader>
          <ModalBody>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {permissions.map((p) => (
                <Checkbox
                  key={p.id}
                  isSelected={selected.includes(p.id)}
                  onValueChange={(v) => toggleSelected(p.id, v)}
                >
                  {p.name}（{p.code}）
                </Checkbox>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setAssigning(null)}>取消</Button>
            <Button color="primary" onPress={saveAssign}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
