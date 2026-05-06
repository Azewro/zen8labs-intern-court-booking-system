"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { DollarSign, Clock, CheckCircle, TrendingUp, Filter } from "lucide-react";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";

// Dynamic import với ssr:false để tránh lỗi Recharts trong Next.js SSR
const AnalyticsCharts = dynamic(() => import("./AnalyticsCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-6">
      {[1, 2].map(i => (
        <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"></div>
        </div>
      ))}
    </div>
  )
});

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("thisMonth");

  useEffect(() => {
    setLoading(true);
    axiosInstance.get(`/analytics/dashboard?dateRange=${dateRange}`)
      .then(res => setStats(res.data))
      .catch(() => toast.error("Lỗi khi tải dữ liệu thống kê"))
      .finally(() => setLoading(false));
  }, [dateRange]);

  if (loading && !stats) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"></div>
    </div>
  );

  if (!stats) return <div className="text-white text-center py-20">Không có dữ liệu</div>;

  const { overview } = stats;

  return (
    <div className="space-y-6">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Dashboard & Thống kê</h2>
          <p className="text-slate-400 mt-1">Phân tích chuyên sâu về doanh thu, khung giờ và khách hàng.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
          <Filter size={16} className="text-slate-400 ml-2" />
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="bg-slate-800 text-white text-sm border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 cursor-pointer outline-none"
          >
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
            <option value="thisMonth">Tháng này</option>
            <option value="thisYear">Năm nay</option>
          </select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-medium">Tổng doanh thu</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(overview.totalRevenue)}
              </h3>
              <p className="text-xs text-teal-400 mt-2">Đơn đã xác nhận</p>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-xl"><DollarSign className="text-teal-400" size={24} /></div>
          </div>
        </div>

        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-medium">Giờ đã phục vụ</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {overview.totalHours.toFixed(1)} <span className="text-lg text-slate-400 font-normal">giờ</span>
              </h3>
              <p className="text-xs text-amber-400 mt-2">Tổng thời gian thuê sân</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl"><Clock className="text-amber-400" size={24} /></div>
          </div>
        </div>

        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-medium">Tỷ lệ lấp đầy</p>
              <h3 className="text-2xl font-bold text-white mt-1">{overview.occupancyRate}%</h3>
              <p className="text-xs text-rose-400 mt-2">Dựa trên 16h/ngày/sân</p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl"><TrendingUp className="text-rose-400" size={24} /></div>
          </div>
        </div>

        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-slate-400 text-sm font-medium">Lượt đặt thành công</p>
              <h3 className="text-2xl font-bold text-white mt-1">{overview.totalBookings}</h3>
              <p className="text-xs text-blue-400 mt-2">Đơn CONFIRMED</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl"><CheckCircle className="text-blue-400" size={24} /></div>
          </div>
        </div>
      </div>

      {/* CHARTS - lazy loaded để tránh SSR lỗi */}
      {stats && <AnalyticsCharts stats={stats} />}
    </div>
  );
}
