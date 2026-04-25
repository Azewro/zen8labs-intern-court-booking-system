import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Mở cửa cho Frontend gọi API không bị lỗi CORS
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3001); // Tránh đụng hàng với NextJS
}
bootstrap();
