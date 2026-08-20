"use client";

import { useState } from "react";
import { Button, Card, Input } from "@heroui/react";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    try {
      setError("");
      await login(username, password);
      window.location.href = "/users";
    } catch {
      setError("用户名或密码错误");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-96 p-8">
        <h1 className="mb-6 text-xl font-bold">后台管理登录</h1>
        <div className="space-y-4">
          <Input label="用户名" value={username} onValueChange={setUsername} />
          <Input label="密码" type="password" value={password} onValueChange={setPassword} />
          {error && <p className="text-danger">{error}</p>}
          <Button color="primary" className="w-full" onPress={submit}>登录</Button>
        </div>
      </Card>
    </div>
  );
}
