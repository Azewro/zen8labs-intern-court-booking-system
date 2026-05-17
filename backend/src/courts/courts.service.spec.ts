import { Test, TestingModule } from '@nestjs/testing';
import { CourtsService } from './courts.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CourtsService', () => {
  let service: CourtsService;
  let prismaService: any;
  let mailService: any;

  const mockCourt = {
    id: 'court-1',
    name: 'Sân A',
    location: 'Quận 1',
    status: 'ACTIVE',
    deletedAt: null,
    pricePerHour: 100000,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      court: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (fn) => fn(prismaService)),
    };

    mailService = {
      sendCourtClosedNotification: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<CourtsService>(CourtsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ===========================================================
  // create()
  // ===========================================================
  describe('create', () => {
    it('should create a court successfully', async () => {
      prismaService.court.create.mockResolvedValue(mockCourt);

      const result = await service.create({
        name: 'Sân A', location: 'Quận 1', pricePerHour: 100000,
      } as any);

      expect(prismaService.court.create).toHaveBeenCalled();
      expect(result.name).toBe('Sân A');
    });
  });

  // ===========================================================
  // findAll()
  // ===========================================================
  describe('findAll', () => {
    beforeEach(() => {
      prismaService.court.findMany.mockResolvedValue([mockCourt]);
      prismaService.court.count.mockResolvedValue(1);
    });

    it('should return paginated data with correct meta', async () => {
      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply correct skip for page 2', async () => {
      await service.findAll(2, 5);

      expect(prismaService.court.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should exclude CLOSED courts when includeInactive=false (user view)', async () => {
      await service.findAll(1, 10, undefined, false);

      expect(prismaService.court.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['ACTIVE', 'SUSPENDED'] },
            deletedAt: null,
          }),
        }),
      );
    });

    it('should include all courts when includeInactive=true (admin view)', async () => {
      await service.findAll(1, 10, undefined, true);

      // where clause phải là {} (không filter status)
      expect(prismaService.court.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ status: expect.anything() }) }),
      );
    });

    it('should apply search filter case-insensitively', async () => {
      await service.findAll(1, 10, 'sân a');

      expect(prismaService.court.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'sân a', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });
  });

  // ===========================================================
  // findOne()
  // ===========================================================
  describe('findOne', () => {
    it('should return court if found', async () => {
      prismaService.court.findFirst.mockResolvedValue(mockCourt);

      const result = await service.findOne('court-1');
      expect(result.id).toBe('court-1');
    });

    it('should throw NotFoundException if court not found or deleted', async () => {
      prismaService.court.findFirst.mockResolvedValue(null);

      await expect(service.findOne('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================
  // suspend()
  // ===========================================================
  describe('suspend', () => {
    it('should suspend an ACTIVE court', async () => {
      prismaService.court.findFirst.mockResolvedValue(mockCourt);
      prismaService.court.update.mockResolvedValue({ ...mockCourt, status: 'SUSPENDED' });

      const result = await service.suspend('court-1');
      expect(prismaService.court.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SUSPENDED' } }),
      );
    });

    it('should throw BadRequestException if already SUSPENDED', async () => {
      prismaService.court.findFirst.mockResolvedValue({ ...mockCourt, status: 'SUSPENDED' });

      await expect(service.suspend('court-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if court is CLOSED', async () => {
      prismaService.court.findFirst.mockResolvedValue({ ...mockCourt, status: 'CLOSED' });

      await expect(service.suspend('court-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================
  // activate()
  // ===========================================================
  describe('activate', () => {
    it('should activate a SUSPENDED court', async () => {
      prismaService.court.findFirst.mockResolvedValue({ ...mockCourt, status: 'SUSPENDED' });
      prismaService.court.update.mockResolvedValue({ ...mockCourt, status: 'ACTIVE' });

      await service.activate('court-1');
      expect(prismaService.court.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ACTIVE' } }),
      );
    });

    it('should throw BadRequestException if already ACTIVE', async () => {
      prismaService.court.findFirst.mockResolvedValue(mockCourt); // status: ACTIVE

      await expect(service.activate('court-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if court is CLOSED', async () => {
      prismaService.court.findFirst.mockResolvedValue({ ...mockCourt, status: 'CLOSED' });

      await expect(service.activate('court-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================
  // close() — Đóng vĩnh viễn, cancel bookings, gửi mail
  // ===========================================================
  describe('close', () => {
    it('should close court, cancel future bookings and send emails', async () => {
      // findOne() gọi findFirst
      prismaService.court.findFirst.mockResolvedValue(mockCourt);
      // Trong transaction: update court
      prismaService.court.update.mockResolvedValue({ ...mockCourt, status: 'CLOSED' });
      // Trong transaction: tìm booking bị ảnh hưởng
      prismaService.booking.findMany.mockResolvedValue([
        {
          id: 'b1',
          startTime: new Date(Date.now() + 10 * 3600 * 1000), // 10 tiếng nữa
          endTime: new Date(Date.now() + 11 * 3600 * 1000),
          user: { email: 'user@mail.com', fullName: 'User A' },
        },
      ]);
      prismaService.booking.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.close('court-1');

      expect(prismaService.court.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CLOSED', deletedAt: expect.any(Date) } }),
      );
      expect(prismaService.booking.updateMany).toHaveBeenCalled();
      expect(mailService.sendCourtClosedNotification).toHaveBeenCalled();
      expect(result.cancelledBookings).toBe(1);
    });

    it('should throw BadRequestException if court is already CLOSED', async () => {
      prismaService.court.findFirst.mockResolvedValue({ ...mockCourt, status: 'CLOSED' });

      await expect(service.close('court-1')).rejects.toThrow(BadRequestException);
    });
  });
});
