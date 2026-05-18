/**
 * analytics.e2e-spec.ts
 * Integration tests for Analytics endpoints.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanDatabase, seedBaseData } from './test-helpers';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Analytics Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(app);
    await seedBaseData(app);

    // Get Admin Token
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Test123!' });
    adminToken = adminRes.body.access_token;

    // Get User Token
    const userRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'Test123!' });
    userToken = userRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /analytics/dashboard', () => {
    it('should return empty stats structure when there are no bookings', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('overview');
      expect(res.body).toHaveProperty('charts');
      expect(res.body).toHaveProperty('topUsers');

      expect(res.body.overview.totalRevenue).toBe(0);
      expect(res.body.overview.totalHours).toBe(0);
      expect(res.body.overview.totalBookings).toBe(0);
      expect(res.body.overview.occupancyRate).toBe(0);
      expect(res.body.topUsers).toEqual([]);
    });

    it('should calculate revenue and hours correctly for CONFIRMED bookings', async () => {
      // 1. Get court id
      const court = await prisma.court.findFirst();
      const user = await prisma.user.findFirst({ where: { email: 'user@test.com' } });

      expect(court).toBeDefined();
      expect(user).toBeDefined();

      const today = new Date();
      const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);
      const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0); // 2 hours

      // Create a confirmed booking
      await prisma.booking.create({
        data: {
          courtId: court!.id,
          userId: user!.id,
          startTime,
          endTime,
          totalPrice: 200000,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      });

      // Create a pending booking (should not be counted in revenue/hours)
      await prisma.booking.create({
        data: {
          courtId: court!.id,
          userId: user!.id,
          startTime: new Date(startTime.getTime() + 24 * 3600 * 1000),
          endTime: new Date(endTime.getTime() + 24 * 3600 * 1000),
          totalPrice: 300000,
          paymentMethod: 'CASH',
          paymentStatus: 'UNPAID',
          status: 'PENDING',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify overview stats
      expect(res.body.overview.totalRevenue).toBe(200000);
      expect(res.body.overview.totalHours).toBe(2);
      expect(res.body.overview.totalBookings).toBe(1);

      // Verify topUsers
      expect(res.body.topUsers.length).toBe(1);
      expect(res.body.topUsers[0].email).toBe('user@test.com');
      expect(res.body.topUsers[0].revenue).toBe(200000);
      expect(res.body.topUsers[0].bookings).toBe(1);
    });

    it('should respect dateRange=7days query parameter', async () => {
      const court = await prisma.court.findFirst();
      const user = await prisma.user.findFirst({ where: { email: 'user@test.com' } });

      const now = new Date();

      // Booking 5 days ago (within 7 days)
      const recentTime = new Date(now.getTime() - 5 * 24 * 3600 * 1000);
      await prisma.booking.create({
        data: {
          courtId: court!.id,
          userId: user!.id,
          startTime: recentTime,
          endTime: new Date(recentTime.getTime() + 2 * 3600 * 1000),
          totalPrice: 150000,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      });

      // Booking 10 days ago (outside 7 days)
      const oldTime = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
      await prisma.booking.create({
        data: {
          courtId: court!.id,
          userId: user!.id,
          startTime: oldTime,
          endTime: new Date(oldTime.getTime() + 2 * 3600 * 1000),
          totalPrice: 250000,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/analytics/dashboard?dateRange=7days')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.overview.totalRevenue).toBe(150000);
      expect(res.body.overview.totalBookings).toBe(1);
    });

    it('should restrict access to ADMIN only', async () => {
      // 1. Regular User gets 403
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // 2. Unauthenticated user gets 401
      await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .expect(401);
    });
  });
});
