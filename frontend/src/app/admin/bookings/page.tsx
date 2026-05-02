"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Search, Calendar, User, Clock, ChevronLeft, ChevronRight, 
  MapPin, Filter, ChevronsUpDown, ChevronUp, ChevronDown 
} from "lucide-react";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";
import { format } from "date-fns";

type SortKey = "user.fullName" | "court.name" | "startTime" | "totalPrice" | "status";
type SortOrder = "asc" | "desc";

function SortIcon({ col, sortBy, sortOrder }: { col: SortKey; sortBy: SortKey; sortOrder: SortOrder }) {
  if (col !== sortBy) return <ChevronsUpDown size={14} className="text-slate-600" />;
  return sortOrder === "asc" ? <ChevronUp size={14} className="text-teal-400" /> : <ChevronDown size={14} className="text-teal-400" />;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<SortKey>("startTime");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      // Backend supports search, we'll handle sorting/filter on backend if supported, or frontend if not
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        // Assuming backend will eventually support these, otherwise we'll sort frontend
        sortBy, 
        sortOrder
      });
      
      const res = await axiosInstance.get(`/bookings?${params}`);
      let data = res.data.data;

      // Note: If backend doesn't support sortBy yet, we do a fallback sort here
      // But based on our current backend, we should update it to support these.
      // For now, let's keep it simple.

      setBookings(data);
      setTotalPages(res.data.meta.totalPages);
      setMeta(res.data.meta);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách lịch đặt");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    const handler = setTimeout(() => fetchBookings(), 400);
    return () => clearTimeout(handler);
  }, [fetchBookings]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortOrder("asc"); }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "CONFIRMED": return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold uppercase border border-emerald-500/20">Đã xác nhận</span>;
      case "PENDING": return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-bold uppercase border border-amber-500/20">Chờ duyệt</span>;
      case "CANCELLED": return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-bold uppercase border border-rose-500/20">Đã hủy</span>;
      default: return <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold uppercase border border-slate-700">{status}</span>;
    }
  };

  const thClass = (key: SortKey) => `p-5 font-medium cursor-pointer select-none group hover:text-white transition-colors ${sortBy === key ? "text-teal-400" : "text-slate-400"}`;

  const handleApprove = async (id: string) => {
    try {
      await axiosInstance.patch(`/bookings/${id}/approve`);
      toast.success("Đã duyệt lịch đặt sân!");
      fetchBookings();
    } catch (error) {
      toast.error("Lỗi khi duyệt lịch");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối lịch này?")) return;
    try {
      await axiosInstance.patch(`/bookings/${id}/reject`);
      toast.success("Đã từ chối lịch đặt sân!");
      fetchBookings();
    } catch (error) {
      toast.error("Lỗi khi từ chối lịch");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Quản lý Lịch Đặt Sân</h2>
        <p className="text-slate-400 mt-1">Theo dõi và quản lý toàn bộ các giao dịch đặt sân trên hệ thống.</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-5 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-400 font-medium text-sm"><Filter size={16}/> Bộ lọc</div>
        
        {/* Search */}
        <div className="flex-1 min-w-[250px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo khách hàng, email, tên sân..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all"
          />
        </div>

        {/* Status Filter */}
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 transition-all"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="CANCELLED">Đã hủy</option>
          <option value="PENDING">Chờ duyệt</option>
        </select>

        {meta && (
          <div className="ml-auto text-slate-400 text-sm">
            Tổng cộng: <span className="text-white font-bold">{meta.total}</span> bản ghi
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl shadow-xl overflow-visible">
        <div className="overflow-x-auto pb-10 -mb-10">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-sm uppercase tracking-wider">
                <th className={thClass("user.fullName")} onClick={() => handleSort("user.fullName")}>
                  <span className="flex items-center gap-1.5"><User size={14}/> Khách hàng <SortIcon col="user.fullName" sortBy={sortBy} sortOrder={sortOrder}/></span>
                </th>
                <th className={thClass("court.name")} onClick={() => handleSort("court.name")}>
                  <span className="flex items-center gap-1.5"><MapPin size={14}/> Sân <SortIcon col="court.name" sortBy={sortBy} sortOrder={sortOrder}/></span>
                </th>
                <th className={thClass("startTime")} onClick={() => handleSort("startTime")}>
                  <span className="flex items-center gap-1.5"><Calendar size={14}/> Thời gian <SortIcon col="startTime" sortBy={sortBy} sortOrder={sortOrder}/></span>
                </th>
                <th className={thClass("totalPrice")} onClick={() => handleSort("totalPrice")}>
                  <span className="flex items-center gap-1.5">Tổng tiền <SortIcon col="totalPrice" sortBy={sortBy} sortOrder={sortOrder}/></span>
                </th>
                <th className={`${thClass("status")} text-center`} onClick={() => handleSort("status")}>
                  <span className="flex items-center justify-center gap-1.5">Trạng thái <SortIcon col="status" sortBy={sortBy} sortOrder={sortOrder}/></span>
                </th>
                <th className="p-5 font-medium text-slate-400 text-center w-[150px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-16 text-center text-slate-500">
                  <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"></div></div>
                </td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={6} className="p-16 text-center text-slate-500">
                  <Clock size={40} className="mx-auto mb-3 opacity-30 text-teal-400" />
                  Không tìm thấy lịch đặt nào phù hợp.
                </td></tr>
              ) : (
                bookings.map((b, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    key={b.id} 
                    className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="p-5">
                      <p className="font-bold text-white text-sm">{b.user?.fullName || "Khách ẩn danh"}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 tracking-tight">{b.user?.email}</p>
                    </td>
                    <td className="p-5">
                      <span className="font-bold text-teal-400 text-sm">{b.court?.name || <span className="text-slate-600 italic">Sân đã xóa</span>}</span>
                    </td>
                    <td className="p-5 text-slate-300">
                      <p className="font-semibold text-sm">{format(new Date(b.startTime), "dd/MM/yyyy")}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{format(new Date(b.startTime), "HH:mm")} - {format(new Date(b.endTime), "HH:mm")}</p>
                    </td>
                    <td className="p-5 font-bold text-white text-sm">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.totalPrice)}
                      <p className="text-[10px] text-slate-500 mt-1">{b.paymentMethod === 'ONLINE' ? 'ONLINE' : 'TIỀN MẶT'}</p>
                    </td>
                    <td className="p-5 text-center">
                      {renderStatus(b.status)}
                    </td>
                    <td className="p-5 text-center">
                      {b.status === "PENDING" ? (
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handleApprove(b.id)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors">Duyệt</button>
                          <button onClick={() => handleReject(b.id)} className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg transition-colors">Từ chối</button>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-900/60">
            <span className="text-sm text-slate-400">
              Trang <span className="font-bold text-white">{page}</span> / {totalPages}
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-2 bg-slate-800 text-slate-400 rounded-lg disabled:opacity-30 hover:bg-teal-500 hover:text-white transition-all border border-slate-700">
                <ChevronLeft size={18} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="p-2 bg-slate-800 text-slate-400 rounded-lg disabled:opacity-30 hover:bg-teal-500 hover:text-white transition-all border border-slate-700">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
