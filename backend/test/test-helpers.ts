/**
 * test-helpers.ts
 * Utility functions dùng chung trong tất cả E2E test files.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Tạo NestJS app đã configured cho E2E test.
 * Dùng trong beforeAll() của mỗi describe block.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Cấu hình giống main.ts để test phản ánh đúng behavior thật
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

/**
 * Xóa sạch tất cả data trong DB test.
 * Gọi trong beforeEach() để mỗi test bắt đầu với DB trống.
 * Thứ tự xóa phải đúng để tránh FK constraint error.
 */
export async function cleanDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.court.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Seed dữ liệu mặc định: 1 admin + 1 user thường + 1 sân ACTIVE.
 * Dùng để setup nhanh cho test mà không cần tạo data thủ công.
 */
export async function seedBaseData(app: INestApplication) {
  const prisma = app.get(PrismaService);
  const bcrypt = await import('bcrypt');

  const hashedPassword = await bcrypt.hash('Test123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: hashedPassword,
      fullName: 'Test Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@test.com',
      password: hashedPassword,
      fullName: 'Test User',
      role: 'USER',
      isActive: true,
    },
  });

  const court = await prisma.court.create({
    data: {
      name: 'Sân Test A',
      location: 'Quận 1, HCM',
      pricePerHour: 100000,
      status: 'ACTIVE',
    },
  });

  return { admin, user, court };
}
