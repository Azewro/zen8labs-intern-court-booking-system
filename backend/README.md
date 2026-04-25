# ⚙️ Backend - NestJS API

Bộ não xử lý logic của Hệ thống Đặt Sân Cầu Lông. Được xây dựng dựa trên NestJS và siêu ORM Prisma 7.

## 🛠️ Yêu cầu môi trường (Prerequisites)
- Node.js (Khuyên dùng v20 hoặc v22+)
- Cơ sở dữ liệu PostgreSQL (Đã chạy qua Docker ở thư mục gốc)

## 🚀 Hướng dẫn Cài đặt & Chạy (Setup Guide)

**1. Tải thư viện (Install Dependencies)**
Mở terminal tại thư mục `backend` và chạy:
```bash
npm install
```

**2. Cấu hình biến môi trường (Environment Variables)**
Tạo một file có tên là `.env` ở ngang hàng với file `package.json` trong thư mục `backend` và dán đoạn sau vào:
```env
# Cấu hình kết nối Database (127.0.0.1 để tránh lỗi IPv6 ::1 của Node)
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/court_booking_db?schema=public"

# Chìa khóa bảo mật cho JWT Token
JWT_SECRET="super-secret-key-for-zen8labs"

# [Tùy chọn] Cấu hình Đăng nhập bằng Google
GOOGLE_CLIENT_ID="Mã_Client_ID_của_bạn"
GOOGLE_CLIENT_SECRET="Mã_Client_Secret_của_bạn"
```

**3. Tạo bảng trong Cơ sở dữ liệu (Database Migration)**
Đồng bộ cấu trúc DB từ file `schema.prisma` xuống PostgreSQL:
```bash
npx prisma db push
```

**4. Khởi động Server API**
```bash
# Chạy ở chế độ Development (Tự động cập nhật khi sửa code)
npm run start:dev
```
Server API sẽ hoạt động tại địa chỉ: `http://localhost:3001`. Mọi thiết lập CORS đều đã được mở khóa để Frontend kết nối.
