/**
 * vouchers.e2e-spec.ts
 * Integration test cho Vouchers endpoints.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanDatabase, seedBaseData } from './test-helpers';

describe('Vouchers Endpoints (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let voucherId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
    await seedBaseData(app);

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Test123!' });
    adminToken = adminRes.body.access_token;

    const userRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'Test123!' });
    userToken = userRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================
  // POST /vouchers — Tạo voucher (Admin only)
  // =========================================================
  describe('POST /vouchers', () => {
    it('should create voucher successfully and uppercase the code', async () => {
      const res = await request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'summer20',          // lowercase → phải được uppercase
          discountPercent: 20,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        })
        .expect(201);

      voucherId = res.body.id;
      expect(res.body.code).toBe('SUMMER20');  // ← Phải uppercase
      expect(res.body.discountPercent).toBe(20);
      expect(res.body.isActive).toBe(true);
    });

    it('should return 400 if voucher code already exists', async () => {
      // Tạo lần 1
      await request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'DUPE10',
          discountPercent: 10,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        })
        .expect(201);

      // Tạo lần 2 với cùng code → phải fail
      await request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'dupe10',     // lowercase version của DUPE10
          discountPercent: 15,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        })
        .expect(400);
    });

    it('should return 403 if user is not admin', async () => {
      await request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'HACK50', discountPercent: 50, validFrom: new Date().toISOString(), validTo: new Date().toISOString() })
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/vouchers')
        .send({ code: 'NOPE', discountPercent: 10, validFrom: new Date().toISOString(), validTo: new Date().toISOString() })
        .expect(401);
    });
  });

  // =========================================================
  // GET /vouchers — Danh sách (Admin only)
  // =========================================================
  describe('GET /vouchers', () => {
    beforeEach(async () => {
      // Tạo sẵn 1 voucher
      const res = await request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'LIST10',
          discountPercent: 10,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });
      voucherId = res.body.id;
    });

    it('should return list of vouchers for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('code');
      expect(res.body[0]).toHaveProperty('isActive');
    });

    it('should return 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .get('/vouchers')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // =========================================================
  // PATCH /vouchers/:id/toggle — Bật/Tắt (Admin only)
  // =========================================================
  describe('PATCH /vouchers/:id/toggle', () => {
    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/vouchers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TOGGLE30',
          discountPercent: 30,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });
      voucherId = res.body.id;
    });

    it('should toggle voucher from active to inactive', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/vouchers/${voucherId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);  // Từ true → false
    });

    it('should toggle voucher back to active', async () => {
      // Toggle 1: true → false
      await request(app.getHttpServer())
        .patch(`/vouchers/${voucherId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Toggle 2: false → true
      const res = await request(app.getHttpServer())
        .patch(`/vouchers/${voucherId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(true);   // Từ false → true
    });

    it('should return 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/vouchers/${voucherId}/toggle`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
