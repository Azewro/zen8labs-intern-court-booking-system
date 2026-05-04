"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, CalendarCheck, KeyRound, Eye, EyeOff,
  User, Mail, Phone, Pencil, Check, X,
  CalendarX2, CheckCircle2, Clock, MapPin, XCircle
} from "lucide-react";
import { format, differenceInHours } from "date-fns";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";

type Tab = "info" | "bookings" | "password";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get("tab") as Tab) || "info");
  const [backUrl, setBackUrl] = useState("/");
  const [backLabel, setBackLabel] = useState("Về Trang Chủ");

  const [userInfo, setUserInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", phoneNumber: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { toast.error("Vui lòng đăng nhập"); router.push("/login"); return; }
    const role = localStorage.getItem("role");
    if (role === "ADMIN") { setBackUrl("/admin/courts"); setBackLabel("Về Trang Admin"); }

    axiosInstance.get("/auth/me")
      .then(res => { setUserInfo(res.data); setEditForm({ fullName: res.data.fullName || "", phoneNumber: res.data.phoneNumber || "" }); })
      .catch(() => toast.error("Không tải được thông tin"))
      .finally(() => setLoadingInfo(false));
  }, [router]);

  const fetchMyBookings = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingBookings(true);
    try {
      const res = await axiosInstance.get("/bookings/my-bookings");
      setBookings(res.data);
    } catch {
      // Bỏ qua lỗi ngầm
    } finally {
      if (showLoading) setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    fetchMyBookings(true);
    const interval = setInterval(() => {
      fetchMyBookings(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchMyBookings]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await axiosInstance.patch("/auth/profile", editForm);
      setUserInfo(res.data); setIsEditing(false);
      toast.success("Cập nhật thông tin thành công!");
    } catch (e: any) { toast.error(e.response?.data?.message || "Lỗi cập nhật"); }
    finally { setSavingProfile(false); }
  };

  const handleCancelEdit = () => {
    setEditForm({ fullName: userInfo?.fullName || "", phoneNumber: userInfo?.phoneNumber || "" });
    setIsEditing(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Mật khẩu nhập lại không khớp!"); return; }
    if (newPassword.length < 6) { toast.error("Mật khẩu mới phải ít nhất 6 ký tự"); return; }
    setLoadingPw(true);
    try {
      const res = await axiosInstance.patch("/auth/change-password", { oldPassword, newPassword });
      toast.success(res.data.message || "Đổi mật khẩu thành công!");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: any) { toast.error(e.response?.data?.message || "Lỗi đổi mật khẩu"); }
    finally { setLoadingPw(false); }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Bạn có chắc muốn hủy lịch này?")) return;
    try {
      await axiosInstance.patch(`/bookings/${bookingId}/cancel`);
      toast.success("Đã hủy lịch thành công!");
      const res = await axiosInstance.get("/bookings/my-bookings");
      setBookings(res.data);
    } catch (e: any) { toast.error(e.response?.data?.message || "Lỗi khi hủy lịch"); }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "CONFIRMED": return <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-4 py-1.5 rounded-full text-sm font-bold"><CheckCircle2 size={15}/>Đã duyệt</span>;
      case "PENDING":   return <span className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full text-sm font-bold"><Clock size={15}/>Chờ duyệt</span>;
      case "CANCELLED": return <span className="flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-4 py-1.5 rounded-full text-sm font-bold"><XCircle size={15}/>Đã hủy</span>;
      default: return <span>{status}</span>;
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "info",     label: "Thông Tin Cá Nhân", icon: <User size={20}/> },
    { key: "bookings", label: "Lịch Đặt Sân",      icon: <CalendarCheck size={20}/> },
    { key: "password", label: "Đổi Mật Khẩu",      icon: <KeyRound size={20}/> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center gap-3">
          <button onClick={() => router.push(backUrl)} className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-semibold transition-colors">
            <ChevronLeft size={20}/> {backLabel}
          </button>
          <span className="text-slate-700 text-lg">/</span>
          <span className="text-slate-300 font-medium">Tài Khoản</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="flex gap-8 items-start">
          <aside className="w-80 shrink-0 sticky top-24">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mb-4 text-center">
              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-4xl font-bold text-white shadow-2xl shadow-teal-500/30 mx-auto mb-5">
                {(userInfo?.fullName || userInfo?.email || "?")?.charAt(0)?.toUpperCase()}
              </div>
              <p className="font-bold text-white text-xl leading-tight">{userInfo?.fullName || "Chưa cập nhật"}</p>
              <p className="text-slate-400 text-sm mt-2 truncate">{userInfo?.email}</p>
              {userInfo?.phoneNumber && <p className="text-slate-500 text-sm mt-1">{userInfo.phoneNumber}</p>}
            </div>

            <nav className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              {tabs.map((tab, i) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-4 px-7 py-5 text-base font-semibold transition-all text-left ${
                    i < tabs.length - 1 ? "border-b border-slate-800" : ""
                  } ${
                    activeTab === tab.key
                      ? "bg-teal-500/10 text-teal-400 border-l-4 border-l-teal-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-4 border-l-transparent"
                  }`}>
                  {tab.icon} {tab.label}
                  {tab.key === "bookings" && bookings.length > 0 && (
                    <span className="ml-auto bg-teal-500/20 text-teal-400 text-xs font-bold px-2.5 py-1 rounded-full">{bookings.length}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === "info" && (
                <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-10">
                  <div className="flex items-start justify-between mb-10">
                    <div>
                      <h2 className="text-3xl font-bold text-white">Thông Tin Cá Nhân</h2>
                      <p className="text-slate-400 mt-2">Cập nhật họ tên và số điện thoại của bạn.</p>
                    </div>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-semibold transition-all border border-slate-700 text-base">
                        <Pencil size={17}/> Chỉnh sửa
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={handleCancelEdit} className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all border border-slate-700 text-base"><X size={16}/> Hủy</button>
                        <button onClick={handleSaveProfile} disabled={savingProfile} className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold transition-all disabled:opacity-50 text-base">
                          <Check size={16}/> {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    )}
                  </div>

                  {loadingInfo ? (
                    <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"/></div>
                  ) : (
                    <div className="space-y-7">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3"><User size={15}/>Họ và Tên</label>
                        {isEditing ? (
                          <input value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-2xl px-6 py-5 text-white text-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
                            placeholder="Nhập họ và tên"/>
                        ) : (
                          <div className="w-full bg-slate-800/40 border border-slate-800 rounded-2xl px-6 py-5 text-white text-xl font-medium">
                            {userInfo?.fullName || <span className="text-slate-500 italic text-lg">Chưa cập nhật</span>}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                          <Mail size={15}/>Email <span className="text-slate-600 font-normal normal-case text-xs tracking-normal">(không thể thay đổi)</span>
                        </label>
                        <div className="w-full bg-slate-800/20 border border-dashed border-slate-700 rounded-2xl px-6 py-5 text-slate-400 text-xl cursor-not-allowed">
                          {userInfo?.email}
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-3"><Phone size={15}/>Số Điện Thoại</label>
                        {isEditing ? (
                          <input value={editForm.phoneNumber} onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-2xl px-6 py-5 text-white text-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
                            placeholder="Nhập số điện thoại" type="tel"/>
                        ) : (
                          <div className="w-full bg-slate-800/40 border border-slate-800 rounded-2xl px-6 py-5 text-white text-xl font-medium">
                            {userInfo?.phoneNumber || <span className="text-slate-500 italic text-lg">Chưa cập nhật</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "bookings" && (
                <motion.div key="bookings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="flex items-center justify-between mb-7">
                    <div>
                      <h2 className="text-3xl font-bold text-white">Lịch Sử Đặt Sân</h2>
                      <p className="text-slate-400 mt-2">Xem và quản lý các lượt đặt sân của bạn.</p>
                    </div>
                    <Link href="/courts">
                      <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold border border-slate-700 transition-all text-base">+ Đặt sân mới</button>
                    </Link>
                  </div>

                  {loadingBookings ? (
                    <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-teal-500"/></div>
                  ) : bookings.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-20 text-center">
                      <CalendarX2 size={72} className="mx-auto text-slate-700 mb-6"/>
                      <p className="text-white font-bold text-2xl mb-3">Chưa có lịch đặt nào</p>
                      <p className="text-slate-400 text-lg mb-8">Hãy đặt ngay một sân để cháy hết mình!</p>
                      <Link href="/courts"><button className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 text-lg">Tìm sân ngay</button></Link>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {bookings.map((b, idx) => {
                        const start = new Date(b.startTime);
                        const end = new Date(b.endTime);
                        const canCancel = b.status !== "CANCELLED" && differenceInHours(start, new Date()) >= 2;
                        return (
                          <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden flex transition-colors group">
                            <div className="w-52 shrink-0 relative overflow-hidden">
                              <img src={b.court?.imageUrl || "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Court"/>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/60"/>
                            </div>
                            <div className="flex-1 p-7">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-white">{b.court?.name || <span className="text-slate-500 italic">Sân đã xóa</span>}</h3>
                                {renderStatus(b.status)}
                              </div>
                              <p className="text-slate-400 flex items-center gap-1.5 mb-5"><MapPin size={15} className="text-rose-400 shrink-0"/>{b.court?.location}</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/60 rounded-2xl p-4">
                                  <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-2">Thời gian</p>
                                  <p className="text-teal-400 font-bold text-lg">{format(start,"HH:mm")} – {format(end,"HH:mm")}</p>
                                  <p className="text-slate-400 text-sm mt-1">{format(start,"dd/MM/yyyy")}</p>
                                </div>
                                <div className="bg-slate-800/60 rounded-2xl p-4">
                                  <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-2">Thanh toán</p>
                                  <p className="text-white font-bold text-xl">{new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(b.totalPrice)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center px-7 border-l border-slate-800">
                              {canCancel ? (
                                <button onClick={() => handleCancel(b.id)} className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-bold rounded-xl transition-all border border-rose-500/20 text-base whitespace-nowrap">Hủy Sân</button>
                              ) : (
                                <p className="text-sm font-semibold text-slate-600 whitespace-nowrap px-2">{b.status === "CANCELLED" ? "Đã hủy" : "Không thể hủy"}</p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "password" && (
                <motion.div key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-10">
                  <div className="mb-10">
                    <h2 className="text-3xl font-bold text-white">Đổi Mật Khẩu</h2>
                    <p className="text-slate-400 mt-2">Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật bảo mật tài khoản.</p>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-7">
                    {[
                      {label:"Mật khẩu hiện tại", val:oldPassword, set:setOldPassword, show:showOld, setShow:setShowOld, ph:"Nhập mật khẩu hiện tại"},
                      {label:"Mật khẩu mới",      val:newPassword, set:setNewPassword, show:showNew, setShow:setShowNew, ph:"Tối thiểu 6 ký tự"},
                      {label:"Nhập lại Mật khẩu mới", val:confirmPassword, set:setConfirmPassword, show:showConfirm, setShow:setShowConfirm, ph:"Xác nhận mật khẩu mới"},
                    ].map(({label,val,set,show,setShow,ph}) => (
                      <div key={label}>
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</label>
                        <div className="relative">
                          <input type={show?"text":"password"} required value={val} onChange={e => set(e.target.value)}
                            className={`w-full bg-slate-800 border rounded-2xl px-6 py-5 pr-16 text-white text-lg focus:outline-none focus:ring-2 transition-all font-medium ${label.includes("lại")&&val&&val!==newPassword?"border-rose-500 focus:ring-rose-500/20":"border-slate-700 focus:border-teal-500 focus:ring-teal-500/20"}`}
                            placeholder={ph}/>
                          <button type="button" onClick={() => setShow(!show)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                            {show?<EyeOff size={22}/>:<Eye size={22}/>}
                          </button>
                        </div>
                        {label.includes("lại")&&val&&val!==newPassword&&<p className="mt-2 text-base text-rose-400 font-medium">Mật khẩu nhập lại không khớp</p>}
                      </div>
                    ))}
                    <div className="pt-2">
                      <button type="submit" disabled={loadingPw} className="px-10 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 text-lg">
                        {loadingPw?"Đang xử lý...":"Xác nhận Đổi Mật Khẩu"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-teal-500"/></div>}>
      <ProfileContent />
    </Suspense>
  );
}
