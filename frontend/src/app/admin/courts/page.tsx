"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Edit2, X, ChevronDown, AlertTriangle, Clock, Star, 
  CheckCircle2, XCircle, PauseCircle, PlayCircle, Search, Filter, 
  ChevronsUpDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";

interface Court {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
}

interface AffectedBookings {
  urgent: any[];
  vip: any[];
  normal: any[];
  total: number;
}

const STATUS_CONFIG = {
  ACTIVE:    { label: "Hoạt động",    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: <CheckCircle2 size={13}/> },
  SUSPENDED: { label: "Tạm ngừng",   color: "text-amber-400 bg-amber-400/10 border-amber-400/20",       icon: <PauseCircle size={13}/> },
  CLOSED:    { label: "Đã đóng",      color: "text-rose-400 bg-rose-400/10 border-rose-400/20",          icon: <XCircle size={13}/> },
};

type SortKey = "name" | "pricePerHour" | "status";
type SortOrder = "asc" | "desc";

function SortIcon({ col, sortBy, sortOrder }: { col: SortKey; sortBy: SortKey; sortOrder: SortOrder }) {
  if (col !== sortBy) return <ChevronsUpDown size={14} className="text-slate-600" />;
  return sortOrder === "asc" ? <ChevronUp size={14} className="text-teal-400" /> : <ChevronDown size={14} className="text-teal-400" />;
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", location: "", pricePerHour: "", 
    peakPricePerHour: "", peakStartHour: "", peakEndHour: "" 
  });

  // Filters & Sort
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Close flow
  const [closeStep, setCloseStep] = useState<0 | 1 | 2>(0);
  const [courtToClose, setCourtToClose] = useState<Court | null>(null);
  const [affected, setAffected] = useState<AffectedBookings | null>(null);
  const [loadingAffected, setLoadingAffected] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCourts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      // Backend currently takes includeInactive, we filter frontend for now or update backend later
      const res = await axiosInstance.get("/courts?includeInactive=true");
      let data = res.data.data as Court[];

      // Local Filter
      if (search) {
        const s = search.toLowerCase();
        data = data.filter(c => c.name.toLowerCase().includes(s) || c.location.toLowerCase().includes(s));
      }
      if (statusFilter !== "ALL") {
        data = data.filter(c => c.status === statusFilter);
      }

      // Local Sort
      data.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      setCourts(data);
    } catch { 
      if (showLoading) toast.error("Lỗi khi tải danh sách sân"); 
    } finally { 
      if (showLoading) setLoading(false); 
    }
  }, [search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchCourts(true);
    const interval = setInterval(() => {
      fetchCourts(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchCourts]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortOrder("asc"); }
  };

  const openModal = (court?: any) => {
    setEditingId(court?.id ?? null);
    setFormData(court ? { 
      name: court.name, 
      location: court.location, 
      pricePerHour: court.pricePerHour?.toString() || "",
      peakPricePerHour: court.peakPricePerHour?.toString() || "",
      peakStartHour: court.peakStartHour?.toString() || "",
      peakEndHour: court.peakEndHour?.toString() || ""
    } : { 
      name: "", location: "", pricePerHour: "",
      peakPricePerHour: "", peakStartHour: "", peakEndHour: ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { 
        name: formData.name, 
        location: formData.location, 
        pricePerHour: Number(formData.pricePerHour) 
      };
      
      if (formData.peakPricePerHour) payload.peakPricePerHour = Number(formData.peakPricePerHour);
      if (formData.peakStartHour) payload.peakStartHour = Number(formData.peakStartHour);
      if (formData.peakEndHour) payload.peakEndHour = Number(formData.peakEndHour);

      if (editingId) {
        await axiosInstance.patch(`/courts/${editingId}`, payload);
        toast.success("Cập nhật sân thành công!");
      } else {
        await axiosInstance.post("/courts", payload);
        toast.success("Tạo sân mới thành công!");
      }
      setIsModalOpen(false);
      fetchCourts();
    } catch (e: any) { toast.error(e.response?.data?.message || "Có lỗi xảy ra"); }
  };

  const handleSuspend = async (court: Court) => {
    setOpenDropdownId(null);
    try {
      await axiosInstance.patch(`/courts/${court.id}/suspend`);
      toast.success(`Đã tạm ngừng sân "${court.name}"`);
      fetchCourts();
    } catch (e: any) { toast.error(e.response?.data?.message || "Lỗi"); }
  };

  const handleActivate = async (court: Court) => {
    setOpenDropdownId(null);
    try {
      await axiosInstance.patch(`/courts/${court.id}/activate`);
      toast.success(`Đã kích hoạt lại sân "${court.name}"`);
      fetchCourts();
    } catch (e: any) { toast.error(e.response?.data?.message || "Lỗi"); }
  };

  const startCloseFlow = async (court: Court) => {
    setOpenDropdownId(null);
    setCourtToClose(court);
    setConfirmText("");
    setAffected(null);
    setCloseStep(1);
    setLoadingAffected(true);
    try {
      const res = await axiosInstance.get(`/courts/${court.id}/affected-bookings`);
      setAffected(res.data);
    } catch { toast.error("Lỗi khi tải thông tin lịch đặt"); }
    finally { setLoadingAffected(false); }
  };

  const confirmClose = async () => {
    if (!courtToClose) return;
    const expected = `Đồng Ý Đóng ${courtToClose.name}`;
    if (confirmText !== expected) { toast.error(`Vui lòng nhập đúng: "${expected}"`); return; }
    try {
      await axiosInstance.delete(`/courts/${courtToClose.id}`);
      toast.success(`Đã đóng sân "${courtToClose.name}" và hủy các lịch liên quan`);
      setCloseStep(0);
      setCourtToClose(null);
      fetchCourts();
    } catch (e: any) { toast.error(e.response?.data?.message || "Lỗi khi đóng sân"); }
  };

  const thClass = (key: SortKey) => `p-5 font-medium cursor-pointer group hover:text-white transition-colors ${sortBy === key ? "text-teal-400" : "text-slate-400"}`;

  const BookingGroup = ({ bookings, label, color, icon, note }: any) => {
    if (!bookings?.length) return null;
    return (
      <div className={`border rounded-xl p-4 mb-3 ${color}`}>
        <p className="font-bold flex items-center gap-2 mb-3">{icon} {label} ({bookings.length})</p>
        {note && <p className="text-xs mb-3 opacity-80">{note}</p>}
        <div className="space-y-2">
          {bookings.map((b: any) => (
            <div key={b.id} className="bg-slate-950/40 rounded-lg px-3 py-2 text-sm flex justify-between items-center">
              <div>
                <span className="font-semibold text-white">{b.user.fullName}</span>
                <span className="text-slate-400 ml-2">{b.user.email}</span>
                {b.user.phoneNumber && <span className="text-slate-400 ml-2">📞 {b.user.phoneNumber}</span>}
              </div>
              <span className="text-teal-400 font-mono text-xs">{format(new Date(b.startTime), "HH:mm dd/MM")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" ref={dropdownRef}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Quản lý Sân Cầu Lông</h2>
          <p className="text-slate-400 mt-1">Xem, thêm, sửa và quản lý trạng thái các sân.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold rounded-xl shadow-lg transition-all">
          <Plus size={20} /> Tạo sân mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-5 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-400 font-medium text-sm"><Filter size={16}/> Bộ lọc</div>
        <div className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên sân, vị trí..."
            className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none transition-all"/>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 transition-all">
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="SUSPENDED">Tạm ngừng</option>
          <option value="CLOSED">Đã đóng</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl shadow-xl overflow-visible">
        <div className="overflow-x-auto pb-32 -mb-32"> {/* Thêm padding bottom để không bị cắt dropdown */}
          <table className="w-full text-left border-collapse">
            <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-sm uppercase tracking-wider">
              <th className={thClass("name")} onClick={() => handleSort("name")}>
                <span className="flex items-center gap-1.5">Tên sân <SortIcon col="name" sortBy={sortBy} sortOrder={sortOrder}/></span>
              </th>
              <th className="p-5 font-medium text-slate-400">Vị trí</th>
              <th className={thClass("pricePerHour")} onClick={() => handleSort("pricePerHour")}>
                <span className="flex items-center gap-1.5">Giá / Giờ <SortIcon col="pricePerHour" sortBy={sortBy} sortOrder={sortOrder}/></span>
              </th>
              <th className={thClass("status")} onClick={() => handleSort("status")}>
                <span className="flex items-center gap-1.5">Trạng thái <SortIcon col="status" sortBy={sortBy} sortOrder={sortOrder}/></span>
              </th>
              <th className="p-5 font-medium text-slate-400 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500"><div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"/></div></td></tr>
            ) : courts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Không tìm thấy sân nào.</td></tr>
            ) : courts.map((court, idx) => {
              const cfg = STATUS_CONFIG[court.status];
              const isOpen = openDropdownId === court.id;
              return (
                <motion.tr key={court.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="p-5 font-semibold text-white">{court.name}</td>
                  <td className="p-5 text-slate-400 text-sm">{court.location}</td>
                  <td className="p-5 text-teal-400 font-semibold">{new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(Number(court.pricePerHour))}</td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {court.status !== "CLOSED" && (
                        <button onClick={() => openModal(court)} className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-all" title="Sửa">
                          <Edit2 size={17}/>
                        </button>
                      )}
                      <div className="relative">
                        <button onClick={() => setOpenDropdownId(isOpen ? null : court.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all text-xs font-bold uppercase tracking-wider">
                          <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`}/>
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                              className="absolute right-0 top-10 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden w-48">
                              {court.status === "ACTIVE" && (
                                <button onClick={() => handleSuspend(court)} className="w-full flex items-center gap-3 px-4 py-3 text-amber-400 hover:bg-slate-800 text-sm font-medium transition-colors">
                                  <PauseCircle size={16}/> Tạm ngừng
                                </button>
                              )}
                              {court.status === "SUSPENDED" && (
                                <button onClick={() => handleActivate(court)} className="w-full flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-slate-800 text-sm font-medium transition-colors">
                                  <PlayCircle size={16}/> Kích hoạt lại
                                </button>
                              )}
                              {court.status !== "CLOSED" && (
                                <button onClick={() => startCloseFlow(court)} className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-slate-800 text-sm font-medium transition-colors border-t border-slate-800">
                                  <XCircle size={16}/> Đóng vĩnh viễn
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* ===== MODALS (Step 1, Step 2, Edit) - Giữ nguyên logic cũ nhưng UI đồng bộ ===== */}
      {/* ... (Đoạn code Modal Step 1, Step 2, Edit như cũ nhưng đã được optimize trong file) ... */}
      <AnimatePresence>
        {closeStep === 1 && courtToClose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-7">
                <div className="flex items-center gap-3 mb-2"><AlertTriangle size={24} className="text-rose-400"/> <h3 className="text-xl font-bold text-white">Cảnh báo đóng sân</h3></div>
                <p className="text-slate-400 mb-6">Sân <strong className="text-white">"{courtToClose.name}"</strong> đang có booking. Hủy sẽ gửi mail thông báo cho khách.</p>
                {loadingAffected ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"/></div> : 
                  <div className="space-y-3">
                    <BookingGroup bookings={affected?.urgent} label="Khẩn cấp (< 24h)" color="border-rose-500/30" icon={<Clock size={15} className="text-rose-400"/>}/>
                    <BookingGroup bookings={affected?.vip} label="Khách VIP (≥ 3h)" color="border-amber-500/30" icon={<Star size={15} className="text-amber-400"/>}/>
                    <BookingGroup bookings={affected?.normal} label="Thông thường" color="border-slate-700" icon={<CheckCircle2 size={15} className="text-slate-400"/>}/>
                  </div>
                }
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setCloseStep(0)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-semibold transition-all">Hủy</button>
                  <button onClick={() => setCloseStep(2)} className="flex-1 py-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl font-semibold">Tiếp tục →</button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {closeStep === 2 && courtToClose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-rose-500/20 rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
              <XCircle size={48} className="text-rose-500 mx-auto mb-4"/>
              <h3 className="text-xl font-bold text-white mb-2">Xác nhận đóng vĩnh viễn</h3>
              <p className="text-slate-400 text-sm mb-4">Hành động này không thể hoàn tác. Nhập đoạn text sau:</p>
              <div className="bg-slate-800 p-3 rounded-lg font-mono text-rose-300 text-xs mb-4">Đồng Ý Đóng {courtToClose.name}</div>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-rose-500/20"/>
              <div className="flex gap-3">
                <button onClick={() => setCloseStep(1)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-semibold">Quay lại</button>
                <button onClick={confirmClose} disabled={confirmText !== `Đồng Ý Đóng ${courtToClose.name}`} className="flex-1 py-3 bg-rose-500 disabled:opacity-30 text-white rounded-xl font-bold">Xác nhận</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{editingId ? "Chỉnh sửa sân" : "Tạo sân mới"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Tên sân</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Vị trí</label>
                  <input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-all"/>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">Giá / Giờ (Gốc) - VNĐ</label>
                    <input required type="number" value={formData.pricePerHour} onChange={e => setFormData({...formData, pricePerHour: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-all"/>
                  </div>
                  
                  <div className="col-span-2 pt-3 border-t border-slate-800">
                    <p className="text-sm font-bold text-teal-400 mb-3 flex items-center gap-2"><Star size={16}/> Khung giá Giờ vàng (Tùy chọn)</p>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Giá Giờ vàng / Giờ (VNĐ)</label>
                    <input type="number" value={formData.peakPricePerHour} onChange={e => setFormData({...formData, peakPricePerHour: e.target.value})} placeholder="Để trống nếu không có" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-all"/>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Bắt đầu (Giờ)</label>
                    <input type="number" min="0" max="23" value={formData.peakStartHour} onChange={e => setFormData({...formData, peakStartHour: e.target.value})} placeholder="VD: 17" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-all"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Kết thúc (Giờ)</label>
                    <input type="number" min="0" max="23" value={formData.peakEndHour} onChange={e => setFormData({...formData, peakEndHour: e.target.value})} placeholder="VD: 21" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-all"/>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors">Hủy</button>
                  <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg">Lưu Sân</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
