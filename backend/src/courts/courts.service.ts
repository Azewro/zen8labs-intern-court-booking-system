import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';

@Injectable()
export class CourtsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(createCourtDto: CreateCourtDto) {
    return this.prisma.court.create({ data: createCourtDto });
  }

  // Lấy danh sách sân (Admin thấy tất cả, User chỉ thấy ACTIVE & SUSPENDED)
  async findAll(page: number = 1, limit: number = 10, search?: string, includeInactive: boolean = false) {
    const skip = (page - 1) * limit;

    const whereClause: any = includeInactive
      ? {} // Admin: tất cả trạng thái
      : { status: { in: ['ACTIVE', 'SUSPENDED'] }, deletedAt: null }; // User: chỉ chưa đóng vĩnh viễn

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.court.findMany({ where: whereClause, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.court.count({ where: whereClause }),
    ]);

    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const court = await this.prisma.court.findFirst({ where: { id, deletedAt: null } });
    if (!court) throw new NotFoundException('Không tìm thấy sân này hoặc đã bị đóng vĩnh viễn');
    return court;
  }

  async update(id: string, updateCourtDto: UpdateCourtDto) {
    await this.findOne(id);
    return this.prisma.court.update({ where: { id }, data: updateCourtDto });
  }

  // ============================================================
  // Lấy chi tiết booking bị ảnh hưởng, phân loại theo mức độ
  // ============================================================
  async getAffectedBookingsDetail(id: string) {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        courtId: id,
        startTime: { gt: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        user: { select: { email: true, fullName: true, phoneNumber: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Phân loại
    const urgent: typeof bookings = [];
    const vip: typeof bookings = [];
    const normal: typeof bookings = [];

    for (const b of bookings) {
      const durationHours = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000;
      const isSoon = new Date(b.startTime) <= in24h;
      const isVip = durationHours >= 3;

      if (isSoon) urgent.push(b);
      else if (isVip) vip.push(b);
      else normal.push(b);
    }

    return { urgent, vip, normal, total: bookings.length };
  }

  // ============================================================
  // SUSPEND: Tạm ngừng - không cho đặt mới, giữ nguyên booking cũ
  // ============================================================
  async suspend(id: string) {
    const court = await this.findOne(id);
    if (court.status === 'SUSPENDED') throw new BadRequestException('Sân này đã đang ở trạng thái tạm ngừng.');
    if (court.status === 'CLOSED') throw new BadRequestException('Sân này đã đóng vĩnh viễn, không thể tạm ngừng.');

    return this.prisma.court.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
  }

  // Khôi phục sân từ SUSPENDED về ACTIVE
  async activate(id: string) {
    const court = await this.prisma.court.findFirst({ where: { id, deletedAt: null } });
    if (!court) throw new NotFoundException('Không tìm thấy sân');
    if (court.status === 'ACTIVE') throw new BadRequestException('Sân này đã đang hoạt động.');
    if (court.status === 'CLOSED') throw new BadRequestException('Sân đã đóng vĩnh viễn, không thể kích hoạt lại.');

    return this.prisma.court.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  // ============================================================
  // CLOSE: Đóng vĩnh viễn - cancel bookings + gửi mail phân loại
  // ============================================================
  async close(id: string) {
    const court = await this.findOne(id);
    if (court.status === 'CLOSED') throw new BadRequestException('Sân này đã được đóng từ trước.');

    return this.prisma.$transaction(async (tx) => {
      // 1. Đóng sân vĩnh viễn
      const closedCourt = await tx.court.update({
        where: { id },
        data: { status: 'CLOSED', deletedAt: new Date() },
      });

      // 2. Tìm booking tương lai bị ảnh hưởng
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const futureBookings = await tx.booking.findMany({
        where: {
          courtId: id,
          startTime: { gt: now },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: { user: true },
      });

      if (futureBookings.length > 0) {
        // 3. Cancel tất cả
        await tx.booking.updateMany({
          where: {
            courtId: id,
            startTime: { gt: now },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          data: { status: 'CANCELLED' },
        });

        // 4. Phân loại & Gửi mail
        for (const b of futureBookings) {
          const durationHours = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000;
          const isSoon = new Date(b.startTime) <= in24h;
          const isVip = durationHours >= 3;

          let priority: 'URGENT' | 'VIP' | 'NORMAL' = 'NORMAL';
          if (isSoon) priority = 'URGENT';
          else if (isVip) priority = 'VIP';

          await this.mailService.sendCourtClosedNotification({
            to: b.user.email,
            customerName: b.user.fullName,
            courtName: court.name,
            startTime: b.startTime,
            endTime: b.endTime,
            priority,
          });
        }
      }

      return {
        court: closedCourt,
        cancelledBookings: futureBookings.length,
      };
    });
  }

  // Giữ lại để tương thích (redirect sang close)
  async softDelete(id: string) {
    return this.close(id);
  }

  async restore(id: string) {
    return this.activate(id);
  }
}
