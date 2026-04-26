"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Archive, ArchiveRestore, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";

interface Court {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  isActive: boolean;
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: "", location: "", pricePerHour: "" });

  // Deleted Courts State
  const [isDeletedModalOpen, setIsDeletedModalOpen] = useState(false);
  const [deletedCourts, setDeletedCourts] = useState<Court[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<Court | null>(null);
  const [affectedBookings, setAffectedBookings] = useState<any[]>([]);
  const [loadingAffected, setLoadingAffected] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const fetchCourts = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/courts");
      setCourts(res.data.data);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách sân");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const openModal = (court?: Court) => {
    if (court) {
      setEditingId(court.id);
      setFormData({ name: court.name, location: court.location, pricePerHour: court.pricePerHour.toString() });
    } else {
      setEditingId(null);
      setFormData({ name: "", location: "", pricePerHour: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const fetchDeletedCourts = async () => {
    try {
      setLoadingDeleted(true);
      const res = await axiosInstance.get("/courts?deleted=true");
      setDeletedCourts(res.data.data);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách sân đã xóa");
    } finally {
      setLoadingDeleted(false);
    }
  };

  const openDeletedModal = () => {
    fetchDeletedCourts();
    setIsDeletedModalOpen(true);
  };

  const handleRestore = async (id: string) => {
    try {
      await axiosInstance.patch(`/courts/${id}/restore`);
      toast.success("Khôi phục sân thành công");
      fetchDeletedCourts();
      fetchCourts(); // Làm mới danh sách chính
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi khôi phục sân");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        location: formData.location,
        pricePerHour: Number(formData.pricePerHour)
      };

      if (editingId) {
        await axiosInstance.patch(`/courts/${editingId}`, payload);
        toast.success("Cập nhật sân thành công!");
      } else {
        await axiosInstance.post("/courts", payload);
        toast.success("Tạo sân mới thành công!");
      }
      closeModal();
      fetchCourts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const openDeleteModal = async (court: Court) => {
    setCourtToDelete(court);
    setDeleteConfirmText("");
    setIsDeleteModalOpen(true);
    setLoadingAffected(true);
    try {
      const res = await axiosInstance.get(`/courts/${court.id}/affected-bookings`);
      setAffectedBookings(res.data);
    } catch (error) {
      toast.error("Lỗi khi tải thông tin lịch đặt bị ảnh hưởng");
    } finally {
      setLoadingAffected(false);
    }
  };

  const confirmDelete = async () => {
    if (!courtToDelete) return;
    try {
      await axiosInstance.delete(`/courts/${courtToDelete.id}`);
      toast.success("Đã xóa sân và hủy các lịch đặt liên quan");
      setIsDeleteModalOpen(false);
      fetchCourts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa sân");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Quản lý Sân Cầu Lông</h2>
          <p className="text-slate-400 mt-1">Xem, thêm, sửa, xóa các sân cầu lông trong hệ thống.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={openDeletedModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition-all shadow-md"
          >
            <Archive size={20} className="text-rose-400" />
            Thùng rác
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/20 transition-all"
          >
            <Plus size={20} />
            Tạo sân mới
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-300 text-sm uppercase tracking-wider">
              <th className="p-5 font-medium">Tên sân</th>
              <th className="p-5 font-medium">Vị trí</th>
              <th className="p-5 font-medium">Giá / Giờ</th>
              <th className="p-5 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
            ) : courts.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Chưa có sân nào. Hãy tạo sân mới!</td></tr>
            ) : (
              courts.map((court, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={court.id} 
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="p-5 font-medium text-white">{court.name}</td>
                  <td className="p-5 text-slate-300">{court.location}</td>
                  <td className="p-5 text-teal-400 font-semibold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(court.pricePerHour)}</td>
                  <td className="p-5 flex justify-end gap-3">
                    <button onClick={() => openModal(court)} className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors" title="Sửa">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => openDeleteModal(court)} className="p-2 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors" title="Xóa">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Glassmorphism Modal cho Thêm/Sửa sân */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 p-8 rounded-3xl shadow-2xl"
            >
              <button onClick={closeModal} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <h3 className="text-2xl font-bold text-white mb-6">
                {editingId ? "Cập nhật thông tin sân" : "Tạo sân cầu lông mới"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tên sân</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-500 transition-all"
                    placeholder="VD: Sân Vip 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Vị trí / Địa chỉ</label>
                  <input 
                    type="text" 
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-500 transition-all"
                    placeholder="VD: Tầng 2, Nhà thi đấu ABC..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Giá thuê mỗi giờ (VNĐ)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.pricePerHour}
                    onChange={(e) => setFormData({...formData, pricePerHour: e.target.value})}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-500 transition-all"
                    placeholder="VD: 150000"
                  />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="px-6 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl font-medium transition-colors">
                    Hủy
                  </button>
                  <button type="submit" className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/20 transition-all">
                    {editingId ? "Lưu thay đổi" : "Tạo sân ngay"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Quản lý Sân bị xóa */}
      <AnimatePresence>
        {isDeletedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsDeletedModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/50 p-8 rounded-3xl shadow-2xl flex flex-col max-h-[80vh]"
            >
              <button onClick={() => setIsDeletedModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Archive size={28} className="text-rose-400" /> Thùng rác: Sân đã bị xóa
              </h3>

              <div className="flex-1 overflow-auto bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-300 text-sm uppercase tracking-wider sticky top-0">
                      <th className="p-5 font-medium">Tên sân</th>
                      <th className="p-5 font-medium">Vị trí</th>
                      <th className="p-5 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingDeleted ? (
                      <tr><td colSpan={3} className="p-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                    ) : deletedCourts.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-slate-500">Thùng rác trống.</td></tr>
                    ) : (
                      deletedCourts.map((court, idx) => (
                        <motion.tr 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                          key={court.id} 
                          className="border-b border-slate-800/50 hover:bg-slate-800/20"
                        >
                          <td className="p-5 font-medium text-slate-400 line-through">{court.name}</td>
                          <td className="p-5 text-slate-500">{court.location}</td>
                          <td className="p-5 flex justify-end gap-3">
                            <button onClick={() => handleRestore(court.id)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20 font-medium">
                              <ArchiveRestore size={16} /> Khôi phục
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Xóa Sân (Cảnh báo ảnh hưởng lịch đặt) */}
      <AnimatePresence>
        {isDeleteModalOpen && courtToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsDeleteModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-rose-500/30 p-8 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
            >
              <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <h3 className="text-2xl font-bold text-rose-500 mb-2 flex items-center gap-3">
                <AlertTriangle size={28} /> Cảnh Báo Xóa Sân
              </h3>
              <p className="text-slate-300 mb-6">Bạn đang chuẩn bị xóa sân <strong className="text-white">"{courtToDelete.name}"</strong>. Hành động này sẽ chuyển sân vào Thùng Rác.</p>

              {loadingAffected ? (
                <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-500"></div></div>
              ) : affectedBookings.length > 0 ? (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-3 text-rose-400 mb-4">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Phát hiện {affectedBookings.length} lịch đặt sắp tới bị ảnh hưởng!</p>
                      <p className="text-sm mt-1">Nếu bạn tiếp tục xóa, toàn bộ các lịch đặt dưới đây sẽ bị <strong>HỦY</strong> và hệ thống sẽ tự động gửi Email xin lỗi đến khách hàng.</p>
                    </div>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {affectedBookings.map((b: any, i: number) => (
                      <div key={i} className="bg-slate-800/80 p-3 rounded-lg flex justify-between items-center text-sm">
                        <div>
                          <p className="font-semibold text-slate-200">{b.user.email}</p>
                          <p className="text-slate-400">{format(new Date(b.startTime), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                        <span className="font-bold text-rose-400">Sẽ bị hủy</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 mb-6 text-emerald-400 flex items-center gap-3">
                  <CheckCircle2 size={20} />
                  <p>Sân này không có lịch đặt nào trong tương lai. Có thể xóa an toàn.</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">
                  Để xác nhận, vui lòng gõ <strong>Đồng Ý Xóa Sân {courtToDelete.name}</strong>
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-all"
                  placeholder={`Đồng Ý Xóa Sân ${courtToDelete.name}`}
                />
              </div>

              <div className="flex justify-end gap-3 mt-auto">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl font-medium transition-colors">
                  Hủy bỏ
                </button>
                <button 
                  disabled={deleteConfirmText !== `Đồng Ý Xóa Sân ${courtToDelete.name}`}
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-rose-500/20 transition-all"
                >
                  Xác nhận Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
