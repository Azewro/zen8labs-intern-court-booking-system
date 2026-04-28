"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, X, ChevronDown, AlertTriangle, Phone, Star, Clock, CheckCircle2, XCircle, PauseCircle, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";

interface Court {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  deletedAt: string | null;
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

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", location: "", pricePerHour: "" });

  // Close flow — Step 1: affected bookings preview, Step 2: text confirm
  const [closeStep, setCloseStep] = useState<0 | 1 | 2>(0);
  const [courtToClose, setCourtToClose] = useState<Court | null>(null);
  const [affected, setAffected] = useState<AffectedBookings | null>(null);
  const [loadingAffected, setLoadingAffected] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCourts = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/courts?includeInactive=true");
      setCourts(res.data.data);
    } catch { toast.error("Lỗi khi tải danh sách sân"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCourts(); }, []);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openModal = (court?: Court) => {
    setEditingId(court?.id ?? null);
    setFormData(court ? { name: court.name, location: court.location, pricePerHour: court.pricePerHour.toString() } : { name: "", location: "", pricePerHour: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: formData.name, location: formData.location, pricePerHour: Number(formData.pricePerHour) };
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

  // Bắt đầu flow đóng sân — Step 1
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

  // Xác nhận lần 2 — Step 2
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

      {/* Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-300 text-sm uppercase tracking-wider">
              <th className="p-5 font-medium">Tên sân</th>
              <th className="p-5 font-medium">Vị trí</th>
              <th className="p-5 font-medium">Giá / Giờ</th>
              <th className="p-5 font-medium">Trạng thái</th>
              <th className="p-5 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Đang tải...</td></tr>
            ) : courts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Chưa có sân nào.</td></tr>
            ) : courts.map((court, idx) => {
              const cfg = STATUS_CONFIG[court.status];
              const isOpen = openDropdownId === court.id;
              return (
                <motion.tr key={court.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="p-5 font-semibold text-white">{court.name}</td>
                  <td className="p-5 text-slate-400">{court.location}</td>
                  <td className="p-5 text-teal-400 font-semibold">{new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(Number(court.pricePerHour))}</td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
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
                      {/* Dropdown hành động */}
                      <div className="relative">
                        <button onClick={() => setOpenDropdownId(isOpen ? null : court.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all text-sm font-medium">
                          Hành động <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`}/>
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
                              {court.status === "CLOSED" && (
                                <div className="px-4 py-3 text-slate-600 text-sm text-center">Không có thao tác</div>
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

      {/* ===== CLOSE FLOW STEP 1: Cảnh báo & Danh sách phân loại ===== */}
      <AnimatePresence>
        {closeStep === 1 && courtToClose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="p-7">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-rose-400"/>
                  </div>
                  <h3 className="text-xl font-bold text-white">Cảnh báo trước khi đóng sân</h3>
                </div>
                <p className="text-slate-400 mb-6">Sân <strong className="text-white">"{courtToClose.name}"</strong> có booking tương lai sẽ bị ảnh hưởng. Vui lòng xem xét kỹ trước khi tiếp tục.</p>

                {loadingAffected ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"/></div>
                ) : affected?.total === 0 ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-center font-medium mb-4">
                    ✅ Không có lịch đặt nào bị ảnh hưởng. An toàn để đóng sân.
                  </div>
                ) : (
                  <>
                    <p className="text-slate-300 font-semibold mb-4">Tổng cộng <span className="text-rose-400">{affected?.total} lịch đặt</span> sẽ bị hủy:</p>
                    <BookingGroup bookings={affected?.urgent} label="Sắp đến giờ (< 24h) — Cần gọi điện ngay" color="border-rose-500/30 text-rose-300" icon={<Clock size={15} className="text-rose-400"/>} note="⚠️ Những khách này cần được liên hệ trực tiếp để thông báo kịp thời."/>
                    <BookingGroup bookings={affected?.vip} label="Khách VIP (đặt ≥ 3 tiếng)" color="border-amber-500/30 text-amber-300" icon={<Star size={15} className="text-amber-400"/>} note="⭐ Ưu tiên sắp xếp sân thay thế hoặc bù lịch cho nhóm này."/>
                    <BookingGroup bookings={affected?.normal} label="Thông thường" color="border-slate-600 text-slate-300" icon={<CheckCircle2 size={15} className="text-slate-400"/>} note=""/>
                  </>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setCloseStep(0)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all">
                    Hủy bỏ
                  </button>
                  <button onClick={() => setCloseStep(2)} className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl font-semibold transition-all">
                    Tôi hiểu, tiếp tục →
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CLOSE FLOW STEP 2: Xác nhận lần 2 ===== */}
      <AnimatePresence>
        {closeStep === 2 && courtToClose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-rose-500/20 rounded-3xl shadow-2xl w-full max-w-md p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <XCircle size={24} className="text-rose-400"/>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Xác nhận đóng sân vĩnh viễn</h3>
                  <p className="text-rose-400 text-sm font-medium">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-slate-300 mb-2">Để xác nhận, vui lòng nhập chính xác:</p>
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-4 font-mono text-rose-300 text-sm select-all">
                Đồng Ý Đóng {courtToClose.name}
              </div>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Nhập đoạn văn bản trên..."
                className="w-full bg-slate-800 border border-slate-700 focus:border-rose-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 mb-6 transition-all"
              />
              <div className="flex gap-3">
                <button onClick={() => setCloseStep(1)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all">
                  ← Quay lại
                </button>
                <button onClick={confirmClose}
                  disabled={confirmText !== `Đồng Ý Đóng ${courtToClose.name}`}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all">
                  🔒 Đóng sân vĩnh viễn
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MODAL TẠO / SỬA SÂN ===== */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{editingId ? "Chỉnh sửa sân" : "Tạo sân mới"}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><X size={20}/></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                {[
                  { label: "Tên sân", key: "name", placeholder: "VD: Sân VIP 1 (Thảm Yonex)" },
                  { label: "Vị trí", key: "location", placeholder: "VD: Tầng 1, Nhà thi đấu Zen8" },
                  { label: "Giá / Giờ (VNĐ)", key: "pricePerHour", placeholder: "VD: 150000", type: "number" },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">{label}</label>
                    <input required type={type || "text"} value={(formData as any)[key]} placeholder={placeholder}
                      onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"/>
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all">Hủy</button>
                  <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-xl font-bold transition-all">
                    {editingId ? "Lưu thay đổi" : "Tạo sân"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
