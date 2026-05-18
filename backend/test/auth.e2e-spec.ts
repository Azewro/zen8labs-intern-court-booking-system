/**
 * auth.e2e-spec.ts
 * Integration test cho Auth endpoints.
 * Test thật sự gọi HTTP → NestJS → DB → Response
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, cleanDatabase, seedBaseData } from './test-helpers';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================
  // POST /auth/register
  // =========================================================
  describe('POST /auth/register', () => {
    it('should register successfully and return user without password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new@test.com',
          password: 'Password123!',
          full_name: 'New User',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'new@test.com');
      expect(res.body).not.toHaveProperty('password'); // ← Không lộ password
    });

    it('should return 400 if email already exists', async () => {
      await seedBaseData(app); // admin@test.com và user@test.com đã có sẵn

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'user@test.com', password: 'Abc123!', full_name: 'Dup' })
        .expect(400);
    });

    it('should return 400 if required fields are missing (ValidationPipe)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'incomplete@test.com' }) // Thiếu password và full_name
        .expect(400);
    });
  });

  // =========================================================
  // POST /auth/login
  // =========================================================
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await seedBaseData(app);
    });

    it('should login successfully and return access_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'Test123!' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      accessToken = res.body.access_token;
    });

    it('should return 401 if email not found', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'notfound@test.com', password: 'Test123!' })
        .expect(401);
    });

    it('should return 401 if password is wrong', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'WrongPassword' })
        .expect(401);
    });
  });

  // =========================================================
  // GET /auth/me
  // =========================================================
  describe('GET /auth/me', () => {
    beforeEach(async () => {
      await seedBaseData(app);
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'Test123!' });
      accessToken = res.body.access_token;
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return user info with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe('user@test.com');
      expect(res.body).not.toHaveProperty('password');
    });
  });
});
