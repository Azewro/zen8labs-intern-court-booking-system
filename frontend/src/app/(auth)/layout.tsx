"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("role");
    
    // Nếu ĐÃ ĐĂNG NHẬP RỒI thì đẩy thẳng vào trong, không cho ở lại trang Auth
    if (token) {
      if (role === "ADMIN") {
        router.push("/admin/courts");
      } else {
        router.push("/");
      }
    }
  }, [router]);

  return (
    <div className={`min-h-screen flex transition-opacity duration-500 ${!isClient ? 'opacity-0' : 'opacity-100'} bg-slate-950`}>
      {/* Nửa Trái: Giới thiệu Sân (Background + Intro) */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 overflow-hidden">
        {/* Hình nền và Hiệu ứng kính mờ */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop" 
            alt="Badminton Court" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
        </div>

        {/* Nội dung Giới thiệu */}
        <div className="relative z-10 w-full max-w-lg">
          <Link href="/" className="inline-flex items-center gap-3 mb-10 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="h-12 w-12 rounded-xl bg-teal-500 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/30 text-xl">
              Z8
            </div>
            <span className="font-bold text-3xl tracking-tight text-white">Zen8Labs</span>
          </Link>
          
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Hệ thống Đặt Sân <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              Đẳng Cấp Nhất
            </span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-12">
            Trải nghiệm nền tảng quản lý và đặt lịch sân cầu lông chuyên nghiệp, nhanh chóng và minh bạch. Được thiết kế dành riêng cho cộng đồng đam mê cầu lông.
          </p>
          
          <div className="flex items-center gap-6">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt={`User ${i}`} />
                </div>
              ))}
            </div>
            <div className="text-sm">
              <p className="text-white font-bold">Hơn 1,000+</p>
              <p className="text-slate-400">tay vợt đang sử dụng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nửa Phải: Form Đăng nhập / Đăng ký */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative overflow-hidden">
        {/* Hiệu ứng ánh sáng trang trí (Blobs) */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-md relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
