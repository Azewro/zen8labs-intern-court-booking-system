import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Có thể thêm Interceptor ở đây để tự động đính JWT Token vào header ở các bài sau
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Thêm Interceptor để bắt lỗi 401 (Token hết hạn / Không hợp lệ)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Nếu lỗi trả về từ server là 401 Unauthorized
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        // Xóa token cũ
        localStorage.removeItem('access_token');
        localStorage.removeItem('user'); // Xóa luôn thông tin user nếu có lưu
        
        // Redirect về trang đăng nhập nếu chưa ở trang đăng nhập
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          // Dùng window.location.href thay vì router.push để force reload trạng thái ứng dụng
          window.location.href = '/login?session_expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
