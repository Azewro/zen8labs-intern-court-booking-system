import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Chỉ lấy những booking Đã Xác Nhận
    const bookings = await this.prisma.booking.findMany({
      where: { status: 'CONFIRMED' }
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
    const totalHours = bookings.reduce((sum, b) => {
      const diffMs = b.endTime.getTime() - b.startTime.getTime();
      return sum + (diffMs / (1000 * 60 * 60));
    }, 0);

    // 2. Thống kê Tháng này
    const thisMonthBookings = bookings.filter(b => b.startTime >= startOfMonth);
    const thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
    const thisMonthHours = thisMonthBookings.reduce((sum, b) => {
      const diffMs = b.endTime.getTime() - b.startTime.getTime();
      return sum + (diffMs / (1000 * 60 * 60));
    }, 0);

    // 3. Tỉ lệ lấp đầy (Giả sử 1 ngày mở cửa 16 tiếng, từ 6h-22h)
    const activeCourts = await this.prisma.court.count({ where: { status: 'ACTIVE' } });
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalCapacityHours = activeCourts * 16 * daysInMonth;
    const occupancyRate = totalCapacityHours > 0 ? (thisMonthHours / totalCapacityHours) * 100 : 0;

    // 4. Doanh thu theo từng sân
    const revenueByCourtRaw = await this.prisma.booking.groupBy({
      by: ['courtId'],
      where: { status: 'CONFIRMED' },
      _sum: { totalPrice: true },
      _count: { id: true }
    });

    const courts = await this.prisma.court.findMany();
    const revenueByCourt = revenueByCourtRaw.map(r => ({
      courtName: courts.find(c => c.id === r.courtId)?.name || 'Sân đã bị xóa',
      revenue: Number(r._sum.totalPrice) || 0,
      totalBookings: r._count.id
    })).sort((a, b) => b.revenue - a.revenue); // Xếp theo doanh thu giảm dần

    return {
      totalRevenue,
      totalHours,
      thisMonthRevenue,
      thisMonthHours,
      occupancyRate: Number(occupancyRate.toFixed(2)),
      revenueByCourt,
      totalBookings: bookings.length,
      thisMonthTotalBookings: thisMonthBookings.length
    };
  }
}
