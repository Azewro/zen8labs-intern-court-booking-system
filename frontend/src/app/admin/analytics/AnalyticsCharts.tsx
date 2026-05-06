"use client";
import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { DollarSign, Clock, CheckCircle, TrendingUp } from "lucide-react";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

const COLORS = ['#14b8a6', '#f59e0b', '#f43f5e', '#3b82f6', '#8b5cf6', '#ec4899'];
const STATUS_COLORS: Record<string, string> = {
  'Đã duyệt': '#10b981',
  'Chờ duyệt': '#f59e0b',
  'Đã hủy': '#f43f5e'
};

const tooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#1e293b',
  borderWidth: 1,
  titleColor: '#94a3b8',
  bodyColor: '#e2e8f0',
  padding: 12,
  cornerRadius: 8,
};

export default function AnalyticsCharts({ stats }: { stats: any }) {
  const { charts, topUsers } = stats;

  // --- Biểu đồ 1: Line Chart Doanh thu theo ngày ---
  const lineData = {
    labels: charts.revenueByDate.map((d: any) => d.date.substring(5)), // MM-DD
    datasets: [{
      label: 'Doanh thu (VNĐ)',
      data: charts.revenueByDate.map((d: any) => d.revenue),
      borderColor: '#2dd4bf',
      backgroundColor: 'rgba(45, 212, 191, 0.1)',
      borderWidth: 3,
      pointRadius: 5,
      pointBackgroundColor: '#0f172a',
      pointBorderColor: '#2dd4bf',
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
    }],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ctx.raw),
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
        border: { display: false }
      },
      y: {
        grid: { color: '#1e293b' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (val: any) => `${(val / 1000).toFixed(0)}k`
        },
        border: { display: false }
      }
    }
  };

  // --- Biểu đồ 2: Bar Chart Mật độ theo khung giờ ---
  const barData = {
    labels: charts.bookingsByHour.map((h: any) => h.hour),
    datasets: [{
      label: 'Lượt khách',
      data: charts.bookingsByHour.map((h: any) => h.count),
      backgroundColor: charts.bookingsByHour.map((h: any) => {
        const hour = parseInt(h.hour);
        // Tô màu đỏ cho giờ peak (17-20h), xanh cho giờ thường
        return hour >= 17 && hour < 20 ? '#f43f5e' : '#3b82f6';
      }),
      borderRadius: 6,
      borderSkipped: false,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx: any) => `${ctx.raw} lượt`,
          title: (items: any) => `Khung giờ: ${items[0].label}`,
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 } },
        border: { display: false }
      },
      y: {
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b', font: { size: 11 }, stepSize: 1 },
        border: { display: false },
        beginAtZero: true,
      }
    }
  };

  // --- Biểu đồ 3: Doughnut Trạng thái ---
  const statusData = {
    labels: charts.bookingsByStatus.map((s: any) => s.name),
    datasets: [{
      data: charts.bookingsByStatus.map((s: any) => s.value),
      backgroundColor: charts.bookingsByStatus.map((s: any) => STATUS_COLORS[s.name] || '#64748b'),
      borderColor: '#0f172a',
      borderWidth: 3,
      hoverOffset: 8,
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#cbd5e1', font: { size: 12 }, padding: 16 }
      },
      tooltip: {
        ...tooltipStyle,
        callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} lượt` }
      }
    }
  };

  // --- Biểu đồ 4: Doughnut Tỷ trọng doanh thu sân ---
  const courtData = {
    labels: charts.revenueByCourt.map((c: any) => c.name),
    datasets: [{
      data: charts.revenueByCourt.map((c: any) => c.value),
      backgroundColor: COLORS,
      borderColor: '#0f172a',
      borderWidth: 3,
      hoverOffset: 8,
    }]
  };

  const courtDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#cbd5e1', font: { size: 11 }, padding: 10, boxWidth: 12 }
      },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ctx.raw)}`
        }
      }
    }
  };

  return (
    <>
      {/* CHARTS ROW 1: Line + Doughnut Trạng thái */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-teal-400" /> Biến động Doanh thu
          </h3>
          {charts.revenueByDate.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu trong khoảng thời gian này</div>
          ) : (
            <div style={{ height: '288px', position: 'relative' }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          )}
        </div>

        {/* Doughnut Chart Trạng thái */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-amber-400" /> Tỷ lệ Trạng thái
          </h3>
          {charts.bookingsByStatus.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu</div>
          ) : (
            <div className="flex-1 flex flex-col justify-center" style={{ height: '260px', position: 'relative' }}>
              <Doughnut data={statusData} options={doughnutOptions} />
            </div>
          )}
        </div>
      </div>

      {/* CHARTS ROW 2: Bar + Doughnut Sân + Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart Khung giờ */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Clock size={18} className="text-rose-400" /> Mật độ khách theo Khung giờ
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1"></span>Đỏ = Giờ vàng (17-20h) &nbsp;
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>Xanh = Giờ thường
          </p>
          {charts.bookingsByHour.every((h: any) => h.count === 0) ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu khung giờ</div>
          ) : (
            <div style={{ height: '256px', position: 'relative' }}>
              <Bar data={barData} options={barOptions} />
            </div>
          )}
        </div>

        {/* Doughnut Sân + Bảng Top VIP */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign size={18} className="text-blue-400" /> Tỷ trọng Doanh thu Sân
          </h3>
          {charts.revenueByCourt.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu sân</div>
          ) : (
            <div style={{ height: '180px', position: 'relative' }}>
              <Doughnut data={courtData} options={courtDoughnutOptions} />
            </div>
          )}

          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">🏆 Top Khách hàng VIP</h4>
            <div className="space-y-2">
              {topUsers.map((u: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-500 text-black' :
                      i === 1 ? 'bg-slate-400 text-black' :
                      i === 2 ? 'bg-amber-800 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>{i + 1}</div>
                    <div>
                      <div className="text-white text-sm font-semibold">{u.name}</div>
                      <div className="text-slate-500 text-xs">{u.bookings} lượt đặt</div>
                    </div>
                  </div>
                  <div className="text-teal-400 font-bold text-sm">
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(u.revenue)}
                  </div>
                </div>
              ))}
              {topUsers.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-4">Chưa có dữ liệu</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
