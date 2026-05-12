"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Wind, MapPin, Zap, LogOut, UserCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userRole = localStorage.getItem("role");
    setIsLoggedIn(!!token);
    setRole(userRole);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setRole(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white overflow-hidden selection:bg-teal-500/30">
      
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-4 md:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
            Z8
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white hidden md:block">Zen8Labs</span>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {role === "ADMIN" && (
                <Link href="/admin/courts" className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white rounded-full font-medium transition-all text-sm">
                  Admin
                </Link>
              )}
              <Link
                href="/profile?tab=bookings"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white rounded-full font-medium transition-all text-sm"
              >
                Lịch đặt sân
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white rounded-full font-medium transition-all text-sm"
              >
                <UserCircle size={18} /> Trang cá nhân
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-full font-medium transition-all text-sm"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-300 hover:text-white font-medium transition-colors text-sm md:text-base">
                Đăng nhập
              </Link>
              <Link href="/register" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white rounded-full font-medium transition-all text-sm md:text-base">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        {/* Background Image & Dark Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1920&q=80" 
            alt="Badminton Court" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/80 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-medium text-xs md:text-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              Hệ thống đặt sân cầu lông số 1 Việt Nam
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              Đam Mê Bùng Nổ <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400">
                Trên Từng Đường Cầu
              </span>
            </h1>
            
            <p className="text-lg md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Trải nghiệm cơ sở vật chất đẳng cấp quốc tế. Đặt lịch nhanh chóng, thanh toán tiện lợi, cháy hết mình với đam mê.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link href="/courts">
                <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-full font-bold text-lg shadow-xl shadow-teal-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2">
                  Đặt sân ngay <ArrowRight size={20} />
                </button>
              </Link>
              <Link href="/profile/bookings">
                <button className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-white rounded-full font-bold text-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
                  Xem lịch đã đặt
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative z-10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tại sao chọn Zen8Labs Court?</h2>
            <p className="text-slate-400 text-lg">Chúng tôi mang đến trải nghiệm tốt nhất cho người chơi hệ phong trào lẫn chuyên nghiệp.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Trophy size={32}/>, title: "Thảm BWF", desc: "100% sân sử dụng thảm đạt chuẩn thi đấu quốc tế BWF, chống trơn trượt tuyệt đối." },
              { icon: <Wind size={32}/>, title: "Không Gian Mát Mẻ", desc: "Hệ thống điều hòa và quạt thông gió công suất lớn giúp bạn luôn thoải mái." },
              { icon: <Zap size={32}/>, title: "Ánh Sáng Chống Chói", desc: "Hệ thống đèn LED hắt sáng chuyên dụng, không gây chói mắt khi đập cầu." },
              { icon: <MapPin size={32}/>, title: "Vị Trí Đắc Địa", desc: "Tọa lạc tại trung tâm, bãi đỗ xe ô tô/xe máy rộng rãi và an ninh 24/7." }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-teal-500/50 transition-colors group"
              >
                <div className="h-14 w-14 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-24 relative z-10 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Cơ Sở Vật Chất Thực Tế</h2>
            <p className="text-slate-400 text-lg">Hệ thống sân bãi được đầu tư bài bản, sẵn sàng phục vụ mọi trận đấu đỉnh cao.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80",
              "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80",
              "https://images.unsplash.com/photo-1599839619722-39751411ea63?w=800&q=80",
              "https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?w=800&q=80",
              "https://images.unsplash.com/photo-1611226256191-5a024c6debd2?w=800&q=80",
              "https://images.unsplash.com/photo-1526410427306-b31c6340f1a6?w=800&q=80"
            ].map((img, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative h-64 rounded-3xl overflow-hidden group"
              >
                <img src={img} alt="Court Gallery" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <p className="text-white font-bold text-lg">Sân {idx + 1}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 relative z-10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Khách Hàng Nói Gì Về Chúng Tôi?</h2>
            <p className="text-slate-400 text-lg">Hơn 1,000+ tay vợt đã trải nghiệm và hài lòng.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Hoàng Tuấn", role: "VĐV Phong trào", quote: "Sân rất đẹp, thảm xịn không bị trơn. Ánh sáng đều, đánh buổi tối không bị chói mắt. Rất đáng tiền!", avatar: "11" },
              { name: "Minh Trang", role: "Nhân viên văn phòng", quote: "Giao diện web đặt sân cực kỳ mượt mà, mình thích nhất phần thanh toán ZaloPay tự động, không cần chờ admin xác nhận.", avatar: "47" },
              { name: "Đức Nguyễn", role: "HLV Cầu Lông", quote: "Tôi thường thuê sân dài hạn ở đây cho học viên. Dịch vụ chuyên nghiệp, máy lạnh mát mẻ, bãi đỗ xe an toàn.", avatar: "59" }
            ].map((review, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-800/40 border border-slate-800 p-8 rounded-3xl"
              >
                <div className="flex text-amber-400 mb-6">
                  {[1,2,3,4,5].map(i => <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
                </div>
                <p className="text-slate-300 italic mb-8">"{review.quote}"</p>
                <div className="flex items-center gap-4">
                  <img src={`https://i.pravatar.cc/100?img=${review.avatar}`} alt={review.name} className="w-12 h-12 rounded-full border-2 border-teal-500/50"/>
                  <div>
                    <h4 className="text-white font-bold">{review.name}</h4>
                    <p className="text-slate-500 text-sm">{review.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">Z8</div>
            <span className="font-bold text-xl tracking-tight text-slate-300">Zen8Labs</span>
          </div>
          <p className="text-slate-500">© 2026 Zen8Labs Intern Project. All rights reserved.</p>
          <p className="text-slate-600 mt-2 text-sm">Developed with Next.js, NestJS, and Prisma.</p>
        </div>
      </footer>
    </div>
  );
}
