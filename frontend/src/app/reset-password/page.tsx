"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import axiosInstance from "@/lib/axios";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Link không hợp lệ hoặc đã thiếu Token");
      router.push("/login");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp!");
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/reset-password", { token, newPassword });
      toast.success(res.data.message || "Đổi mật khẩu thành công!");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <Link href="/">
        <div className="absolute top-8 left-8 flex items-center gap-3 cursor-pointer">
          <div className="h-10 w-10 rounded-xl bg-teal-500 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">Z8</div>
          <span className="font-bold text-xl text-white">Zen8Labs</span>
        </div>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
      >
        <h2 className="text-3xl font-bold text-white text-center mb-2">Đặt Lại Mật Khẩu</h2>
        <p className="text-slate-400 text-center mb-8">Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Mật khẩu mới</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Nhập mật khẩu mới"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nhập lại Mật khẩu mới</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Xác nhận mật khẩu mới"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Lưu Mật Khẩu Mới"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
