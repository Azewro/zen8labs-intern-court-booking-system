"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import axiosInstance from "@/lib/axios";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      toast.success(res.data.message || "Đã gửi email khôi phục!");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi gửi email");
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-3xl font-bold text-white text-center mb-2">Quên Mật Khẩu</h2>
        <p className="text-slate-400 text-center mb-8">Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Nhập email của bạn"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            {loading ? "Đang gửi email..." : "Gửi Link Đổi Mật Khẩu"}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          <Link href="/login" className="text-teal-400 hover:text-teal-300 font-medium">← Quay lại Đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  );
}
