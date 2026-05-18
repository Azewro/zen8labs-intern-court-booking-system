/**
 * app.e2e-spec.ts
 * Smoke test cơ bản — Kiểm tra app khởi động được.
 * Không test logic, chỉ đảm bảo NestJS bootstrap thành công.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, cleanDatabase } from './test-helpers';

describe('Application Bootstrap (smoke test)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should have the app running (GET /courts returns 200)', async () => {
    // /courts là public endpoint → không cần auth → test app khởi động OK
    const res = await request(app.getHttpServer())
      .get('/courts')
      .expect(200);

    expect(res.body).toHaveProperty('data');
  });
});
