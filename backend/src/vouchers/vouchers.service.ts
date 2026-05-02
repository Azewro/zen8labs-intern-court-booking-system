import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVoucherDto) {
    const existing = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException('Mã voucher đã tồn tại');

    return this.prisma.voucher.create({
      data: {
        code: dto.code.toUpperCase(),
        discountPercent: dto.discountPercent,
        maxDiscount: dto.maxDiscount,
        validTo: new Date(dto.validTo)
      }
    });
  }

  findAll() {
    return this.prisma.voucher.findMany({
      orderBy: { validFrom: 'desc' }
    });
  }

  async toggleStatus(id: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new BadRequestException('Voucher không tồn tại');

    return this.prisma.voucher.update({
      where: { id },
      data: { isActive: !voucher.isActive }
    });
  }
}
