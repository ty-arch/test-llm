import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

// 沙箱校验：把用户给的相对路径解析到 workspace 根目录下，确保不会越界。
// 返回解析后的绝对路径；越界时抛错。
export function safePath(workspaceRoot: string, userPath: string): string {
  const root = resolve(workspaceRoot);
  const target = resolve(root, userPath);
  const rel = relative(root, target);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`路径越界：${userPath} 不在 workspace 目录下`);
  }
  return target;
}

// 三个业务工具：query_requirement / read_file / write_file。
// 所有文件操作都限制在 workspace/ 目录下（safePath 沙箱校验）。
export function createBusinessTools(workspaceRoot: string) {
  const queryRequirement = tool(
    async ({ requirementId }) => {
      const file = safePath(workspaceRoot, join("requirements", `${requirementId}.json`));
      if (!existsSync(file)) {
        return `未找到需求单 ${requirementId}：${file}`;
      }
      return readFileSync(file, "utf8");
    },
    {
      name: "query_requirement",
      description: "根据需求单号读取 workspace/requirements/{requirementId}.json 的详情。",
      schema: z.object({
        requirementId: z.string().describe("需求单号，如 REQ-2026-001"),
      }),
    },
  );

  const readFile = tool(
    async ({ path }) => {
      const file = safePath(workspaceRoot, path);
      if (!existsSync(file)) {
        return `文件不存在：${path}`;
      }
      return readFileSync(file, "utf8");
    },
    {
      name: "read_file",
      description: "读取 workspace/ 下指定路径的文件内容（规范、标准等）。",
      schema: z.object({
        path: z.string().describe("workspace 下的相对路径（不带 workspace/ 前缀），如 standards/requirement-spec.md"),
      }),
    },
  );

  const writeFile = tool(
    async ({ path, content }) => {
      const file = safePath(workspaceRoot, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content, "utf8");
      return `已写入 ${path}`;
    },
    {
      name: "write_file",
      description: "将内容写入 workspace/ 下指定路径（分析报告、制品等）。",
      schema: z.object({
        path: z.string().describe("workspace 下的相对路径（不带 workspace/ 前缀），如 reports/REQ-2026-001-analysis.md"),
        content: z.string().describe("要写入的完整内容"),
      }),
    },
  );

  return [queryRequirement, readFile, writeFile];
}
