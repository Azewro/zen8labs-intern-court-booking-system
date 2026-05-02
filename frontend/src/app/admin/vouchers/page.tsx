"use client";
import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: "", discountPercent: "", maxDiscount: "", validTo: "" });

  const fetchVouchers = () => {
    setLoading(true);
    axiosInstance.get("/vouchers").then(res => {
      setVouchers(res.data);
    }).catch(() => toast.error("Lỗi tải voucher")).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVouchers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/vouchers", {
        code: formData.code,
        discountPercent: Number(formData.discountPercent),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        validTo: new Date(formData.validTo).toISOString()
      });
      toast.success("Tạo voucher thành công!");
      setIsModalOpen(false);
      fetchVouchers();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Lỗi tạo voucher");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await axiosInstance.patch(`/vouchers/${id}/toggle`);
      toast.success("Cập nhật trạng thái thành công");
      fetchVouchers();
    } catch { toast.error("Lỗi cập nhật"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Quản lý Khuyến mãi (Vouchers)</h2>
          <p className="text-slate-400 mt-1">Tạo và quản lý các mã giảm giá cho khách hàng.</p>
        </div>
        <button onClick={() => { setFormData({code:"", discountPercent:"", maxDiscount:"", validTo:""}); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold rounded-xl shadow-lg transition-all">
          <Plus size={20} /> Tạo Voucher
        </button>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-sm uppercase text-slate-400">
                <th className="p-5 font-medium">Mã CODE</th>
                <th className="p-5 font-medium">Giảm (%)</th>
                <th className="p-5 font-medium">Giảm tối đa</th>
                <th className="p-5 font-medium">Hạn sử dụng</th>
                <th className="p-5 font-medium">Trạng thái</th>
                <th className="p-5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500"><div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500"/></div></td></tr>
              ) : vouchers.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Chưa có voucher nào.</td></tr>
              ) : vouchers.map((v, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="p-5 font-bold text-white uppercase tracking-wider">{v.code}</td>
                  <td className="p-5 text-emerald-400 font-bold">{v.discountPercent}%</td>
                  <td className="p-5 text-slate-300">
                    {v.maxDiscount ? new Intl.NumberFormat("vi-VN", {style:"currency",currency:"VND"}).format(v.maxDiscount) : "Không giới hạn"}
                  </td>
                  <td className="p-5 text-slate-300">
                    {format(new Date(v.validTo), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase ${v.isActive ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border-rose-400/20'}`}>
                      {v.isActive ? 'Đang bật' : 'Đã tắt'}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <button onClick={() => handleToggle(v.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${v.isActive ? 'bg-slate-800 text-rose-400 hover:bg-slate-700' : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'}`}>
                      {v.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Tạo Mã Giảm Giá Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Mã CODE (Viết liền không dấu)</label>
                <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="VD: SUMMER2024" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 uppercase"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Phần trăm giảm (%)</label>
                <input required type="number" min="1" max="100" value={formData.discountPercent} onChange={e => setFormData({...formData, discountPercent: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Giảm tối đa (VNĐ) - Tùy chọn</label>
                <input type="number" value={formData.maxDiscount} onChange={e => setFormData({...formData, maxDiscount: e.target.value})} placeholder="Để trống nếu không giới hạn" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Ngày hết hạn</label>
                <input required type="datetime-local" value={formData.validTo} onChange={e => setFormData({...formData, validTo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"/>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-semibold">Hủy</button>
                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg">Tạo mới</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
