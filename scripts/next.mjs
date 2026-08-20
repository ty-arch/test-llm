// 共享前端启动器：从进程环境读取端口键（由 `bun --env-file=../../.env` 载入），
// 再用 `next <mode> -p <port>` 启动。让前端端口只出现在根 .env 一处。
import { spawn } from "node:child_process";

const [portKey, mode = "dev"] = process.argv.slice(2);
const port = process.env[portKey] ?? "3000";

// `next` 位于 node_modules/.bin（bun 装成 next.exe/next.bunx 或带 shebang 的脚本），
// 直接 spawn 即可，Windows/Linux 都能解析（无需 shell）。
spawn("next", [mode, "-p", port], { stdio: "inherit" });
