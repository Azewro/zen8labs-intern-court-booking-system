import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(dateRange?: string) {
    const now = new Date();
    let startDate = new Date();

    if (dateRange === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else if (dateRange === 'thisYear') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // Default: thisMonth
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 1. Lấy bookings trong khoảng thời gian để tính toán
    const bookings = await this.prisma.booking.findMany({
      where: {
        startTime: { gte: startDate, lte: now },
      },
      include: {
        court: true,
        user: true,
      },
    });

    const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');

    // KPI Cards
    const totalRevenue = confirmedBookings.reduce(
      (sum, b) => sum + Number(b.totalPrice),
      0,
    );
    const totalHours = confirmedBookings.reduce(
      (sum, b) =>
        sum + (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60),
      0,
    );
    const totalBookings = confirmedBookings.length;

    // Tính occupancy rate
    const activeCourts = await this.prisma.court.count({
      where: { status: 'ACTIVE' },
    });
    const diffDays = Math.max(
      1,
      Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const totalCapacityHours = activeCourts * 16 * diffDays; // 16h/ngày
    const occupancyRate =
      totalCapacityHours > 0 ? (totalHours / totalCapacityHours) * 100 : 0;

    // --- Biểu đồ 1: Xu hướng doanh thu theo ngày ---
    const revenueByDateMap = new Map<string, number>();
    confirmedBookings.forEach((b) => {
      // Ép về giờ local Việt Nam (+7) hoặc lấy YYYY-MM-DD an toàn hơn
      const d = new Date(
        b.startTime.getTime() - b.startTime.getTimezoneOffset() * 60000,
      );
      const dateStr = d.toISOString().split('T')[0];
      revenueByDateMap.set(
        dateStr,
        (revenueByDateMap.get(dateStr) || 0) + Number(b.totalPrice),
      );
    });
    const revenueByDate = Array.from(revenueByDateMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Biểu đồ 2: Mật độ lấp đầy theo khung giờ ---
    const bookingsByHourMap = new Map<number, number>();
    for (let i = 6; i <= 21; i++) bookingsByHourMap.set(i, 0); // 6h-21h
    confirmedBookings.forEach((b) => {
      const startHour = b.startTime.getHours();
      if (bookingsByHourMap.has(startHour)) {
        bookingsByHourMap.set(startHour, bookingsByHourMap.get(startHour)! + 1);
      }
    });
    const bookingsByHour = Array.from(bookingsByHourMap.entries())
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    // --- Biểu đồ 3: Trạng thái đơn đặt ---
    const statusCounts = await this.prisma.booking.groupBy({
      by: ['status'],
      where: { startTime: { gte: startDate, lte: now } },
      _count: { id: true },
    });
    const bookingsByStatus = statusCounts.map((s) => ({
      name:
        s.status === 'CONFIRMED'
          ? 'Đã duyệt'
          : s.status === 'CANCELLED'
            ? 'Đã hủy'
            : 'Chờ duyệt',
      value: s._count.id,
    }));

    // --- Biểu đồ 4: Doanh thu theo sân ---
    const revenueByCourtMap = new Map<string, number>();
    confirmedBookings.forEach((b) => {
      const courtName = b.court?.name || 'Sân đã xóa';
      revenueByCourtMap.set(
        courtName,
        (revenueByCourtMap.get(courtName) || 0) + Number(b.totalPrice),
      );
    });
    const revenueByCourt = Array.from(revenueByCourtMap.entries())
      .map(([name, revenue]) => ({ name, value: revenue }))
      .sort((a, b) => b.value - a.value);

    // --- Top Khách hàng ---
    const topUsersMap = new Map<
      string,
      { name: string; email: string; revenue: number; bookings: number }
    >();
    confirmedBookings.forEach((b) => {
      if (!b.user) return;
      const key = b.userId;
      if (!topUsersMap.has(key)) {
        topUsersMap.set(key, {
          name: b.user.fullName,
          email: b.user.email,
          revenue: 0,
          bookings: 0,
        });
      }
      const u = topUsersMap.get(key)!;
      u.revenue += Number(b.totalPrice);
      u.bookings += 1;
    });
    const topUsers = Array.from(topUsersMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5

    return {
      overview: {
        totalRevenue,
        totalHours,
        totalBookings,
        occupancyRate: Number(occupancyRate.toFixed(2)),
      },
      charts: {
        revenueByDate,
        bookingsByHour,
        bookingsByStatus,
        revenueByCourt,
      },
      topUsers,
    };
  }
}
