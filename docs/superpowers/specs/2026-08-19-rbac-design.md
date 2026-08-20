# RBAC 权限模块设计文档

- 日期：2026-08-19
- 状态：待审阅
- 技术栈：NestJS 11 + Prisma + PostgreSQL（后端）；Next.js 16 + Tailwind 4 + HeroUI（前端）
- 落地：`@autix` monorepo 内新增 `services/admin`（后端）+ `clients/admin-web`（前端）

## 1. 背景与目标

为 chat 产品构建一套后台管理系统的 RBAC 权限模块。定位是 chat 产品的**运营后台**，拥有独立的后台管理员用户体系（与 chat 端用户隔离），提供用户、角色、权限点的管理，以及基于角色的细粒度访问控制。

目标：
- 功能权限精确到**页面 / 按钮 / 接口**三层。
- 后台管理员通过**用户名 + 密码**登录，支持 refresh token 落库、吊销与多端会话管理。
- 对**关键操作**留存审计日志。
- 为后续 chat 业务运营功能（读会话、封号等）预留接入位置，但本期只做 RBAC 本体。

## 2. 范围

### 2.1 本期范围

- 后台管理员登录 / 登出 / 刷新会话 / 多端会话管理。
- 用户、角色、权限点（菜单 / 按钮 / 接口）的增删改查与分配。
- 后端接口级鉴权 + 前端菜单 / 按钮级显隐。
- super_admin 直接放行机制。
- 关键操作审计日志的写入与查询。

### 2.2 非目标（YAGNI，本期明确不做）

- 多租户、组织 / 部门树、数据权限（单租户、纯功能权限）。
- 与 chat 端用户打通（chat 服务目前无用户模型，后台独立用户体系）。
- SSO / OAuth / 第三方登录；短信验证码登录。
- 登录失败次数锁定（防爆破）——标记为后续可加。
- 完整审计（全量写操作 + 字段级 diff）——仅记录关键操作。
- 权限点集合的内存缓存（本期直接查库，后续按需加短 TTL 缓存）。

## 3. 边界决策汇总

| 维度 | 决定 |
|------|------|
| 落地方式 | chat 产品的运营后台，本 monorepo 内新增服务 |
| 权限粒度 | 页面 + 按钮 + 接口（完整三层） |
| 数据维度 | 单租户、无组织（纯功能权限） |
| super_admin | User 上布尔标志，直接放行 |
| 用户体系 | 后台独立用户体系（不与 chat 共用） |
| refreshToken | 落库（hash），支持吊销 / 多端 / 轮换 |
| 审计日志 | 关键操作 |
| 登录方式 | 用户名 + 密码 |
| 密码哈希 | argon2id |
| refresh 传递 | httpOnly cookie（access 走内存 + Bearer） |
| isSuperAdmin 判断 | 放 JWT payload（撤销延迟 15 分钟生效） |
| 前端状态管理 | Zustand |
| 无权限按钮 | 隐藏 |

## 4. 整体架构与落地方式

- 在 `@autix` monorepo 内新增：
  - `services/admin`：NestJS 11 服务，Prisma 连 PostgreSQL，承载认证 + RBAC + 审计。
  - `clients/admin-web`：Next.js 16 App Router 前端，HeroUI 组件。
- `infra/compose` 新增 `postgres` 容器，`compose.yaml` 增加 `admin` + `admin-web` 两个服务。
- `packages/contracts` 按需补充 admin 相关共享类型（DTO / 权限码常量）。
- 后端与前端端口沿用现有惯例（如 `admin` 4002、`admin-web` 3003，实施时以 compose 为准）。

## 5. 数据模型（Prisma / PostgreSQL）

共 7 张表（5 实体 + 2 显式关联表）。字段列表如下（具体 Prisma 类型在实施计划中定稿）：

**User — 后台管理员**
- `id`、`username`（唯一）、`passwordHash`、`nickname?`、`status`（ACTIVE / DISABLED）、`isSuperAdmin`（布尔，默认 false）、`createdAt`、`updatedAt`

**Role — 角色**
- `id`、`code`（唯一，如 `operator` / `viewer`）、`name`、`description?`、`isSystem`（内置角色不可删）、`createdAt`、`updatedAt`

**Permission — 权限点（菜单 / 按钮 / 接口统一一张表）**
- `id`、`code`（唯一，命名 `resource:action`，如 `user:create` / `menu:user-mgmt`）、`name`、`type`（MENU / BUTTON / API）、`parentId?`（自关联，构成菜单树）、`path?`（前端路由或接口路径）、`sort`、`createdAt`、`updatedAt`

**UserRole — 用户 ↔ 角色（显式关联）**
- `id`、`userId`、`roleId`，`@@unique([userId, roleId])`

**RolePermission — 角色 ↔ 权限点（显式关联）**
- `id`、`roleId`、`permissionId`，`@@unique([roleId, permissionId])`

**RefreshToken — 落库 refresh token**
- `id`、`userId`、`tokenHash`（唯一，存 hash 不存明文）、`expiresAt`、`revokedAt?`、`replacedById?`（轮换链）、`userAgent?`、`ip?`、`createdAt`

**AuditLog — 关键操作审计**
- `id`、`userId?`、`username`（快照）、`action`、`targetType?`、`targetId?`、`detail Json?`（变更前后值）、`ip?`、`userAgent?`、`createdAt`

关键设计决策：
1. 菜单 / 按钮 / 接口三类权限统一进 `Permission` 表，用 `type` + `parentId` 区分，菜单树直接从这里出。
2. `isSuperAdmin` 是 User 上的布尔标志，非独立角色。
3. 两张多对多用显式关联表，为后续加「分配人 / 分配时间」留位置。
4. `RefreshToken` 存 hash 并支持轮换（`replacedById`），支持吊销与多端。
5. `AuditLog.username` 存快照，避免用户被删后审计对不上人。

## 6. 认证与令牌

**令牌双轨制**
- **access token**：JWT（HS256，`JWT_SECRET` 环境变量），payload `{ sub: userId, username, isSuperAdmin }`，有效期 **15 分钟**。
- **refresh token**：256bit 随机串（opaque），库中只存 sha256 **hash**，有效期 **7 天**，支持轮换与吊销。

**流程**
1. **登录** `POST /auth/login`：查 User → 校验 `status != DISABLED` → argon2id 校验密码 → 签发 access + refresh → 落库 refresh hash → 写审计 `auth:login`（成功与失败都记）。
2. **刷新** `POST /auth/refresh`：hash 查库 → 校验未撤销、未过期 → 轮换（旧 token 标 `revokedAt` + `replacedById`，发新对）→ 复用检测：收到已撤销 token 判定可能被盗用，吊销该用户全部会话。
3. **登出** `POST /auth/logout`：吊销该 refresh → 写审计 `auth:logout`。
4. **多端** `GET /auth/sessions` 列当前用户全部有效会话（设备 / IP / UA / 登录时间）；`POST /auth/sessions/:id/revoke` 吊销指定端。

**token 传递**
- access：前端内存 + `Authorization: Bearer`。
- refresh：**httpOnly cookie**（`HttpOnly; Secure; SameSite`），需 CORS credentials + cookie 属性配置；生产同域经反代最顺。

**密码哈希**：argon2id。

## 7. 后端鉴权

**全局两道守卫**
1. `JwtAuthGuard`（全局）：解析 Bearer → 验签 + 过期 → 挂 `request.user`；`@Public()` 接口跳过（登录 / 刷新 / 健康检查）。
2. `PermissionsGuard`（全局）：读 `@RequirePermission(...)` 元数据 → 无声明跳过 → `isSuperAdmin === true` 直接放行 → 否则查「用户 → 角色 → 权限点集合」，命中即放行，否则 403。

**装饰器**
- `@Public()` — 免登录。
- `@RequirePermission('user:create')` — 声明所需权限码，可传多个，默认 **OR** 语义（任一命中即放行）。
- `@CurrentUser()` — 取当前登录用户。

**接口级权限码示例**
```
GET    /users                 user:list
POST   /users                 user:create
PATCH  /users/:id             user:update
DELETE /users/:id             user:delete
POST   /roles/:id/permissions role:assign
```

**isSuperAdmin 判断**：放 JWT payload（登录时写入），守卫短路零额外查询；撤销超管需等 access 过期（15 分钟）生效。

**权限点集合查询**：每次请求走 `UserRole → RolePermission` 两条 join；内部后台并发低，直接查，本期不加缓存。

## 8. 前端权限控制

- **会话状态**：全局 `AuthProvider`（Zustand）持有 `user`、`permissions: string[]`、`menuTree`，登录后由 `GET /auth/me` 一次性返回。
- **会话恢复**：App 启动时若「内存无 access 但有 refresh cookie」，先静默调 `/auth/refresh` 恢复会话再渲染。
- **菜单渲染**：侧边栏由 `menuTree`（HeroUI 组件）渲染，`super_admin` 或持有对应菜单权限码者可见。
- **路由守卫**：客户端 `layout` / `AuthProvider` 层做（不用 middleware，因 access 存内存、middleware 拿不到）。无会话 → 跳登录；有会话但缺权限 → 403 页。
- **按钮显隐**：`usePermission(code)` hook 与 `<HasPermission code="...">` 组件，`super_admin` 恒返回 true；无权限按钮**隐藏**。
- **401 拦截**：fetch 拦截器统一处理——请求带内存 access；收到 401 静默刷新一次重试，仍失败清会话跳登录。

## 9. 审计日志

**记录范围（写操作为主）**
- 认证：`auth:login`（成功 / 失败）、`auth:logout`
- 用户：`user:create / update / delete / disable`
- 角色：`role:create / update / delete / assign`
- 权限：`permission:assign`

**实现方式**：`@Audit('user:create')` 装饰器 + 全局拦截器自动落库（操作人 / action / 目标 ID / ip / ua）；需要 diff 的场景（如禁用用户）在 service 层补 `detail`。

**查询**：`GET /audit-logs` 只读，按 action / 操作人 / 时间过滤、分页，仅 super_admin 或持 `audit:list` 权限者可看。

## 10. 测试与验证

- **单元测试（Jest）**：AuthService（登录成 / 败、密码错、用户禁用、token 签发）、RefreshToken（轮换 / 复用检测 / 吊销）、PermissionsGuard（放行 / 403 / 超管短路 / `@Public` 跳过）、argon2 往返。
- **e2e（supertest + 测试库）**：登录 → 持 token 访问受保护接口的 200 / 403、超管任意接口 200、refresh 轮换全流程。
- **前端（vitest + testing-library）**：`usePermission` / `<HasPermission>` 显隐逻辑。
- **手动全链路验收**：建角色 → 勾权限点 → 建用户 → 分配角色 → 登录 → 菜单 / 按钮显隐 → 接口鉴权。

## 11. 关键假设与待定项

- 端口、cookie 的 `SameSite` 取值、`JWT_SECRET` 管理方式等，在实施计划中结合 compose 与环境变量方案定稿。
- 权限点的初始种子数据（内置角色、初始 super_admin 账号、菜单树雏形）在实施计划中列出。
- 后续扩展方向（已明确不做、按需再议）：登录失败锁定、权限点缓存、多租户 / 数据权限、chat 业务运营操作接入。
