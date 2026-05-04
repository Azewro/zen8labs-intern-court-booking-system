import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  // Tiêu chí 7: Lấy danh sách booking của 1 sân trong 1 ngày (để frontend khóa giờ)
  async getCourtSchedule(courtId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { startTime: true, endTime: true, status: true },
    });
    
    return bookings;
  }

  // Đặt sân với Khung giá động, Voucher, Thanh toán và Gửi Email
  async create(userId: string, dto: CreateBookingDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const now = new Date();

    if (start < now) throw new BadRequestException('Không thể đặt sân trong quá khứ.');
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    if (start > maxDate) throw new BadRequestException('Chỉ được đặt sân trước tối đa 14 ngày.');

    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours < 1 || durationHours > 4) {
      throw new BadRequestException('Thời gian đặt mỗi lượt phải từ 1 đến 4 tiếng.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra Sân
      const court = await tx.court.findUnique({ where: { id: dto.courtId } });
      if (!court || court.deletedAt) throw new NotFoundException('Sân không tồn tại hoặc đã đóng cửa.');
      if (court.status === 'SUSPENDED') throw new BadRequestException('Sân này đang tạm ngừng nhận đặt lịch.');
      if (court.status === 'CLOSED') throw new BadRequestException('Sân này đã đóng cửa vĩnh viễn.');

      // 2. Chống Double Booking
      const overlappingBookings = await tx.booking.findMany({
        where: {
          courtId: dto.courtId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }]
        }
      });
      if (overlappingBookings.length > 0) throw new BadRequestException('Khoảng thời gian này đã có người đặt.');

      // 3. Tính tiền theo khung giờ động (Dynamic Pricing)
      let calculatedPrice = 0;
      let currentCheckTime = new Date(start);
      
      while (currentCheckTime < end) {
        const hour = currentCheckTime.getHours();
        // Nếu có cấu hình giờ cao điểm và giờ hiện tại nằm trong khung đó
        if (court.peakStartHour != null && court.peakEndHour != null && court.peakPricePerHour != null) {
          if (hour >= court.peakStartHour && hour < court.peakEndHour) {
            calculatedPrice += Number(court.peakPricePerHour) * 0.5; // Tính mỗi 30 phút (0.5h) cho chính xác
          } else {
            calculatedPrice += Number(court.pricePerHour) * 0.5;
          }
        } else {
          calculatedPrice += Number(court.pricePerHour) * 0.5;
        }
        currentCheckTime.setMinutes(currentCheckTime.getMinutes() + 30); // Tăng từng 30 phút
      }

      // 4. Xử lý Voucher
      let appliedVoucherId = null;
      if (dto.voucherCode) {
        const normalizedCode = dto.voucherCode.trim().toUpperCase();
        console.log(`[DEBUG] Searching for voucher: "${normalizedCode}"`);
        const voucher = await tx.voucher.findFirst({ 
          where: { 
            code: {
              equals: normalizedCode,
              mode: 'insensitive'
            }
          } 
        });
        if (!voucher) {
          console.log(`[DEBUG] Voucher "${normalizedCode}" NOT FOUND in DB.`);
          throw new NotFoundException(`Mã voucher "${normalizedCode}" không tồn tại trên hệ thống.`);
        }
        console.log(`[DEBUG] Voucher found: ${voucher.code} (ID: ${voucher.id})`);
        if (!voucher.isActive) throw new BadRequestException('Mã voucher đã bị vô hiệu hóa.');
        if (voucher.validTo < now) throw new BadRequestException('Mã voucher đã hết hạn.');
        
        let discount = calculatedPrice * (voucher.discountPercent / 100);
        if (voucher.maxDiscount && discount > Number(voucher.maxDiscount)) {
          discount = Number(voucher.maxDiscount);
        }
        calculatedPrice -= discount;
        appliedVoucherId = voucher.id;
      }

      // 5. Xác định phương thức & trạng thái thanh toán (Giả lập)
      const pMethod = dto.paymentMethod || 'CASH';
      const pStatus = pMethod === 'ONLINE' ? 'PAID' : 'UNPAID';

      // 6. Lưu Booking
      const booking = await tx.booking.create({
        data: {
          userId,
          courtId: dto.courtId,
          startTime: start,
          endTime: end,
          totalPrice: Math.round(calculatedPrice),
          status: 'PENDING',
          paymentStatus: pStatus,
          paymentMethod: pMethod,
          voucherId: appliedVoucherId,
        },
        include: { user: true, court: true }
      });

      return booking;
    });

    // 7. Gửi Email thông báo không block luồng chính
    this.mailService.sendBookingConfirmation({
      to: result.user.email,
      customerName: result.user.fullName,
      courtName: result.court.name,
      startTime: result.startTime,
      endTime: result.endTime,
      totalPrice: Number(result.totalPrice),
      paymentMethod: result.paymentMethod,
      paymentStatus: result.paymentStatus,
    });

    return result;
  }

  // Hàm chuyên biệt để tính giá (Preview) cho Frontend
  async calculatePrice(dto: CreateBookingDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const now = new Date();

    if (start < now) throw new BadRequestException('Không thể đặt sân trong quá khứ.');

    const court = await this.prisma.court.findUnique({ where: { id: dto.courtId } });
    if (!court || court.deletedAt) throw new NotFoundException('Sân không tồn tại hoặc đã đóng cửa.');

    let originalPrice = 0;
    let calculatedPrice = 0;
    let currentCheckTime = new Date(start);
    
    while (currentCheckTime < end) {
      const hour = currentCheckTime.getHours();
      originalPrice += Number(court.pricePerHour) * 0.5;

      if (court.peakStartHour != null && court.peakEndHour != null && court.peakPricePerHour != null) {
        if (hour >= court.peakStartHour && hour < court.peakEndHour) {
          calculatedPrice += Number(court.peakPricePerHour) * 0.5;
        } else {
          calculatedPrice += Number(court.pricePerHour) * 0.5;
        }
      } else {
        calculatedPrice += Number(court.pricePerHour) * 0.5;
      }
      currentCheckTime.setMinutes(currentCheckTime.getMinutes() + 30);
    }

    let discountAmount = 0;
    let voucherError = null;
    let appliedVoucherId = null;

    if (dto.voucherCode) {
      const normalizedCode = dto.voucherCode.trim().toUpperCase();
      const voucher = await this.prisma.voucher.findFirst({ 
        where: { code: { equals: normalizedCode, mode: 'insensitive' } } 
      });
      
      if (!voucher) {
        voucherError = `Mã voucher "${normalizedCode}" không tồn tại.`;
      } else if (!voucher.isActive) {
        voucherError = 'Mã voucher đã bị vô hiệu hóa.';
      } else if (voucher.validTo < now) {
        voucherError = 'Mã voucher đã hết hạn.';
      } else {
        discountAmount = calculatedPrice * (voucher.discountPercent / 100);
        if (voucher.maxDiscount && discountAmount > Number(voucher.maxDiscount)) {
          discountAmount = Number(voucher.maxDiscount);
        }
        appliedVoucherId = voucher.id;
      }
    }

    const finalPrice = Math.max(0, calculatedPrice - discountAmount);

    return {
      originalPrice,
      calculatedPrice,
      discountAmount,
      finalPrice: Math.round(finalPrice), // Làm tròn tránh số thập phân dư
      voucherError,
      appliedVoucherId
    };
  }

  // Tiêu chí 10: Xem lịch sử đặt sân của bản thân
  async getMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        court: { select: { name: true, location: true, imageUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Tiêu chí 9: Hủy sân
  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    
    if (!booking) {
      throw new NotFoundException('Không tìm thấy phiếu đặt sân.');
    }

    // Bảo mật: Xác thực chủ sở hữu
    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy phiếu đặt sân của người khác.');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Phiếu đặt sân này đã bị hủy từ trước.');
    }

    // Ràng buộc hủy: Phải trước 2 tiếng
    const now = new Date();
    const hoursDifference = (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 2) {
      throw new BadRequestException('Chỉ có thể hủy sân trước giờ đá ít nhất 2 tiếng. Hiện tại đã quá trễ.');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' }
    });
  }

  // Admin Duyệt / Từ chối
  async updateBookingStatus(bookingId: string, status: 'CONFIRMED' | 'CANCELLED') {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Không tìm thấy phiếu đặt sân');
    
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Phiếu đặt sân này đã bị hủy, không thể thay đổi trạng thái nữa.');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });
  }

  async findAllForAdmin(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { court: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } }
      ];
    }
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    // Mapping sort key cho Prisma
    let orderBy: any = { [sortBy]: sortOrder };
    if (sortBy === 'user.fullName') orderBy = { user: { fullName: sortOrder } };
    if (sortBy === 'court.name') orderBy = { court: { name: sortOrder } };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereClause,
        skip,
        take: Number(limit),
        include: {
          court: { select: { name: true } },
          user: { select: { email: true, fullName: true } }
        },
        orderBy
      }),
      this.prisma.booking.count({ where: whereClause })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }
}
