# 🎨 Frontend - Next.js UI

Mặt tiền "Premium" của Hệ thống Đặt Sân Cầu Lông. Ứng dụng phong cách thiết kế Glassmorphism (Kính mờ) và chuyển động mượt mà (Framer Motion).

## 🛠️ Yêu cầu môi trường (Prerequisites)
- Node.js (Khuyên dùng v20 hoặc v22+)
- Backend API (Phải được bật và chạy ở cổng 3001)

## 🚀 Hướng dẫn Cài đặt & Chạy (Setup Guide)

**1. Tải thư viện (Install Dependencies)**
Mở terminal tại thư mục `frontend` và chạy:
```bash
npm install
```

**2. Cấu hình biến môi trường (Environment Variables)**
Tạo một file có tên là `.env.local` ở thư mục `frontend` và dán dòng sau vào:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```
*(Đây là cầu nối giúp Frontend biết cần phải gửi dữ liệu đăng nhập/đăng ký sang địa chỉ nào).*

**3. Khởi động Giao diện**
```bash
# Chạy ở chế độ Development
npm run dev
```

Giao diện sẽ hiển thị tại địa chỉ: `http://localhost:3000`. 
Mời bạn truy cập `http://localhost:3000/login` để chiêm ngưỡng tác phẩm!
