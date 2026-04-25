"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Archive, ArchiveRestore } from "lucide-react";
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

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa sân này? Dữ liệu sẽ được Soft Delete.")) {
      try {
        await axiosInstance.delete(`/courts/${id}`);
        toast.success("Đã xóa sân thành công");
        fetchCourts();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Lỗi khi xóa sân");
      }
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
                    <button onClick={() => handleDelete(court.id)} className="p-2 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors" title="Xóa">
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
    </div>
  );
}
