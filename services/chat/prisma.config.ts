import { defineConfig } from "prisma/config";

// Prisma 7：数据库连接串不再写进 schema.prisma，改由 prisma.config.ts 提供。
// 运行时由 `bun run --env-file=.env` 注入，此处仅读取 process.env。
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
});
