/**
 * global-teardown.ts
 * Chạy MỘT LẦN sau khi tất cả E2E test suites kết thúc.
 * Nhiệm vụ: Disconnect các connection pool nếu còn mở.
 */

export default async function globalTeardown() {
  console.log('\n🧹 [E2E Teardown] Cleaning up connections...');
  // Không cần làm gì đặc biệt — Prisma tự đóng connection
  // Docker test DB sẽ bị xóa khi CI chạy `docker compose down -v`
  console.log('✅ [E2E Teardown] Done.');
}
