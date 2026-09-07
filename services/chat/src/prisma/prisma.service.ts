import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Chat 服务的 Prisma 客户端。
// Prisma 7 需通过驱动适配器连接数据库（@prisma/adapter-pg 包装 pg 连接池）。
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL 未配置，无法初始化 PrismaService");
    }
    // 直连 PostgreSQL：PrismaPg 内部会创建连接池。
    const adapter = new PrismaPg(url);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
