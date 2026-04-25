'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/auth.service';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await authService.login(data);
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('role', res.user?.role || 'USER'); // Lưu Role
      
      toast.success('Đăng nhập thành công!');
      setTimeout(() => {
        if (res.user?.role === 'ADMIN') {
          router.push('/admin/courts'); // Admin thì cho vô Admin
        } else {
          router.push('/'); // Khách thì ra trang chủ
        }
      }, 500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Sai email hoặc mật khẩu!');
    }
  };

  // Hứng token từ Google trả về trên URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const role = params.get('role');
    
    if (token) {
      localStorage.setItem('access_token', token);
      localStorage.setItem('role', role || 'USER');
      toast.success('Đăng nhập Google thành công!');
      setTimeout(() => {
        if (role === 'ADMIN') {
          router.push('/admin/courts');
        } else {
          router.push('/');
        }
      }, 500);
    }
  }, [router]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 rounded-3xl bg-slate-900/60 border border-slate-700/50 shadow-2xl backdrop-blur-2xl"
    >
      <Toaster position="top-right" />
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Chào mừng trở lại</h2>
        <p className="text-slate-400 mt-2 font-medium">Đăng nhập để đặt sân ngay hôm nay</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-500" />
            </div>
            <input 
              {...register('email')}
              className="block w-full pl-10 pr-3 py-3 border border-slate-600/50 rounded-xl bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
              placeholder="you@example.com"
            />
          </div>
          {errors.email && <p className="mt-1 text-sm text-rose-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Mật khẩu</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500" />
            </div>
            <input 
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="block w-full pl-10 pr-10 py-3 border border-slate-600/50 rounded-xl bg-slate-800/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
              placeholder="••••••••"
            />
            <button 
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-sm text-rose-400">{errors.password.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-slate-900 transition-all hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
        </button>
      </form>

      <div className="mt-7">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/80"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-slate-900/60 text-slate-400">Hoặc</span>
          </div>
        </div>

        <div className="mt-7">
          <Link href={`http://localhost:3001/auth/google`} className="w-full flex justify-center items-center py-3.5 px-4 border border-slate-600/80 rounded-xl shadow-sm bg-slate-800/40 text-sm font-bold text-white hover:bg-slate-700/60 transition-all">
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Đăng nhập bằng Google
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-slate-400">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
          Đăng ký ngay
        </Link>
      </p>
    </motion.div>
  );
}
