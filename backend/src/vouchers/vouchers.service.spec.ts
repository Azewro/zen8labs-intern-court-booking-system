import { Test, TestingModule } from '@nestjs/testing';
import { VouchersService } from './vouchers.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('VouchersService', () => {
  let service: VouchersService;
  let prismaService: any;

  const mockVoucher = {
    id: 'v-1',
    code: 'SUMMER10',
    discountPercent: 10,
    maxDiscount: 50000,
    isActive: true,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 86400000 * 30),
  };

  beforeEach(async () => {
    prismaService = {
      voucher: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VouchersService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<VouchersService>(VouchersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ===========================================================
  // create()
  // ===========================================================
  describe('create', () => {
    it('should create voucher with uppercased code', async () => {
      prismaService.voucher.findUnique.mockResolvedValue(null);
      prismaService.voucher.create.mockResolvedValue(mockVoucher);

      await service.create({
        code: 'summer10',
        discountPercent: 10,
        maxDiscount: 50000,
        validTo: new Date().toISOString(),
      } as any);

      expect(prismaService.voucher.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'SUMMER10' }),
        }),
      );
    });

    it('should throw BadRequestException if code already exists', async () => {
      prismaService.voucher.findUnique.mockResolvedValue(mockVoucher);

      await expect(
        service.create({ code: 'SUMMER10', discountPercent: 10, validTo: '' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================
  // findAll()
  // ===========================================================
  describe('findAll', () => {
    it('should return list of vouchers ordered by validFrom desc', async () => {
      prismaService.voucher.findMany.mockResolvedValue([mockVoucher]);

      const result = await service.findAll();

      expect(prismaService.voucher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { validFrom: 'desc' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ===========================================================
  // toggleStatus()
  // ===========================================================
  describe('toggleStatus', () => {
    it('should toggle isActive from true to false', async () => {
      prismaService.voucher.findUnique.mockResolvedValue({ ...mockVoucher, isActive: true });
      prismaService.voucher.update.mockResolvedValue({ ...mockVoucher, isActive: false });

      await service.toggleStatus('v-1');

      expect(prismaService.voucher.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('should toggle isActive from false to true', async () => {
      prismaService.voucher.findUnique.mockResolvedValue({ ...mockVoucher, isActive: false });
      prismaService.voucher.update.mockResolvedValue({ ...mockVoucher, isActive: true });

      await service.toggleStatus('v-1');

      expect(prismaService.voucher.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
    });

    it('should throw BadRequestException if voucher not found', async () => {
      prismaService.voucher.findUnique.mockResolvedValue(null);

      await expect(service.toggleStatus('ghost-id')).rejects.toThrow(BadRequestException);
    });
  });
});
