import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? `http://localhost:${process.env.ADMIN_WEB_PORT ?? 3003}`,
    credentials: true,
  });
  await app.listen(Number(process.env.ADMIN_API_PORT ?? 4002));
}
bootstrap();
