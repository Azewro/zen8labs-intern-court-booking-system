/**
 * bookings.e2e-spec.ts
 * Integration test cho Booking endpoints.
 * Bao gồm: tạo booking, kiểm tra trùng lịch, hủy, xem lịch sử.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanDatabase, seedBaseData } from './test-helpers';

// Helper: Tạo ISO string ngày mai giờ X
function tomorrowAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

describe('Bookings Endpoints (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;
  let courtId: string;
  let bookingId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
    const { court } = await seedBaseData(app);
    courtId = court.id;

    // Lấy token cho user và admin
    const userRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'Test123!' });
    userToken = userRes.body.access_token;

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Test123!' });
    adminToken = adminRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================
  // POST /bookings — Tạo booking mới
  // =========================================================
  describe('POST /bookings', () => {
    it('should create booking successfully and return PENDING status', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          courtId,
          startTime: tomorrowAt(10),
          endTime: tomorrowAt(12),
          paymentMethod: 'CASH',
        })
        .expect(201);

      bookingId = res.body.booking.id;
      expect(res.body.booking.status).toBe('PENDING');
      expect(Number(res.body.booking.totalPrice)).toBe(200000); // 2h × 100k
      expect(res.body.payUrl).toBeNull(); // CASH → không có payUrl
    });

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/bookings')
        .send({ courtId, startTime: tomorrowAt(10), endTime: tomorrowAt(12), paymentMethod: 'CASH' })
        .expect(401);
    });

    it('should return 400 if time slot overlaps with existing booking', async () => {
      // Tạo booking đầu tiên
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ courtId, startTime: tomorrowAt(10), endTime: tomorrowAt(12), paymentMethod: 'CASH' })
        .expect(201);

      // Tạo booking thứ hai trùng giờ → phải bị reject
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ courtId, startTime: tomorrowAt(11), endTime: tomorrowAt(13), paymentMethod: 'CASH' })
        .expect(400);
    });

    it('should return 400 if booking is in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const end = new Date(yesterday);
      end.setHours(end.getHours() + 2);

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          courtId,
          startTime: yesterday.toISOString(),
          endTime: end.toISOString(),
          paymentMethod: 'CASH',
        })
        .expect(400);
    });

    it('should return 400 if payload is invalid (missing courtId)', async () => {
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ startTime: tomorrowAt(10), endTime: tomorrowAt(12), paymentMethod: 'CASH' })
        .expect(400);
    });
  });

  // =========================================================
  // GET /bookings/my-bookings — Lịch sử của user
  // =========================================================
  describe('GET /bookings/my-bookings', () => {
    beforeEach(async () => {
      // Tạo 1 booking để có data
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ courtId, startTime: tomorrowAt(10), endTime: tomorrowAt(12), paymentMethod: 'CASH' });
      bookingId = res.body.booking.id;
    });

    it('should return paginated list with data and meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookings/my-bookings?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/bookings/my-bookings').expect(401);
    });
  });

  // =========================================================
  // PATCH /bookings/:id/cancel — Hủy booking
  // =========================================================
  describe('PATCH /bookings/:id/cancel', () => {
    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ courtId, startTime: tomorrowAt(10), endTime: tomorrowAt(12), paymentMethod: 'CASH' });
      bookingId = res.body.booking.id;
    });

    it('should cancel booking successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
    });

    it('should return 400 if booking is already cancelled', async () => {
      // Hủy lần 1
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Hủy lần 2 → phải báo lỗi
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .expect(401);
    });
  });

  // =========================================================
  // GET /bookings — Admin xem tất cả (cần role ADMIN)
  // =========================================================
  describe('GET /bookings (Admin only)', () => {
    it('should return 403 if user is not ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return paginated bookings for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });
});
