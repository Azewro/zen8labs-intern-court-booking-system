import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Bắt đầu dọn dẹp và Seed Data...');

  // 1. Dọn dẹp dữ liệu rác cũ (Để tránh tạo trùng lặp khi chạy lệnh nhiều lần)
  await prisma.booking.deleteMany();
  await prisma.court.deleteMany();
  console.log('🧹 Đã dọn dẹp dữ liệu Sân và Booking cũ.');

  // 2. Tạo Admin
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'hatsunemikudangyeu06102004@gmail.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'hatsunemikudangyeu06102004@gmail.com',
      password: adminPassword,
      fullName: 'Super Admin',
      role: 'ADMIN',
    },
  });
  console.log('✅ Đã cấp quyền ADMIN cho: hatsunemikudangyeu06102004@gmail.com');

  // 3. Tạo User Khách
  const userPassword = await bcrypt.hash('User@123', 10);
  const user1 = await prisma.user.upsert({
    where: { email: 'heronguyen0610@gmail.com' },
    update: { role: 'USER' },
    create: {
      email: 'heronguyen0610@gmail.com',
      password: userPassword,
      fullName: 'Hero Nguyen',
      role: 'USER',
    },
  });
  
  const user2 = await prisma.user.upsert({
    where: { email: 'khachhang2@gmail.com' },
    update: { role: 'USER' },
    create: {
      email: 'khachhang2@gmail.com',
      password: userPassword,
      fullName: 'Khách Hàng Clone',
      role: 'USER',
    },
  });
  console.log('✅ Đã khởi tạo 2 tài khoản Khách hàng mẫu.');

  // 4. Tạo Sân Cầu Lông (Courts)
  const courtsData = [
    { name: 'Sân VIP 1 (Thảm Yonex)', location: 'Tầng 1, Nhà thi đấu Zen8', pricePerHour: 150000, description: 'Sân thảm chất lượng cao, ánh sáng chuẩn, có điều hòa mát mẻ.', imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' },
    { name: 'Sân VIP 2 (Thảm Victor)', location: 'Tầng 1, Nhà thi đấu Zen8', pricePerHour: 150000, description: 'Sân đạt chuẩn thi đấu quốc tế BWF.', imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' },
    { name: 'Sân Tiêu chuẩn 1', location: 'Tầng 2, Khu B', pricePerHour: 80000, description: 'Sân tiêu chuẩn cho người mới chơi hoặc tập phong trào.', imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' },
    { name: 'Sân Tiêu chuẩn 2', location: 'Tầng 2, Khu B', pricePerHour: 80000, description: 'Sân tiêu chuẩn, thoáng mát.', imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' },
    { name: 'Sân Tập Luyện (Có máy bắn cầu)', location: 'Tầng 3', pricePerHour: 100000, description: 'Trang bị sẵn máy bắn cầu tự động cho anh em tập phản xạ.', imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' },
  ];

  const createdCourts = [];
  for (const c of courtsData) {
    const court = await prisma.court.create({ data: c });
    createdCourts.push(court);
  }
  console.log(`✅ Đã tạo thành công ${createdCourts.length} sân cầu lông xịn xò.`);

  // 5. Tạo Bookings Mẫu
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const bookingsData = [
    // Lịch hôm nay của Khách 1 (Hero Nguyen) tại Sân VIP 1 (18:00 - 20:00)
    { userId: user1.id, courtId: createdCourts[0].id, startTime: new Date(today.setHours(18, 0, 0, 0)), endTime: new Date(today.setHours(20, 0, 0, 0)), totalPrice: 300000, status: 'CONFIRMED' as any },
    // Lịch hôm nay của Khách 2 tại Sân VIP 1 (20:00 - 21:30) (Nối tiếp luôn)
    { userId: user2.id, courtId: createdCourts[0].id, startTime: new Date(today.setHours(20, 0, 0, 0)), endTime: new Date(today.setHours(21, 30, 0, 0)), totalPrice: 225000, status: 'PENDING' as any },
    // Lịch ngày mai của Khách 1 tại Sân Thường 1 (19:00 - 21:00)
    { userId: user1.id, courtId: createdCourts[2].id, startTime: new Date(tomorrow.setHours(19, 0, 0, 0)), endTime: new Date(tomorrow.setHours(21, 0, 0, 0)), totalPrice: 160000, status: 'CONFIRMED' as any },
    // Một lịch đã bị hủy của Khách 2 tại Sân Thường 2 (14:00 - 16:00)
    { userId: user2.id, courtId: createdCourts[3].id, startTime: new Date(tomorrow.setHours(14, 0, 0, 0)), endTime: new Date(tomorrow.setHours(16, 0, 0, 0)), totalPrice: 160000, status: 'CANCELLED' as any },
  ];

  for (const b of bookingsData) {
    await prisma.booking.create({ data: b });
  }
  
  console.log(`✅ Đã rải sẵn ${bookingsData.length} lịch đặt sân mẫu vào các giờ Vàng.`);
  console.log('🎉 Hoàn tất quá trình Seed Database!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
