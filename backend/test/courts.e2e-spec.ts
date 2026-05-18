/**
 * courts.e2e-spec.ts
 * Integration test cho Courts endpoints.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanDatabase, seedBaseData } from './test-helpers';

describe('Courts Endpoints (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let courtId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
    const { court } = await seedBaseData(app);
    courtId = court.id;

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'admin@test.com', password: 'Test123!' });
    adminToken = adminRes.body.access_token;

    const userRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'user@test.com', password: 'Test123!' });
    userToken = userRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================
  // GET /courts — Danh sách sân (public)
  // =========================================================
  describe('GET /courts', () => {
    it('should return court list without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/courts')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return paginated results with meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/courts?page=1&limit=5')
        .expect(200);

      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
      expect(res.body.meta.page).toBe(1);
    });
  });

  // =========================================================
  // GET /courts/:id — Chi tiết sân (public)
  // =========================================================
  describe('GET /courts/:id', () => {
    it('should return court detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/courts/${courtId}`)
        .expect(200);

      expect(res.body.id).toBe(courtId);
      expect(res.body.name).toBe('Sân Test A');
    });

    it('should return 404 if court not found', async () => {
      await request(app.getHttpServer())
        .get('/courts/non-existent-id')
        .expect(404);
    });
  });

  // =========================================================
  // POST /courts — Tạo sân (Admin only)
  // =========================================================
  describe('POST /courts', () => {
    it('should create a new court as admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/courts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sân B',
          location: 'Quận 3, HCM',
          pricePerHour: 150000,
        })
        .expect(201);

      expect(res.body.name).toBe('Sân B');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('should return 403 if user is not admin', async () => {
      await request(app.getHttpServer())
        .post('/courts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Sân C', location: 'Q4', pricePerHour: 100000 })
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/courts')
        .send({ name: 'Sân D', location: 'Q5', pricePerHour: 100000 })
        .expect(401);
    });
  });

  // =========================================================
  // PATCH /courts/:id — Cập nhật sân (Admin only)
  // =========================================================
  describe('PATCH /courts/:id', () => {
    it('should update court successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/courts/${courtId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sân A Updated' })
        .expect(200);

      expect(res.body.name).toBe('Sân A Updated');
    });

    it('should return 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/courts/${courtId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hack' })
        .expect(403);
    });
  });
});
