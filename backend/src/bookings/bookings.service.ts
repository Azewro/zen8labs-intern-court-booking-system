import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

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

  // Tiêu chí 8: Đặt sân (Có chống trùng lịch bằng Transaction)
  async create(userId: string, dto: CreateBookingDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const now = new Date();

    // Ràng buộc 1: Không đặt quá khứ
    if (start < now) {
      throw new BadRequestException('Không thể đặt sân trong quá khứ.');
    }

    // Ràng buộc 2: Tối đa 14 ngày tới
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    if (start > maxDate) {
      throw new BadRequestException('Chỉ được đặt sân trước tối đa 14 ngày.');
    }

    // Ràng buộc 3: Thời lượng 1-4 tiếng
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours < 1 || durationHours > 4) {
      throw new BadRequestException('Thời gian đặt mỗi lượt phải từ 1 đến 4 tiếng.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Lấy thông tin sân để tính tiền và kiểm tra trạng thái
      const court = await tx.court.findUnique({ where: { id: dto.courtId } });
      if (!court || court.deletedAt) {
        throw new NotFoundException('Sân không tồn tại hoặc đã đóng cửa.');
      }
      if (court.status === 'SUSPENDED') {
        throw new BadRequestException('Sân này đang tạm ngừng nhận đặt lịch. Vui lòng chọn sân khác.');
      }
      if (court.status === 'CLOSED') {
        throw new BadRequestException('Sân này đã đóng cửa vĩnh viễn.');
      }

      // 2. Chống Double Booking (Thuật toán Overlap: S_new < E_old AND E_new > S_old)
      const overlappingBookings = await tx.booking.findMany({
        where: {
          courtId: dto.courtId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          AND: [
            { startTime: { lt: end } },
            { endTime: { gt: start } }
          ]
        }
      });

      if (overlappingBookings.length > 0) {
        throw new BadRequestException('Rất tiếc! Khoảng thời gian này vừa có người nhanh tay đặt mất rồi.');
      }

      // 3. Tính tiền tự động ở Backend
      const totalPrice = Number(court.pricePerHour) * durationHours;

      // 4. Lưu vào Database
      return await tx.booking.create({
        data: {
          userId,
          courtId: dto.courtId,
          startTime: start,
          endTime: end,
          totalPrice,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
        }
      });
    });
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

  // Cải tiến: Admin lấy danh sách toàn bộ Bookings (Có phân trang, search theo tên sân hoặc email khách)
  async findAllForAdmin(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { court: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          court: { select: { name: true } },
          user: { select: { email: true, fullName: true } }
        },
        orderBy: { createdAt: 'desc' }
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
