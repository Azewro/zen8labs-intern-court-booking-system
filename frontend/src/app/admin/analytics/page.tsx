"use client";
import { useState, useEffect } from "react";
import { DollarSign, Clock, CheckCircle, TrendingUp } from "lucide-react";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get("/analytics/dashboard").then(res => {
      setStats(res.data);
    }).catch(() => toast.error("Lỗi khi tải dữ liệu thống kê"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"></div>
    </div>
  );
  
  if (!stats) return <div className="text-white text-center py-20">Không có dữ liệu</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Dashboard & Thống kê</h2>
        <p className="text-slate-400 mt-1">Báo cáo doanh thu, giờ đặt và tỷ lệ lấp đầy sân.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">Tổng doanh thu</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(stats.totalRevenue)}
              </h3>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-xl"><DollarSign className="text-teal-400" size={24}/></div>
          </div>
          <p className="text-xs text-emerald-400 font-medium">+ {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(stats.thisMonthRevenue)} tháng này</p>
        </div>

        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">Tổng giờ đã đặt</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalHours.toFixed(1)} <span className="text-lg text-slate-400 font-normal">giờ</span></h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl"><Clock className="text-amber-400" size={24}/></div>
          </div>
          <p className="text-xs text-amber-400 font-medium">+ {stats.thisMonthHours.toFixed(1)} giờ tháng này</p>
        </div>

        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">Tỷ lệ lấp đầy</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.occupancyRate}%</h3>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl"><TrendingUp className="text-rose-400" size={24}/></div>
          </div>
          <p className="text-xs text-slate-400 font-medium">Mức độ sử dụng sân tháng này</p>
        </div>

        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">Lượt đặt thành công</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalBookings}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl"><CheckCircle className="text-blue-400" size={24}/></div>
          </div>
          <p className="text-xs text-blue-400 font-medium">+ {stats.thisMonthTotalBookings} lượt tháng này</p>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-6">Doanh thu theo sân</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-sm text-slate-400">
                <th className="pb-3 font-medium">Tên Sân</th>
                <th className="pb-3 font-medium text-right">Lượt đặt</th>
                <th className="pb-3 font-medium text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {stats.revenueByCourt.map((c: any, i: number) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-4 text-white font-medium">{c.courtName}</td>
                  <td className="py-4 text-slate-400 text-right">{c.totalBookings} lượt</td>
                  <td className="py-4 text-teal-400 font-bold text-right">
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(c.revenue)}
                  </td>
                </tr>
              ))}
              {stats.revenueByCourt.length === 0 && (
                <tr><td colSpan={3} className="py-8 text-center text-slate-500">Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
