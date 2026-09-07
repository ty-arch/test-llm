import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../auth/current-user.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SearchService } from "./search.service";

class SearchBody {
  query?: string;
  topK?: number;
}

// 语义检索路由：POST /api/search，需要 JWT。
@Controller("api/search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // POST /api/search —— { query, topK? } 对当前用户的已处理文档做语义检索。
  @Post()
  async search(@CurrentUser() user: AuthUser, @Body() body?: SearchBody) {
    const query = body?.query?.trim();
    if (!query) throw new BadRequestException("query 不能为空");
    const results = await this.searchService.similaritySearch(query, user.id, body?.topK);
    return { results };
  }
}
