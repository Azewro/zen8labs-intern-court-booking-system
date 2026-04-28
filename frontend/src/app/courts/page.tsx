"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import axiosInstance from "@/lib/axios";
import { MapPin, PauseCircle } from "lucide-react";

interface Court {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  imageUrl: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
}

export default function CourtsListPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get("/courts").then(res => {
      // Chỉ hiện ACTIVE và SUSPENDED — CLOSED đã bị lọc bởi backend
      setCourts(res.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/">
          <button className="flex items-center text-teal-400 hover:text-teal-300 font-semibold transition-colors">
            <span className="mr-2">←</span> Về Trang Chủ
          </button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mb-6">
          Chọn Sân Tốt, Đánh Cực Bốc
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
          Hệ thống sân cầu lông đạt chuẩn quốc tế, thảm chống trơn trượt cùng hệ thống ánh sáng chống chói đỉnh cao.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"/>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courts.map((court, idx) => {
            const isSuspended = court.status === "SUSPENDED";
            return (
              <motion.div key={court.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                className={`bg-slate-900 border rounded-3xl overflow-hidden transition-colors group flex flex-col shadow-xl ${
                  isSuspended ? "border-amber-500/30 opacity-70" : "border-slate-800 hover:border-teal-500/50"
                }`}>
                <div className="h-60 relative overflow-hidden">
                  <img src={court.imageUrl || "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80"}
                    alt={court.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                  {/* Badge giá */}
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-teal-400 font-bold border border-teal-500/30">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(court.pricePerHour)} / giờ
                  </div>
                  {/* Badge Tạm ngừng */}
                  {isSuspended && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-md px-3 py-1.5 rounded-full text-amber-400 font-bold text-xs border border-amber-500/30">
                      <PauseCircle size={13}/> Tạm ngừng
                    </div>
                  )}
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">{court.name}</h3>
                  <div className="flex items-center text-slate-400 mb-8">
                    <MapPin size={18} className="mr-2 text-rose-400"/><span className="truncate">{court.location}</span>
                  </div>
                  <div className="mt-auto">
                    {isSuspended ? (
                      <div className="w-full py-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold rounded-xl text-center text-base">
                        🔒 Sân tạm ngừng nhận đặt lịch
                      </div>
                    ) : (
                      <Link href={`/courts/${court.id}`}>
                        <button className="w-full py-4 bg-slate-800 hover:bg-gradient-to-r hover:from-teal-500 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all border border-slate-700 hover:border-transparent text-lg">
                          Xem lịch trống
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
