import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const PORT = Number(process.env.CHAT_API_PORT ?? 4001);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CHAT_CORS_ORIGIN?.split(",") ?? `http://localhost:${process.env.CHAT_WEB_PORT ?? 3002}`,
  });
  await app.listen(PORT);
  console.log(`Chat service listening on http://localhost:${PORT}`);
}

bootstrap();
