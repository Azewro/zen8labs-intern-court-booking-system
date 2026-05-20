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

  // 1. Dọn dẹp dữ liệu cũ (Theo đúng thứ tự ràng buộc khóa ngoại)
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.court.deleteMany();
  await prisma.voucher.deleteMany();
  
  // Dọn dẹp người dùng thường (giữ lại Super Admin)
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'hatsunemikudangyeu06102004@gmail.com',
      },
    },
  });

  console.log('🧹 Đã dọn dẹp sạch sẽ các bảng dữ liệu cũ.');

  // 2. Tạo / Cập nhật Super Admin
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'hatsunemikudangyeu06102004@gmail.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'hatsunemikudangyeu06102004@gmail.com',
      password: adminPasswordHash,
      fullName: 'Super Admin',
      role: 'ADMIN',
    },
  });
  console.log('✅ Đã khởi tạo Super Admin: hatsunemikudangyeu06102004@gmail.com');

  // 3. Tạo các người dùng khách hàng mẫu
  const userPasswordHash = await bcrypt.hash('User@123', 10);
  const clientEmails = [
    { email: 'heronguyen0610@gmail.com', fullName: 'Hero Nguyen' },
    { email: 'khachhang2@gmail.com', fullName: 'Khách Hàng Clone' },
    { email: 'nguyen.van.a@gmail.com', fullName: 'Nguyễn Văn A' },
    { email: 'tran.thi.b@gmail.com', fullName: 'Trần Thị B' },
    { email: 'le.van.c@gmail.com', fullName: 'Lê Văn C' },
    { email: 'pham.thi.d@gmail.com', fullName: 'Phạm Thị D' },
    { email: 'hoang.van.e@gmail.com', fullName: 'Hoàng Văn E' },
    { email: 'vu.thi.f@gmail.com', fullName: 'Vũ Thị F' },
  ];

  const createdClients = [];
  for (const c of clientEmails) {
    const client = await prisma.user.create({
      data: {
        email: c.email,
        password: userPasswordHash,
        fullName: c.fullName,
        role: 'USER',
        isActive: true,
      },
    });
    createdClients.push(client);
  }
  console.log(`✅ Đã tạo thành công ${createdClients.length} tài khoản khách hàng mẫu.`);

  // 4. Tạo các Vouchers mẫu hoạt động tốt
  const vouchersData = [
    { code: 'SUMMER10', discountPercent: 10, maxDiscount: 50000, validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    { code: 'WELCOME50', discountPercent: 15, maxDiscount: 100000, validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    { code: 'ZEN8VIP', discountPercent: 20, maxDiscount: 200000, validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  ];

  const createdVouchers = [];
  for (const v of vouchersData) {
    const voucher = await prisma.voucher.create({ data: v });
    createdVouchers.push(voucher);
  }
  console.log(`✅ Đã tạo thành công ${createdVouchers.length} mã voucher mẫu.`);

  // 5. Tạo các Sân Cầu Lông (Courts) với thông số Peak Price
  const courtsData = [
    { 
      name: 'Sân VIP 1 (Thảm Yonex)', 
      location: 'Tầng 1, Nhà thi đấu Zen8', 
      pricePerHour: 150000, 
      peakPricePerHour: 200000,
      peakStartHour: 17,
      peakEndHour: 21,
      description: 'Sân thảm chất lượng cao, ánh sáng chuẩn, có điều hòa mát mẻ.', 
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' 
    },
    { 
      name: 'Sân VIP 2 (Thảm Victor)', 
      location: 'Tầng 1, Nhà thi đấu Zen8', 
      pricePerHour: 150000, 
      peakPricePerHour: 200000,
      peakStartHour: 17,
      peakEndHour: 21,
      description: 'Sân đạt chuẩn thi đấu quốc tế BWF.', 
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' 
    },
    { 
      name: 'Sân Tiêu chuẩn 1', 
      location: 'Tầng 2, Khu B', 
      pricePerHour: 80000, 
      peakPricePerHour: 110000,
      peakStartHour: 17,
      peakEndHour: 21,
      description: 'Sân tiêu chuẩn cho người mới chơi hoặc tập phong trào.', 
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' 
    },
    { 
      name: 'Sân Tiêu chuẩn 2', 
      location: 'Tầng 2, Khu B', 
      pricePerHour: 80000, 
      peakPricePerHour: 110000,
      peakStartHour: 17,
      peakEndHour: 21,
      description: 'Sân tiêu chuẩn, thoáng mát.', 
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' 
    },
    { 
      name: 'Sân Tập Luyện (Có máy bắn cầu)', 
      location: 'Tầng 3', 
      pricePerHour: 100000, 
      peakPricePerHour: 130000,
      peakStartHour: 17,
      peakEndHour: 21,
      description: 'Trang bị sẵn máy bắn cầu tự động cho anh em tập phản xạ.', 
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80' 
    },
  ];

  const createdCourts = [];
  for (const c of courtsData) {
    const court = await prisma.court.create({ data: c });
    createdCourts.push(court);
  }
  console.log(`✅ Đã tạo thành công ${createdCourts.length} sân cầu lông.`);

  // 6. Tạo Bookings Lịch sử trong 30 ngày qua
  console.log('⏳ Đang tạo lịch đặt sân lịch sử cho 30 ngày qua...');
  
  // Danh sách các khung giờ không chồng chéo nhau trong ngày để đảm bảo tính hợp lệ của DB
  const SLOTS = [
    { startH: 8, startM: 0, endH: 10, endM: 0 },
    { startH: 10, startM: 30, endH: 12, endM: 0 },
    { startH: 13, startM: 0, endH: 15, endM: 0 },
    { startH: 15, startM: 30, endH: 17, endM: 0 },
    { startH: 17, startM: 30, endH: 19, endM: 30 }, // Giờ cao điểm
    { startH: 19, startM: 30, endH: 21, endM: 0 },  // Giờ cao điểm
  ];

  let totalBookingsSeeded = 0;

  for (let d = 0; d < 30; d++) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - d);
    targetDate.setHours(0, 0, 0, 0);

    for (const court of createdCourts) {
      // Mỗi sân trong mỗi ngày sẽ có xác suất được đặt khoảng 2-3 lượt
      // Chọn ngẫu nhiên 2 đến 3 index khung giờ không trùng nhau
      const shuffledSlots = [...SLOTS].sort(() => 0.5 - Math.random());
      const selectedSlots = shuffledSlots.slice(0, Math.floor(Math.random() * 2) + 2); // 2 hoặc 3 lượt đặt

      for (const slot of selectedSlots) {
        const start = new Date(targetDate);
        start.setHours(slot.startH, slot.startM, 0, 0);
        
        const end = new Date(targetDate);
        end.setHours(slot.endH, slot.endM, 0, 0);

        // Chọn ngẫu nhiên khách hàng
        const randomUser = createdClients[Math.floor(Math.random() * createdClients.length)];

        // Tỷ lệ phân bố trạng thái
        // 85% CONFIRMED (đã duyệt & đã thanh toán)
        // 10% CANCELLED (đã hủy)
        // 5% PENDING (chờ duyệt)
        const randStatus = Math.random();
        let status: 'CONFIRMED' | 'CANCELLED' | 'PENDING' = 'CONFIRMED';
        let paymentStatus: 'PAID' | 'UNPAID' = 'PAID';
        if (randStatus < 0.1) {
          status = 'CANCELLED';
          paymentStatus = 'UNPAID';
        } else if (randStatus < 0.15) {
          status = 'PENDING';
          paymentStatus = 'UNPAID';
        }

        // Phương thức thanh toán ngẫu nhiên
        const paymentMethod = Math.random() > 0.4 ? 'CASH' : 'ONLINE';

        // 15% cơ hội áp dụng Voucher ngẫu nhiên
        let voucherId = null;
        let appliedVoucher = null;
        if (Math.random() < 0.15) {
          appliedVoucher = createdVouchers[Math.floor(Math.random() * createdVouchers.length)];
          voucherId = appliedVoucher.id;
        }

        // Tính toán tổng số tiền
        let calculatedPrice = 0;
        const checkTime = new Date(start);
        while (checkTime < end) {
          const hour = checkTime.getHours();
          if (
            court.peakStartHour != null &&
            court.peakEndHour != null &&
            court.peakPricePerHour != null &&
            hour >= court.peakStartHour &&
            hour < court.peakEndHour
          ) {
            calculatedPrice += Number(court.peakPricePerHour) * 0.5;
          } else {
            calculatedPrice += Number(court.pricePerHour) * 0.5;
          }
          checkTime.setMinutes(checkTime.getMinutes() + 30);
        }

        // Áp dụng giảm giá từ Voucher
        if (appliedVoucher) {
          let discount = calculatedPrice * (appliedVoucher.discountPercent / 100);
          if (appliedVoucher.maxDiscount && discount > Number(appliedVoucher.maxDiscount)) {
            discount = Number(appliedVoucher.maxDiscount);
          }
          calculatedPrice -= discount;
        }

        const totalPrice = Math.round(calculatedPrice);

        // Lưu booking
        const booking = await prisma.booking.create({
          data: {
            userId: randomUser.id,
            courtId: court.id,
            voucherId,
            startTime: start,
            endTime: end,
            totalPrice,
            status,
            paymentStatus,
            paymentMethod,
            createdAt: start, // Đặt ngày tạo bằng với ngày đặt để thống kê chính xác hơn
          },
        });

        // Tạo bản ghi giao dịch thanh toán nếu là ONLINE & CONFIRMED
        if (paymentMethod === 'ONLINE' && status === 'CONFIRMED') {
          const randTxId = Math.random().toString(36).substring(2, 10).toUpperCase();
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              appTransId: `ZM_${randTxId}`,
              amount: totalPrice,
              status: 'SUCCESS',
              gateway: 'ZALOPAY',
              gatewayTransId: `ZALO_${randTxId}`,
              createdAt: start,
            },
          });
        }

        totalBookingsSeeded++;
      }
    }
  }

  console.log(`✅ Đã rải sẵn ${totalBookingsSeeded} lịch đặt sân mẫu trong vòng 30 ngày qua.`);
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
