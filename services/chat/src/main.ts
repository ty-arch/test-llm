import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const PORT = Number(process.env.PORT ?? 4001);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: "http://localhost:3002",
  });
  await app.listen(PORT);
  console.log(`Chat service listening on http://localhost:${PORT}`);
}

bootstrap();
