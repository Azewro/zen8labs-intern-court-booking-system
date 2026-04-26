"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Calendar, User, Clock, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Logic Debounce cho ô tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset về trang 1 khi gõ tìm kiếm mới
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/bookings?page=${page}&limit=10&search=${debouncedSearch}`);
      setBookings(res.data.data);
      setTotalPages(res.data.meta.totalPages);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách lịch đặt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, debouncedSearch]);

  const renderStatus = (status: string) => {
    switch (status) {
      case "CONFIRMED": return <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase border border-emerald-500/20">Đã xác nhận</span>;
      case "PENDING": return <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold uppercase border border-amber-500/20">Chờ duyệt</span>;
      case "CANCELLED": return <span className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-xs font-bold uppercase border border-rose-500/20">Đã hủy</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Quản lý Lịch Đặt Sân</h2>
          <p className="text-slate-400 mt-1">Giám sát và theo dõi toàn bộ hóa đơn đặt sân của khách hàng.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Tìm theo email, tên khách, tên sân..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all shadow-lg"
          />
          <Search size={18} className="absolute left-4 top-3.5 text-slate-500" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-300 text-sm uppercase tracking-wider">
                <th className="p-5 font-medium"><div className="flex items-center gap-2"><User size={16} className="text-teal-400"/> Khách hàng</div></th>
                <th className="p-5 font-medium"><div className="flex items-center gap-2"><MapPin size={16} className="text-rose-400"/> Sân Cầu Lông</div></th>
                <th className="p-5 font-medium"><div className="flex items-center gap-2"><Calendar size={16} className="text-indigo-400"/> Thời gian</div></th>
                <th className="p-5 font-medium">Tổng tiền</th>
                <th className="p-5 font-medium text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-500">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div></div>
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  Không tìm thấy lịch đặt nào phù hợp với tìm kiếm.
                </td></tr>
              ) : (
                bookings.map((b, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    key={b.id} 
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-5">
                      <p className="font-bold text-white">{b.user?.fullName || "Khách ẩn danh"}</p>
                      <p className="text-xs text-slate-400 mt-1">{b.user?.email}</p>
                    </td>
                    <td className="p-5 font-bold text-teal-400">{b.court?.name || <span className="text-slate-500 italic">Sân đã bị xóa</span>}</td>
                    <td className="p-5 text-slate-300">
                      <p className="font-medium">{format(new Date(b.startTime), "dd/MM/yyyy")}</p>
                      <p className="text-sm text-slate-500 mt-1">{format(new Date(b.startTime), "HH:mm")} - {format(new Date(b.endTime), "HH:mm")}</p>
                    </td>
                    <td className="p-5 font-extrabold text-white">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.totalPrice)}
                    </td>
                    <td className="p-5 text-right">
                      {renderStatus(b.status)}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 0 && (
          <div className="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-900/60">
            <span className="text-sm text-slate-400">
              Đang hiển thị Trang <span className="font-bold text-white">{page}</span> trên tổng số <span className="font-bold text-white">{totalPages}</span> trang
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg disabled:opacity-30 hover:bg-teal-500 hover:text-white transition-all border border-slate-700"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="p-2 bg-slate-800 text-slate-300 rounded-lg disabled:opacity-30 hover:bg-teal-500 hover:text-white transition-all border border-slate-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
