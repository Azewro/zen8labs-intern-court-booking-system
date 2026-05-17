import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

// Mock PaymentsService và uuid để tránh lỗi ESM trong Jest
jest.mock('../payments/payments.service');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { PaymentsService } from '../payments/payments.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let prismaService: any;
  let mailService: any;
  let paymentsService: any;

  beforeEach(async () => {
    prismaService = {
      court: { findUnique: jest.fn() },
      booking: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      voucher: { findFirst: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prismaService)),
    };

    mailService = {
      sendBookingConfirmation: jest.fn().mockResolvedValue(true),
    };

    paymentsService = {
      createZaloPayOrder: jest.fn().mockResolvedValue({ payUrl: 'http://pay.vn' }),
      refundPayment: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MailService, useValue: mailService },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create (Tạo Booking mới)', () => {
    const userId = 'user-123';
    const courtId = 'court-123';

    // Tạo mốc thời gian ngày mai để test (không bị lỗi "đặt trong quá khứ")
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM ngày mai

    const endTomorrow = new Date(tomorrow);
    endTomorrow.setHours(12, 0, 0, 0); // 12:00 PM ngày mai (2 tiếng)

    const defaultDto = {
      courtId,
      startTime: tomorrow.toISOString(),
      endTime: endTomorrow.toISOString(),
      paymentMethod: 'CASH' as const,
    };

    const mockCourt = {
      id: courtId,
      name: 'Sân 1',
      status: 'ACTIVE',
      pricePerHour: 100000,
      deletedAt: null,
    };

    it('should create booking successfully when no overlap', async () => {
      // Arrange
      prismaService.court.findUnique.mockResolvedValue(mockCourt);
      prismaService.booking.findMany.mockResolvedValue([]); // Không có overlap

      const expectedBooking = {
        id: 'booking-1',
        userId,
        courtId,
        startTime: tomorrow,
        endTime: endTomorrow,
        totalPrice: 200000, // 2 tiếng * 100k
        status: 'PENDING',
        paymentMethod: 'CASH',
        paymentStatus: 'UNPAID',
        user: { email: 'test@gmail.com', fullName: 'User 1' },
        court: mockCourt,
      };

      prismaService.booking.create.mockResolvedValue(expectedBooking);

      // Act
      const result = await service.create(userId, defaultDto);

      // Assert
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.booking.findMany).toHaveBeenCalled();
      expect(prismaService.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            courtId,
            totalPrice: 200000,
            status: 'PENDING',
          }),
        }),
      );
      expect(mailService.sendBookingConfirmation).toHaveBeenCalled();
      expect(result).toEqual({ booking: expectedBooking, payUrl: null });
    });

    it('should throw BadRequestException if time slot overlaps with existing booking', async () => {
      // Arrange
      prismaService.court.findUnique.mockResolvedValue(mockCourt);
      // Giả lập DB trả về 1 booking đã tồn tại (Overlap)
      prismaService.booking.findMany.mockResolvedValue([
        { id: 'existing-booking' },
      ]);

      // Act & Assert
      await expect(service.create(userId, defaultDto)).rejects.toThrow(
        new BadRequestException('Khoảng thời gian này đã có người đặt.'),
      );

      // Đảm bảo không gọi create
      expect(prismaService.booking.create).not.toHaveBeenCalled();
      expect(mailService.sendBookingConfirmation).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if booking is in the past', async () => {
      // Arrange
      const pastStart = new Date(Date.now() - 3600000); // 1 tiếng trước
      const pastEnd = new Date(Date.now() + 3600000); // 1 tiếng sau

      const dto = {
        ...defaultDto,
        startTime: pastStart.toISOString(),
        endTime: pastEnd.toISOString(),
      };

      // Act & Assert
      await expect(service.create(userId, dto)).rejects.toThrow(
        new BadRequestException('Không thể đặt sân trong quá khứ.'),
      );
    });

    it('should throw NotFoundException if court does not exist or is deleted', async () => {
      // Arrange
      // Giả lập không tìm thấy sân
      prismaService.court.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(userId, defaultDto)).rejects.toThrow(
        new NotFoundException('Sân không tồn tại hoặc đã đóng cửa.'),
      );
    });
  });

  describe('findAllForAdmin (Lọc và Phân trang cho Admin)', () => {
    it('should filter by createdAt using +07:00 timezone', async () => {
      // Arrange
      prismaService.booking.findMany.mockResolvedValue([]);
      prismaService.booking.count.mockResolvedValue(0);
      const filterDate = '2026-05-13';

      // Act
      await service.findAllForAdmin({ filterDate });

      // Assert
      expect(prismaService.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-05-13T00:00:00.000+07:00'),
              lte: new Date('2026-05-13T23:59:59.999+07:00'),
            },
          }),
        }),
      );
    });

    it('should filter by startTime using +07:00 timezone', async () => {
      // Arrange
      prismaService.booking.findMany.mockResolvedValue([]);
      prismaService.booking.count.mockResolvedValue(0);
      const filterStartTime = '2026-05-13';

      // Act
      await service.findAllForAdmin({ filterStartTime });

      // Assert
      expect(prismaService.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: {
              gte: new Date('2026-05-13T00:00:00.000+07:00'),
              lte: new Date('2026-05-13T23:59:59.999+07:00'),
            },
          }),
        }),
      );
    });

    it('should apply pagination and search', async () => {
      // Arrange
      prismaService.booking.findMany.mockResolvedValue([]);
      prismaService.booking.count.mockResolvedValue(0);

      // Act
      await service.findAllForAdmin({ page: 2, limit: 5, search: 'miku' });

      // Assert
      expect(prismaService.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ user: { email: { contains: 'miku', mode: 'insensitive' } } }),
            ]),
          }),
        }),
      );
    });
  });

  // ===========================================================
  // cancel()
  // ===========================================================
  describe('cancel (Hủy Booking)', () => {
    const userId = 'user-123';
    const bookingId = 'booking-abc';

    it('should cancel booking successfully when 3+ hours before start', async () => {
      prismaService.booking.findUnique.mockResolvedValue({
        id: bookingId, userId, status: 'CONFIRMED',
        startTime: new Date(Date.now() + 3 * 3600 * 1000),
        paymentMethod: 'CASH', paymentStatus: 'UNPAID',
      });
      prismaService.booking.update.mockResolvedValue({ status: 'CANCELLED' });

      await service.cancel(userId, bookingId);

      expect(prismaService.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });

    it('should call refundPayment when payment is ONLINE + PAID', async () => {
      prismaService.booking.findUnique.mockResolvedValue({
        id: bookingId, userId, status: 'CONFIRMED',
        startTime: new Date(Date.now() + 3 * 3600 * 1000),
        paymentMethod: 'ONLINE', paymentStatus: 'PAID',
      });
      prismaService.booking.update.mockResolvedValue({ status: 'CANCELLED' });

      await service.cancel(userId, bookingId);

      expect(paymentsService.refundPayment).toHaveBeenCalledWith(bookingId);
    });

    it('should throw NotFoundException if booking not found', async () => {
      prismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.cancel(userId, bookingId))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prismaService.booking.findUnique.mockResolvedValue({
        id: bookingId, userId: 'other-user', status: 'CONFIRMED',
        startTime: new Date(Date.now() + 5 * 3600 * 1000),
      });

      await expect(service.cancel(userId, bookingId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already CANCELLED', async () => {
      prismaService.booking.findUnique.mockResolvedValue({
        id: bookingId, userId, status: 'CANCELLED',
        startTime: new Date(Date.now() + 5 * 3600 * 1000),
      });

      await expect(service.cancel(userId, bookingId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if less than 2 hours before start', async () => {
      prismaService.booking.findUnique.mockResolvedValue({
        id: bookingId, userId, status: 'CONFIRMED',
        startTime: new Date(Date.now() + 1 * 3600 * 1000), // chỉ 1 tiếng nữa
        paymentMethod: 'CASH', paymentStatus: 'UNPAID',
      });

      await expect(service.cancel(userId, bookingId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================
  // calculatePrice()
  // ===========================================================
  describe('calculatePrice (Tính giá Preview)', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const endTomorrow = new Date(tomorrow);
    endTomorrow.setHours(12, 0, 0, 0); // 2 tiếng

    const baseDto = {
      courtId: 'court-1',
      startTime: tomorrow.toISOString(),
      endTime: endTomorrow.toISOString(),
      paymentMethod: 'CASH' as const,
    };

    const mockCourt = {
      id: 'court-1', status: 'ACTIVE', deletedAt: null,
      pricePerHour: 100000,
      peakStartHour: 17, peakEndHour: 21, peakPricePerHour: 150000,
    };

    it('should calculate normal price correctly (2h × 100k = 200k)', async () => {
      prismaService.court.findUnique.mockResolvedValue(mockCourt);
      prismaService.voucher.findFirst.mockResolvedValue(null);

      const result = await service.calculatePrice(baseDto);

      expect(result.calculatedPrice).toBe(200000);
      expect(result.discountAmount).toBe(0);
      expect(result.finalPrice).toBe(200000);
      expect(result.voucherError).toBeNull();
    });

    it('should apply voucher discount correctly', async () => {
      prismaService.court.findUnique.mockResolvedValue(mockCourt);
      prismaService.voucher.findFirst.mockResolvedValue({
        id: 'v1', code: 'SUMMER10', isActive: true,
        validTo: new Date(Date.now() + 86400000), // còn hạn
        discountPercent: 10, maxDiscount: null,
      });

      const result = await service.calculatePrice({ ...baseDto, voucherCode: 'SUMMER10' });

      expect(result.discountAmount).toBe(20000); // 10% của 200k
      expect(result.finalPrice).toBe(180000);
    });

    it('should return voucherError if voucher is expired', async () => {
      prismaService.court.findUnique.mockResolvedValue(mockCourt);
      prismaService.voucher.findFirst.mockResolvedValue({
        id: 'v2', code: 'OLD', isActive: true,
        validTo: new Date(Date.now() - 1000), // đã hết hạn
        discountPercent: 20, maxDiscount: null,
      });

      const result = await service.calculatePrice({ ...baseDto, voucherCode: 'OLD' });

      expect(result.voucherError).toBe('Mã voucher đã hết hạn.');
      expect(result.discountAmount).toBe(0);
    });
  });

  // ===========================================================
  // updateBookingStatus()
  // ===========================================================
  describe('updateBookingStatus (Admin Duyệt / Từ chối)', () => {
    it('should update status to CONFIRMED successfully', async () => {
      prismaService.booking.findUnique.mockResolvedValue({ id: 'b1', status: 'PENDING' });
      prismaService.booking.update.mockResolvedValue({ id: 'b1', status: 'CONFIRMED' });

      const result = await service.updateBookingStatus('b1', 'CONFIRMED');

      expect(prismaService.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CONFIRMED' } }),
      );
      expect(result.status).toBe('CONFIRMED');
    });

    it('should throw BadRequestException if booking is already CANCELLED', async () => {
      prismaService.booking.findUnique.mockResolvedValue({ id: 'b1', status: 'CANCELLED' });

      await expect(service.updateBookingStatus('b1', 'CONFIRMED'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
