import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      {/* Cột trái: Form (Con cái) */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-8 bg-slate-950 z-10 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/20 to-slate-950/20" />
        <div className="w-full max-w-md relative z-10">
          {children}
        </div>
      </div>

      {/* Cột phải: Hình ảnh trang trí phong cách Premium */}
      <div className="hidden md:flex w-1/2 relative bg-indigo-600 overflow-hidden items-center justify-center">
        {/* Placeholder gradient siêu ngầu */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-slate-900 opacity-90 z-0" />
        
        {/* Pattern trang trí lưới mờ ảo */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />

        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center text-white">
          <div className="mb-6 p-5 rounded-3xl bg-white/10 backdrop-blur-lg ring-1 ring-white/20 shadow-2xl shadow-indigo-500/50 transition-transform hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl drop-shadow-lg mb-4">
            Zen8Labs Arena
          </h1>
          <p className="text-lg text-indigo-100 max-w-md font-medium">
            Hệ thống đặt sân cầu lông chuyên nghiệp, hiện đại và siêu tốc. Trải nghiệm ngay!
          </p>
        </div>
      </div>
    </div>
  );
}
