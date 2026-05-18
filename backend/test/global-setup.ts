/**
 * global-setup.ts
 * Chạy MỘT LẦN trước tất cả E2E test suites.
 * Nhiệm vụ: Chạy Prisma migrate deploy lên test DB.
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

export default async function globalSetup() {
  // Load .env.test để process.env.DATABASE_URL trỏ đúng DB test
  // __dirname = backend/test/, nên ../.env.test = backend/.env.test
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

  console.log('\n[E2E Setup] Applying migrations to test database...');
  console.log('[E2E Setup] DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));

  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '..'),  // backend/
      env: { ...process.env },
      stdio: 'inherit',
    });
    console.log('[E2E Setup] Migrations applied OK.\n');
  } catch (error) {
    console.error('[E2E Setup] Migration FAILED:', error);
    throw error;
  }
}
