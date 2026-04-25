import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';

@Injectable()
export class CourtsService {
  constructor(private prisma: PrismaService) {}

  // Tiêu chí 3: Tạo sân
  async create(createCourtDto: CreateCourtDto) {
    return this.prisma.court.create({
      data: createCourtDto,
    });
  }

  // Tiêu chí 6: Xem danh sách sân (Có Pagination & Filter & Cả Sân Bị Xóa)
  async findAll(page: number = 1, limit: number = 10, search?: string, isDeleted: boolean = false) {
    const skip = (page - 1) * limit;
    
    // Nền tảng: Nếu isDeleted = true thì lấy sân đã xóa, ngược lại lấy sân đang hoạt động
    const whereClause: any = {
      deletedAt: isDeleted ? { not: null } : null,
    };

    // Filter theo Tên hoặc Vị trí
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Chạy song song 2 lệnh: Lấy dữ liệu và Đếm tổng số lượng (Tối ưu hiệu năng)
    const [data, total] = await Promise.all([
      this.prisma.court.findMany({
        where: whereClause,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.court.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const court = await this.prisma.court.findFirst({
      where: { id, deletedAt: null },
    });
    if (!court) throw new NotFoundException('Không tìm thấy sân này hoặc đã bị xóa');
    return court;
  }

  // Tiêu chí 4: Sửa sân
  async update(id: string, updateCourtDto: UpdateCourtDto) {
    await this.findOne(id); // Kiểm tra xem sân có tồn tại không
    return this.prisma.court.update({
      where: { id },
      data: updateCourtDto,
    });
  }

  // Tiêu chí 5: Xóa sân (Soft Delete)
  async softDelete(id: string) {
    await this.findOne(id); // Phải tồn tại mới cho xóa
    return this.prisma.court.update({
      where: { id },
      data: { deletedAt: new Date() }, // Gắn mác ngày xóa thay vì xóa cứng
    });
  }

  // Tính năng ẩn (Điểm cộng): Khôi phục sân đã xóa
  async restore(id: string) {
    const court = await this.prisma.court.findUnique({ where: { id } });
    if (!court) throw new NotFoundException('Không tìm thấy sân trong Database');
    return this.prisma.court.update({
      where: { id },
      data: { deletedAt: null }, // Gỡ mác ngày xóa -> Sân sống lại!
    });
  }
}
