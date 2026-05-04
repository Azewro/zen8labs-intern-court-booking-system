"use client";
import { useState, useEffect, use, useCallback } from "react";
import { motion } from "framer-motion";
import axiosInstance from "@/lib/axios";
import { MapPin, Calendar, Clock, CreditCard, ChevronLeft, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { format, addDays, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useRouter } from "next/navigation";

// Sinh danh sách slot (06:00 -> 21:30)
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 6; i < 22; i++) {
    slots.push(`${i.toString().padStart(2, '0')}:00`);
    slots.push(`${i.toString().padStart(2, '0')}:30`);
  }
  return slots;
};
const ALL_SLOTS = generateTimeSlots();

export default function CourtBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const courtId = resolvedParams.id;

  const [court, setCourt] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookedSlots, setBookedSlots] = useState<{start: string, end: string}[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "ONLINE">("CASH");
  const [voucherCode, setVoucherCode] = useState("");
  const [pricingDetails, setPricingDetails] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Lấy data Sân
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      toast.error("Vui lòng đăng nhập để xem lịch sân và đặt sân");
      router.push("/login");
      return;
    }

    axiosInstance.get(`/courts/${courtId}`).then((res) => {
      setCourt(res.data);
    }).catch(() => toast.error("Không tải được thông tin sân"));
  }, [courtId, router]);

  // Lấy lịch trống của Sân theo Ngày
  const fetchSchedule = useCallback(async (showLoading = true) => {
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await axiosInstance.get(`/bookings/court/${courtId}?date=${dateStr}`);
      
      // Convert ISO dates to HH:mm strings for easy comparison
      const booked = res.data.map((b: any) => ({
        start: format(new Date(b.startTime), "HH:mm"),
        end: format(new Date(b.endTime), "HH:mm")
      }));
      setBookedSlots(booked);
    } catch (error) {
      if (showLoading) toast.error("Không lấy được lịch sân");
    }
  }, [courtId, selectedDate]);

  useEffect(() => {
    setSelectedSlots([]); // Reset selected slots when date changes
    fetchSchedule(true);
    
    // Tự động cập nhật ngầm lịch trống mỗi 6 giây
    const interval = setInterval(() => {
      fetchSchedule(false);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [fetchSchedule, selectedDate]);

  // Kiểm tra 1 slot cụ thể có bị đặt hay chưa
  const isSlotBooked = (slotTime: string) => {
    // slotTime ví dụ: "14:00", nó tượng trưng cho khoảng 14:00 -> 14:30
    return bookedSlots.some((b) => {
      return slotTime >= b.start && slotTime < b.end;
    });
  };

  // Xử lý khi user bấm chọn 1 Slot
  const toggleSlot = (slotTime: string) => {
    if (isSlotBooked(slotTime)) return;
    
    // Logic chọn Slot phải liền kề nhau
    setSelectedSlots(prev => {
      if (prev.includes(slotTime)) {
        return prev.filter(s => s !== slotTime);
      }
      return [...prev, slotTime].sort();
    });
  };

  // Tự động tính tiền khi thay đổi Slot hoặc Voucher
  useEffect(() => {
    if (!court || selectedSlots.length === 0) {
      setPricingDetails(null);
      return;
    }

    const sorted = [...selectedSlots].sort();
    const startIndex = ALL_SLOTS.indexOf(sorted[0]);
    const endIndex = ALL_SLOTS.indexOf(sorted[sorted.length - 1]);
    
    if (endIndex - startIndex + 1 !== sorted.length) {
      setPricingDetails(null); // Nếu chọn không liền kề thì không tính
      return;
    }

    const startTimeStr = sorted[0];
    const lastSlotStr = sorted[sorted.length - 1];
    
    let [h, m] = lastSlotStr.split(':').map(Number);
    if (m === 30) { h += 1; m = 0; } else { m = 30; }
    const endTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startTimeIso = new Date(`${dateStr}T${startTimeStr}:00`).toISOString();
    const endTimeIso = new Date(`${dateStr}T${endTimeStr}:00`).toISOString();

    const calculate = async () => {
      try {
        setIsCalculating(true);
        const res = await axiosInstance.post('/bookings/calculate', {
          courtId,
          startTime: startTimeIso,
          endTime: endTimeIso,
          voucherCode: voucherCode.trim() || undefined
        });
        setPricingDetails(res.data);
      } catch (error) {
        // Có thể bỏ qua lỗi ở bước tính nháp
      } finally {
        setIsCalculating(false);
      }
    };

    const timer = setTimeout(calculate, 500); // Debounce 500ms
    return () => clearTimeout(timer);
  }, [court, selectedSlots, selectedDate, voucherCode, courtId]);

  // Submit Đặt Sân
  const handleBooking = async () => {
    if (selectedSlots.length === 0) return toast.error("Vui lòng chọn ít nhất 1 khung giờ");
    if (selectedSlots.length > 8) return toast.error("Chỉ được đặt tối đa 4 tiếng (8 slots)");

    // Kiểm tra tính liền mạch
    const sorted = [...selectedSlots].sort();
    const startIndex = ALL_SLOTS.indexOf(sorted[0]);
    const endIndex = ALL_SLOTS.indexOf(sorted[sorted.length - 1]);
    
    if (endIndex - startIndex + 1 !== sorted.length) {
      return toast.error("Các khung giờ được chọn phải liền kề nhau!");
    }

    // Tính startTime và endTime
    const startTimeStr = sorted[0];
    const lastSlotStr = sorted[sorted.length - 1];
    
    // Slot cuối cộng thêm 30 phút để ra endTime (VD slot 14:30 -> endTime là 15:00)
    let [h, m] = lastSlotStr.split(':').map(Number);
    if (m === 30) { h += 1; m = 0; } else { m = 30; }
    const endTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startTimeIso = new Date(`${dateStr}T${startTimeStr}:00`).toISOString();
    const endTimeIso = new Date(`${dateStr}T${endTimeStr}:00`).toISOString();

    try {
      setIsSubmitting(true);
      await axiosInstance.post('/bookings', {
        courtId,
        startTime: startTimeIso,
        endTime: endTimeIso,
        paymentMethod,
        voucherCode: voucherCode.trim() || undefined
      });
      toast.success("Đặt sân thành công! Hãy chuẩn bị giày vợt nhé!");
      router.push('/profile/bookings'); // Chuyển tới trang lịch sử
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Đặt sân thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sinh 14 ngày tới để chọn
  const nextDays = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

  if (!court) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Đang tải...</div>;
  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center text-teal-400 hover:text-teal-300 mb-8 font-semibold">
          <ChevronLeft size={20} /> Quay lại danh sách
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cột trái: Thông tin sân */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
              <img src={court.imageUrl || "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea"} alt={court.name} className="w-full h-64 object-cover" />
              <div className="p-6">
                <h1 className="text-3xl font-bold text-white mb-2">{court.name}</h1>
                <div className="flex items-start text-slate-400 mb-4">
                  <MapPin size={20} className="mr-2 text-rose-400 shrink-0 mt-1" />
                  <span>{court.location}</span>
                </div>
                <div className="text-slate-300 bg-slate-800/50 p-4 rounded-xl leading-relaxed">
                  {court.description || "Không có mô tả thêm."}
                </div>
              </div>
            </div>

            {/* Bill Tạm tính */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-6 border border-slate-800 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center"><CreditCard className="mr-2 text-teal-400" /> Tạm tính & Thanh toán</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Phương thức thanh toán</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPaymentMethod("CASH")}
                      className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${paymentMethod === "CASH" ? "bg-teal-500/20 border-teal-500 text-teal-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"}`}>
                      Tiền mặt (Tại sân)
                    </button>
                    <button 
                      onClick={() => setPaymentMethod("ONLINE")}
                      className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${paymentMethod === "ONLINE" ? "bg-teal-500/20 border-teal-500 text-teal-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white"}`}>
                      Ví Online (Giả lập)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Mã Khuyến mãi (Voucher)</label>
                  <input 
                    type="text" 
                    value={voucherCode} 
                    onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã (nếu có)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3 text-slate-300 border-t border-slate-800 pt-4 mb-4 text-sm">
                <div className="flex justify-between"><span>Giá gốc/giờ:</span> <span className="text-white font-medium">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(court.pricePerHour)}</span></div>
                <div className="flex justify-between"><span>Thời gian thuê:</span> <span className="text-white font-medium">{selectedSlots.length / 2} giờ</span></div>
                
                {pricingDetails && (
                  <>
                    <div className="flex justify-between">
                      <span>Tạm tính:</span> 
                      <span className="text-white font-medium">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pricingDetails.calculatedPrice)}</span>
                    </div>
                    {pricingDetails.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Voucher giảm:</span> 
                        <span>-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pricingDetails.discountAmount)}</span>
                      </div>
                    )}
                    {pricingDetails.voucherError && voucherCode.trim() !== '' && (
                      <div className="text-rose-400 text-xs text-right mt-1">{pricingDetails.voucherError}</div>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg text-slate-400">Thành tiền:</span>
                <span className="text-2xl font-bold text-teal-400">
                  {isCalculating ? (
                    <span className="animate-pulse text-base">Đang tính...</span>
                  ) : pricingDetails ? (
                    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pricingDetails.finalPrice)
                  ) : (
                    "0 ₫"
                  )}
                </span>
              </div>
              <button 
                onClick={handleBooking}
                disabled={selectedSlots.length === 0 || isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all text-lg"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận đặt sân"}
              </button>
              {paymentMethod === "ONLINE" && (
                <p className="text-xs text-center text-slate-500 mt-3">* Giả lập thanh toán: Bạn sẽ bị trừ tiền ngay lập tức (Mock).</p>
              )}
            </div>
          </div>

          {/* Cột phải: Chọn Ngày & Chọn Giờ */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center"><Calendar className="mr-3 text-teal-400" /> 1. Chọn ngày đá</h2>
              
              <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                {nextDays.map((date, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center justify-center min-w-[80px] p-4 rounded-2xl border transition-all ${
                      isSameDay(date, selectedDate) 
                        ? 'bg-teal-500 border-teal-400 text-white shadow-lg shadow-teal-500/30' 
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="text-sm mb-1">{idx === 0 ? "Hôm nay" : format(date, "EEE", { locale: vi })}</span>
                    <span className="text-xl font-bold">{format(date, "dd")}</span>
                    <span className="text-xs mt-1">Th{format(date, "M")}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center"><Clock className="mr-3 text-teal-400" /> 2. Chọn khung giờ</h2>
                <div className="flex gap-4 text-sm flex-wrap md:justify-end">
                  <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700 mr-2"></div> Trống</div>
                  {court?.peakStartHour != null && (
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500/10 border border-amber-500/50 mr-2 relative"><div className="absolute top-0 right-0 w-1 h-1 bg-amber-500 rounded-full"></div></div> Giờ vàng</div>
                  )}
                  <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-teal-500 mr-2"></div> Đang chọn</div>
                  <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/20 mr-2"></div> Hết chỗ</div>
                </div>
              </div>

              {court?.peakStartHour != null && court?.peakEndHour != null && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400/90 text-sm flex items-start">
                  <Zap size={18} className="mr-3 mt-0.5 shrink-0 text-amber-500" />
                  <p>
                    <strong>Khung giờ vàng:</strong> Từ <strong>{court.peakStartHour}:00</strong> đến <strong>{court.peakEndHour}:00</strong>. 
                    Giá sân trong khoảng thời gian này là <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(court.peakPricePerHour)}/giờ</strong>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {ALL_SLOTS.map((slot) => {
                  const isBooked = isSlotBooked(slot);
                  const isSelected = selectedSlots.includes(slot);
                  
                  // Chặn chọn giờ trong quá khứ nếu là hôm nay
                  const isPast = isSameDay(selectedDate, new Date()) && slot < format(new Date(), "HH:mm");
                  
                  // Kiểm tra xem có phải giờ vàng không
                  const hour = parseInt(slot.split(':')[0], 10);
                  const isPeak = court?.peakStartHour != null && court?.peakEndHour != null && hour >= court.peakStartHour && hour < court.peakEndHour;

                  return (
                    <button
                      key={slot}
                      disabled={isBooked || isPast}
                      onClick={() => toggleSlot(slot)}
                      className={`py-3 rounded-xl font-medium transition-all text-sm relative border
                        ${isPast ? 'bg-slate-800/20 text-slate-700 cursor-not-allowed border-slate-800/30' : 
                          isBooked ? 'bg-rose-500/10 text-rose-500/50 cursor-not-allowed border-rose-500/20 line-through' :
                          isSelected ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30 border-teal-400 scale-105 z-10' : 
                          isPeak ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30' :
                          'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700'}
                      `}
                    >
                      {slot}
                      {/* Dấu chấm nhỏ cho giờ vàng */}
                      {isPeak && !isBooked && !isPast && (
                         <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)]'}`}></div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-slate-500 text-sm mt-6 flex items-center justify-center italic">
                * Mỗi ô tương ứng 30 phút. Vui lòng chọn các ô liền kề nhau để tạo thành 1 lượt đặt sân.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
