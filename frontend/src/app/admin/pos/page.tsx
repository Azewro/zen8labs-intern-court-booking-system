"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, CheckCircle2, UserCheck } from "lucide-react";
import axiosInstance from "@/lib/axios";
import toast from "react-hot-toast";
import { format, addDays } from "date-fns";

const ALL_SLOTS = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00"
];

export default function AdminPOSPage() {
  const [courts, setCourts] = useState<any[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [bookedSlots, setBookedSlots] = useState<{start: string, end: string}[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingPayload, setBookingPayload] = useState<any>(null);
  const [pricingDetails, setPricingDetails] = useState<any>(null);
  const router = useRouter();

  // Load Courts
  useEffect(() => {
    axiosInstance.get('/courts').then(res => {
      setCourts(res.data.data);
    }).catch(() => toast.error("Lỗi tải danh sách sân"));
  }, []);

  // Load Schedule when Court or Date changes
  useEffect(() => {
    if (!selectedCourt) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    axiosInstance.get(`/bookings/court/${selectedCourt.id}?date=${dateStr}`)
      .then(res => {
        setBookedSlots(res.data.map((b: any) => ({
          start: new Date(b.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}),
          end: new Date(b.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})
        })));
        setSelectedSlots([]); // Reset slots on date change
      })
      .catch(() => toast.error("Lỗi tải lịch sân"));
  }, [selectedCourt, selectedDate]);

  const toggleSlot = (slot: string) => {
    setSelectedSlots(prev => 
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const openConfirmModal = async () => {
    if (!selectedCourt) return toast.error("Vui lòng chọn sân");
    if (selectedSlots.length === 0) return toast.error("Vui lòng chọn khung giờ");
    
    const sorted = [...selectedSlots].sort();
    const startIndex = ALL_SLOTS.indexOf(sorted[0]);
    const endIndex = ALL_SLOTS.indexOf(sorted[sorted.length - 1]);
    if (endIndex - startIndex + 1 !== sorted.length) return toast.error("Các khung giờ phải liền kề nhau");

    const startTimeStr = sorted[0];
    const lastSlotStr = sorted[sorted.length - 1];
    let [h, m] = lastSlotStr.split(':').map(Number);
    if (m === 30) { h += 1; m = 0; } else { m = 30; }
    const endTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startTimeIso = new Date(`${dateStr}T${startTimeStr}:00`).toISOString();
    const endTimeIso = new Date(`${dateStr}T${endTimeStr}:00`).toISOString();

    try {
      setIsSubmitting(true);
      const res = await axiosInstance.post('/bookings/calculate', {
        courtId: selectedCourt.id,
        startTime: startTimeIso,
        endTime: endTimeIso,
        voucherCode: voucherCode.trim() || undefined,
      });
      setPricingDetails(res.data);
      setBookingPayload({ startTimeIso, endTimeIso, startTimeStr, endTimeStr, dateStr });
      setShowConfirmModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi tính tiền");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmWalkInBooking = async () => {
    if (!bookingPayload || !selectedCourt) return;
    try {
      setIsSubmitting(true);
      const res = await axiosInstance.post('/bookings', {
        courtId: selectedCourt.id,
        startTime: bookingPayload.startTimeIso,
        endTime: bookingPayload.endTimeIso,
        paymentMethod: 'CASH',
        voucherCode: voucherCode.trim() || undefined,
      });

      // Bỏ đoạn auto approve để Lễ tân tự sang tab kia Duyệt
      // await axiosInstance.patch(`/bookings/${res.data.booking.id}/approve`);
      
      toast.success("Tạo lịch chờ thành công, đang chuyển hướng...");
      setShowConfirmModal(false);
      setVoucherCode("");
      
      // Chuyển hướng sang trang Quản lý Đặt sân
      router.push('/admin/bookings');
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi tạo lịch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextDays = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserCheck className="text-teal-400" /> POS - Khách Vãng Lai
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bước 1 & 2 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-lg text-white mb-4">1. Chọn sân</h3>
            <div className="space-y-2">
              {courts.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => setSelectedCourt(c)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${selectedCourt?.id === c.id ? 'bg-teal-500/20 border-teal-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                >
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.location}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-lg text-white mb-4">2. Chọn ngày</h3>
            <div className="grid grid-cols-4 gap-2">
              {nextDays.map((date, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    date.toDateString() === selectedDate.toDateString()
                      ? "bg-teal-500 border-teal-400 text-white shadow-lg"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div className="text-xs">{format(date, "EE")}</div>
                  <div className="font-bold">{format(date, "dd/MM")}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bước 3 */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full">
            <h3 className="font-semibold text-lg text-white mb-4">3. Lịch trống & Chốt đơn</h3>
            
            {!selectedCourt ? (
              <div className="flex items-center justify-center h-40 text-slate-500 italic">Vui lòng chọn sân bên trái để xem lịch</div>
            ) : (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6">
                  {ALL_SLOTS.map((slot) => {
                    const isBooked = bookedSlots.some(b => b.start <= slot && slot < b.end);
                    const isSelected = selectedSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        disabled={isBooked}
                        onClick={() => toggleSlot(slot)}
                        className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                          isBooked ? "bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed" :
                          isSelected ? "bg-teal-500 border-teal-400 text-white shadow-[0_0_10px_rgba(20,184,166,0.3)]" :
                          "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                
                <div className="border-t border-slate-800 pt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mã Khuyến mãi (Voucher) - Nếu có</label>
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value)}
                      placeholder="Ví dụ: SUMMER10, ZEN8VIP..."
                      className="w-full bg-slate-850 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none transition-all uppercase placeholder-slate-500"
                    />
                  </div>

                  <button 
                    onClick={openConfirmModal} 
                    disabled={isSubmitting || selectedSlots.length === 0}
                    className="w-full py-4 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all text-lg flex justify-center items-center gap-2"
                  >
                    <CheckCircle2 /> {isSubmitting ? "Đang xử lý..." : "Chốt Đơn (Khách trực tiếp)"}
                  </button>
                  <p className="text-slate-500 text-sm mt-3 text-center italic">* Booking sẽ tự động được gán trạng thái Đã Duyệt và thu tiền mặt</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && bookingPayload && pricingDetails && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-[40vw] min-w-[320px] max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h3 className="text-xl font-bold text-white">Xác nhận thu tiền mặt</h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-rose-400 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4 text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-3">
                <span>Sân:</span> <span className="font-bold text-white">{selectedCourt.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-3">
                <span>Ngày:</span> <span className="font-bold text-white">{format(selectedDate, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-3">
                <span>Khung giờ:</span> <span className="font-bold text-teal-400">{bookingPayload.startTimeStr} - {bookingPayload.endTimeStr}</span>
              </div>

              <div className="space-y-2 border-b border-slate-800 pb-3 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Tạm tính (chưa giảm):</span>
                  <span className="text-white font-medium">{pricingDetails.calculatedPrice?.toLocaleString()} đ</span>
                </div>
                {pricingDetails.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Mã giảm giá áp dụng:</span>
                    <span>-{pricingDetails.discountAmount?.toLocaleString()} đ</span>
                  </div>
                )}
                {pricingDetails.voucherError && (
                  <div className="text-rose-400 text-xs font-semibold mt-1">Lưu ý: {pricingDetails.voucherError}</div>
                )}
              </div>

              <div className="flex justify-between pb-2">
                <span className="font-medium text-lg">Số tiền cần thu:</span> <span className="font-bold text-emerald-400 text-3xl">{pricingDetails.finalPrice?.toLocaleString()} đ</span>
              </div>
            </div>
            <div className="p-6 bg-slate-800/40">
              <button onClick={confirmWalkInBooking} disabled={isSubmitting} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2">
                {isSubmitting ? "Đang xử lý..." : <><CheckCircle2 /> Đã thu đủ tiền & Tạo phiếu chờ</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
