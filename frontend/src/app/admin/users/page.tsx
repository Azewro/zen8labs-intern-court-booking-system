"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, UserCheck, UserX, Shield, User, Filter } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  role: "ADMIN" | "USER";
  isActive: boolean;
  googleId: string | null;
  createdAt: string;
}

type SortKey = "fullName" | "email" | "role" | "createdAt" | "isActive";
type SortOrder = "asc" | "desc";

const ROLE_OPTIONS = [
  { value: "ALL", label: "Tất cả vai trò" },
  { value: "USER", label: "Khách hàng" },
  { value: "ADMIN", label: "Admin" },
];

function SortIcon({ col, sortBy, sortOrder }: { col: SortKey; sortBy: SortKey; sortOrder: SortOrder }) {
  if (col !== sortBy) return <ChevronsUpDown size={14} className="text-slate-600" />;
  return sortOrder === "asc" ? <ChevronUp size={14} className="text-teal-400" /> : <ChevronDown size={14} className="text-teal-400" />;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Sort
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Confirm modal
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: "10",
        ...(search && { search }),
        ...(roleFilter !== "ALL" && { role: roleFilter }),
        sortBy, sortOrder,
      });
      const res = await axiosInstance.get(`/users?${params}`);
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch { toast.error("Lỗi khi tải danh sách người dùng"); }
    finally { setLoading(false); }
  }, [search, roleFilter, sortBy, sortOrder]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const handleSort = (col: SortKey) => {
    if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortOrder("asc"); }
  };

  const handleToggle = async () => {
    if (!confirmUser) return;
    try {
      const res = await axiosInstance.patch(`/users/${confirmUser.id}/toggle-status`);
      toast.success(res.data.isActive ? `Đã kích hoạt "${confirmUser.fullName}"` : `Đã vô hiệu hóa "${confirmUser.fullName}"`);
      setConfirmUser(null);
      fetchUsers(meta.page);
    } catch (e: any) { toast.error(e.response?.data?.message || "Lỗi"); }
  };

  const thClass = (col: SortKey) =>
    `p-4 font-medium text-left cursor-pointer select-none group hover:text-white transition-colors ${sortBy === col ? "text-teal-400" : "text-slate-400"}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Quản lý Người dùng</h2>
        <p className="text-slate-400 mt-1">Xem, tìm kiếm và quản lý tài khoản khách hàng & admin.</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-5 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-400 font-medium text-sm">
          <Filter size={16}/> Bộ lọc
        </div>
        {/* Search */}
        <div className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT..."
            className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
        </div>
        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 transition-all"
        >
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {/* Stats */}
        <div className="ml-auto text-slate-400 text-sm">
          Tổng: <span className="text-white font-semibold">{meta.total}</span> người dùng
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-sm uppercase tracking-wider">
              <th className={thClass("fullName")} onClick={() => handleSort("fullName")}>
                <span className="flex items-center gap-1.5">Họ tên <SortIcon col="fullName" sortBy={sortBy} sortOrder={sortOrder}/></span>
              </th>
              <th className={thClass("email")} onClick={() => handleSort("email")}>
                <span className="flex items-center gap-1.5">Email <SortIcon col="email" sortBy={sortBy} sortOrder={sortOrder}/></span>
              </th>
              <th className="p-4 font-medium text-slate-400">SĐT</th>
              <th className={thClass("role")} onClick={() => handleSort("role")}>
                <span className="flex items-center gap-1.5">Vai trò <SortIcon col="role" sortBy={sortBy} sortOrder={sortOrder}/></span>
              </th>
              <th className={thClass("isActive")} onClick={() => handleSort("isActive")}>
                <span className="flex items-center gap-1.5">Trạng thái <SortIcon col="isActive" sortBy={sortBy} sortOrder={sortOrder}/></span>
              </th>
              <th className={thClass("createdAt")} onClick={() => handleSort("createdAt")}>
                <span className="flex items-center gap-1.5">Ngày tạo <SortIcon col="createdAt" sortBy={sortBy} sortOrder={sortOrder}/></span>
              </th>
              <th className="p-4 font-medium text-slate-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-10 text-center text-slate-500">
                <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"/></div>
              </td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-slate-500">Không tìm thấy người dùng nào.</td></tr>
            ) : users.map((u, idx) => (
              <motion.tr key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className={`border-b border-slate-800/50 transition-colors ${u.isActive ? "hover:bg-slate-800/20" : "bg-slate-900/60 opacity-60"}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      u.role === "ADMIN" ? "bg-purple-500/20 text-purple-400" : "bg-teal-500/20 text-teal-400"
                    }`}>
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{u.fullName}</p>
                      {u.googleId && <p className="text-xs text-slate-500">🔗 Google</p>}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-300 text-sm">{u.email}</td>
                <td className="p-4 text-slate-400 text-sm">{u.phoneNumber || <span className="text-slate-600">—</span>}</td>
                <td className="p-4">
                  {u.role === "ADMIN" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Shield size={11}/> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-300 border border-slate-700">
                      <User size={11}/> Khách hàng
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {u.isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <UserCheck size={11}/> Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <UserX size={11}/> Vô hiệu hóa
                    </span>
                  )}
                </td>
                <td className="p-4 text-slate-400 text-sm">
                  {format(new Date(u.createdAt), "dd/MM/yyyy", { locale: vi })}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setConfirmUser(u)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      u.isActive
                        ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {u.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800">
            <p className="text-sm text-slate-400">
              Trang <span className="text-white font-semibold">{meta.page}</span> / {meta.totalPages}
            </p>
            <div className="flex gap-2">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchUsers(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                    p === meta.page ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmUser.isActive ? "bg-rose-500/10" : "bg-emerald-500/10"
              }`}>
                {confirmUser.isActive ? <UserX size={26} className="text-rose-400"/> : <UserCheck size={26} className="text-emerald-400"/>}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {confirmUser.isActive ? "Vô hiệu hóa tài khoản?" : "Kích hoạt tài khoản?"}
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                {confirmUser.isActive
                  ? `Người dùng "${confirmUser.fullName}" sẽ không thể đăng nhập sau khi bị vô hiệu hóa.`
                  : `Người dùng "${confirmUser.fullName}" sẽ có thể đăng nhập và sử dụng hệ thống trở lại.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmUser(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all">
                  Hủy
                </button>
                <button onClick={handleToggle} className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  confirmUser.isActive
                    ? "bg-rose-500 hover:bg-rose-400 text-white"
                    : "bg-emerald-500 hover:bg-emerald-400 text-white"
                }`}>
                  {confirmUser.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
