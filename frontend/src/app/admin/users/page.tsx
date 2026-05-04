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

type SortKey = "fullName" | "email" | "role" | "isActive" | "createdAt";
type SortOrder = "asc" | "desc";

function SortIcon({ col, sortBy, sortOrder }: { col: SortKey; sortBy: SortKey; sortOrder: SortOrder }) {
  if (col !== sortBy) return <ChevronsUpDown size={14} className="text-slate-600" />;
  return sortOrder === "asc" ? <ChevronUp size={14} className="text-teal-400" /> : <ChevronDown size={14} className="text-teal-400" />;
}

export default function UsersPage() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("user_email");
    if (savedEmail) {
      setCurrentUserEmail(savedEmail);
    } else {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const payload = JSON.parse(jsonPayload);
          setCurrentUserEmail(payload.email);
          localStorage.setItem("user_email", payload.email);
        } catch (e) { console.error("Token decode error", e); }
      }
    }
  }, []);

  const fetchUsers = useCallback(async (page = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
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
    } catch { 
      if (showLoading) toast.error("Lỗi khi tải danh sách người dùng"); 
    } finally { 
      if (showLoading) setLoading(false); 
    }
  }, [search, roleFilter, sortBy, sortOrder]);

  useEffect(() => { 
    fetchUsers(meta.page, true); 
    const interval = setInterval(() => {
      fetchUsers(meta.page, false);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchUsers, meta.page]);

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

  const thClass = (col: SortKey) => `p-4 font-medium text-left cursor-pointer select-none group hover:text-white transition-colors ${sortBy === col ? "text-teal-400" : "text-slate-400"}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Quản lý Người dùng</h2>
        <p className="text-slate-400 mt-1">Xem, tìm kiếm và quản lý tài khoản khách hàng & admin.</p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-5 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-400 font-medium text-sm"><Filter size={16}/> Bộ lọc</div>
        <div className="flex-1 min-w-[280px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, email, SĐT..."
            className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none transition-all"/>
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500">
          <option value="ALL">Tất cả vai trò</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">Khách hàng</option>
        </select>
        <div className="text-slate-500 text-sm ml-auto">Tổng: <span className="text-white font-bold">{meta.total}</span> người dùng</div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
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
              <tr><td colSpan={7} className="p-10 text-center text-slate-500"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500 mx-auto"/></td></tr>
            ) : users.map((u, idx) => (
              <motion.tr key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="p-4 font-bold text-white text-sm">
                   <div className="flex items-center gap-3">
                     <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-teal-500/20 text-teal-400'}`}>
                       {u.fullName.charAt(0).toUpperCase()}
                     </div>
                     {u.fullName}
                   </div>
                </td>
                <td className="p-4 text-slate-300 text-sm">{u.email}</td>
                <td className="p-4 text-slate-400 text-sm">{u.phoneNumber || "—"}</td>
                <td className="p-4">
                  {u.role === "ADMIN" ? 
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">ADMIN</span> :
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-700/50 text-slate-300">USER</span>
                  }
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${u.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                    {u.isActive ? "Hoạt động" : "Vô hiệu hóa"}
                  </span>
                </td>
                <td className="p-4 text-slate-400 text-sm">{format(new Date(u.createdAt), "dd/MM/yyyy", { locale: vi })}</td>
                <td className="p-4 text-right">
                  {u.email !== currentUserEmail ? (
                    <button onClick={() => setConfirmUser(u)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${u.isActive ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"}`}>
                      {u.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                    </button>
                  ) : <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-2 py-1 rounded-md">BẠN (ADMIN)</span>}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => fetchUsers(p)} className={`w-8 h-8 rounded-lg text-xs font-bold ${p === meta.page ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-400"}`}>{p}</button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmUser && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">{confirmUser.isActive ? "Vô hiệu hóa tài khoản?" : "Kích hoạt tài khoản?"}</h3>
              <p className="text-slate-400 text-sm mb-6">Xác nhận thay đổi trạng thái cho <b>{confirmUser.fullName}</b>?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmUser(null)} className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold">Hủy</button>
                <button onClick={handleToggle} className={`flex-1 py-2 rounded-xl text-sm font-bold text-white ${confirmUser.isActive ? "bg-rose-500" : "bg-emerald-500"}`}>Xác nhận</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
