import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { config } from "dotenv";
import { AppModule } from "../src/app.module";

describe("RBAC e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Load .env.test (DATABASE_URL -> admin_test, JWT_SECRET -> test-secret) BEFORE AppModule
    // compiles. ConfigModule.forRoot's later .env load won't override already-set env vars.
    config({ path: ".env.test" });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("健康检查 /auth/health 返回 ok", async () => {
    const res = await request(app.getHttpServer()).get("/auth/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("登录成功 → me 返回用户与权限", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "admin", password: "admin123" });
    expect(login.status).toBe(201);
    const access = login.body.accessToken;

    const me = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${access}`);
    expect(me.status).toBe(200);
    expect(me.body.isSuperAdmin).toBe(true);
  });

  it("未带 token 访问受保护接口返回 401", async () => {
    const res = await request(app.getHttpServer()).get("/users");
    expect(res.status).toBe(401);
  });
});
