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
    // 1. Khởi tạo mock cho PrismaService
    prismaService = {
      court: {
        findUnique: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      voucher: {
        findFirst: jest.fn(),
      },
      // Mock $transaction rất quan trọng:
      // Nó nhận 1 callback `fn` và chúng ta gọi lại `fn` với chính `prismaService`
      $transaction: jest.fn(async (fn) => {
        return fn(prismaService);
      }),
    };

    // 2. Khởi tạo mock cho MailService
    mailService = {
      sendBookingConfirmation: jest.fn().mockResolvedValue(true),
    };

    paymentsService = {
      createZaloPayOrder: jest.fn().mockResolvedValue({ payUrl: 'http://pay.vn' }),
      refundPayment: jest.fn().mockResolvedValue({ success: true }),
    };

    // 3. Tạo module test
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
});
