"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, CalendarDays, MapPin, LogOut, UserCircle } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("access_token"); // Fix tên token
    const role = localStorage.getItem("role");
    
    if (!token || role !== "ADMIN") {
      router.push("/login");
    } else if (pathname === "/admin") {
      router.push("/admin/analytics");
    }
  }, [router, pathname]);

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans transition-opacity duration-300 ${!isClient ? 'opacity-0' : 'opacity-100'}`}>
      {/* Sidebar - Glassmorphism */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-xl flex flex-col justify-between"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
              Z8
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 text-transparent bg-clip-text">Zen8Labs</span>
          </div>

          <nav className="space-y-2">
            <Link href="/admin/analytics" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/analytics' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link href="/admin/courts" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/courts' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
              <MapPin size={20} />
              <span className="font-medium">Quản lý Sân</span>
            </Link>
            <Link href="/admin/bookings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/bookings' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
              <CalendarDays size={20} />
              <span className="font-medium">Lịch Đặt Sân</span>
            </Link>
            <Link href="/admin/pos" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/pos' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span className="font-medium">Tạo Booking (POS)</span>
            </Link>
            <Link href="/admin/vouchers" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/vouchers' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
              <UserCircle size={20} />
              <span className="font-medium">Khuyến mãi</span>
            </Link>
            <Link href="/admin/users" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/admin/users' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
              <Users size={20} />
              <span className="font-medium">Người dùng</span>
            </Link>
          </nav>
        </div>

        <div className="p-6">
          <button 
            onClick={() => {
              localStorage.clear();
              router.push('/login');
            }}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <h1 className="text-xl font-semibold">Admin Workspace</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              title="Hồ sơ cá nhân"
              className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-md hover:border-teal-500/50 hover:bg-slate-700 transition-all group"
            >
              <span className="text-sm font-bold text-teal-400 group-hover:scale-110 transition-transform">ADM</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto p-8 z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
