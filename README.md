# 🏸 Zen8Labs Court Booking System

<div align="center">

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)

**Hệ thống đặt sân cầu lông trực tuyến Full-Stack** — Dự án thực tập Zen8Labs

[Demo](#demo) • [Tính năng](#tính-năng) • [Cài đặt](#cài-đặt-nhanh) • [API Docs](#api-endpoints) • [Kiến trúc](#kiến-trúc)

</div>

---

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Tech Stack](#tech-stack)
- [Kiến trúc hệ thống](#kiến-trúc)
- [Cài đặt nhanh](#cài-đặt-nhanh)
- [Biến môi trường](#biến-môi-trường)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Thiết kế kỹ thuật nổi bật](#thiết-kế-kỹ-thuật-nổi-bật)

---

## Tổng quan

Hệ thống cho phép người dùng xem lịch, đặt sân cầu lông theo giờ, hủy lịch và nhận email xác nhận. Admin có thể quản lý sân, duyệt đặt lịch, xem thống kê doanh thu qua Dashboard biểu đồ tương tác.

---

## Tính năng

### 👤 Người dùng
- Đăng ký / Đăng nhập (email + password, Google OAuth2)
- Quên mật khẩu & đặt lại qua email
- Xem danh sách sân với phân trang, tìm kiếm
- Xem lịch đặt sân theo ngày (slot đã đặt bị khóa realtime)
- Đặt sân với **Dynamic Pricing** (giá tăng theo Giờ Vàng)
- Áp dụng mã Voucher giảm giá
- Hủy lịch (trước 2 tiếng so với giờ đặt)
- Xem lịch sử đặt sân cá nhân
- Nhận **email xác nhận** ngay sau khi đặt thành công

### 🔧 Admin
- Quản lý sân: Tạo, Sửa, Đóng/Tạm ngừng sân (**Soft Delete**)
- Quản lý đặt lịch: Duyệt / Từ chối booking
- Quản lý voucher khuyến mãi (tạo, kích hoạt/vô hiệu hóa)
- Quản lý người dùng (xem, khóa tài khoản)
- **Dashboard thống kê** với biểu đồ:
  - 📈 Biến động doanh thu theo ngày
  - 🕐 Mật độ khách theo khung giờ
  - 🥧 Tỷ lệ trạng thái đặt sân (Pie chart)
  - 🏸 Tỷ trọng doanh thu theo từng sân
  - 🏆 Bảng xếp hạng khách hàng VIP
- Lọc thống kê theo: 7 ngày / 30 ngày / Tháng này / Năm nay

---

## Tech Stack

| Tầng | Công nghệ |
|------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Chart.js |
| **Backend** | NestJS, Prisma ORM 7, JWT + Passport, Google OAuth2 |
| **Database** | PostgreSQL 16 |
| **Email** | Nodemailer + SMTP (Gmail) |
| **Infra** | Docker, Docker Compose |
| **Auth** | JWT Access Token + bcrypt password hashing |

---

## Kiến trúc

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                  │
│              Next.js 16 + React 19                   │
│         Port 3000 │ Tailwind CSS │ Chart.js          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST (Axios)
┌──────────────────────▼──────────────────────────────┐
│                  API SERVER                          │
│              NestJS (Port 3001)                      │
│  ┌──────────┐  ┌─────────┐  ┌──────────────────┐   │
│  │Controller│→ │ Service │→ │  Prisma (ORM)    │   │
│  │(Route)   │  │(Logic)  │  │  (DB adapter)    │   │
│  └──────────┘  └─────────┘  └────────┬─────────┘   │
└───────────────────────────────────────┼─────────────┘
                                        │
┌───────────────────────────────────────▼─────────────┐
│                  PostgreSQL DB                       │
│  users │ courts │ bookings │ vouchers                │
└─────────────────────────────────────────────────────┘
```

**Các module Backend:**
```
src/
├── auth/          # JWT Strategy, Google OAuth, Guards, Reset Password
├── users/         # CRUD người dùng, phân quyền
├── courts/        # Quản lý sân, Soft Delete, thông báo đóng cửa
├── bookings/      # Đặt sân, Overlap check, Dynamic Pricing, Voucher
├── vouchers/      # CRUD mã giảm giá
├── analytics/     # Dashboard thống kê, aggregation queries
├── mail/          # Nodemailer service, email templates
└── prisma/        # Prisma client singleton
```

---

## Hướng Dẫn Khởi Chạy (Run & Development Guide)

### Yêu cầu hệ thống
- Node.js >= 18
- Docker & Docker Compose
- Git

### 🚀 Cách A: Khởi Chạy Gọn Nhẹ Bằng Một Lệnh (Local One-Command Startup)

Cách tốt nhất để khởi động toàn bộ dự án (Database Docker + Backend NestJS + Frontend Next.js) chỉ bằng 1 câu lệnh duy nhất từ thư mục gốc:

1. **Cài đặt toàn bộ dependencies:**
   ```bash
   # Chạy tại thư mục gốc, hệ thống tự động cài cho cả Backend và Frontend qua prefix script
   npm install
   ```

2. **Khởi chạy toàn bộ hệ thống:**
   ```bash
   # Khởi động DB Postgres trong container Docker + khởi chạy Backend & Frontend song song
   npm run dev:all
   ```

---

### 🐳 Cách B: Quản Lý Cơ Sở Dữ Liệu Qua Docker (Docker Commands)

Nếu bạn muốn tự quản lý cơ sở dữ liệu Docker hoặc quản lý container riêng lẻ:

* **Bật Postgres Database (Port 5432):**
  ```bash
  npm run docker:up
  ```

* **Xem logs hoạt động của Database:**
  ```bash
  npm run docker:logs
  ```

* **Dừng và dọn dẹp DB Container:**
  ```bash
  npm run docker:down
  ```

---

### 🛠️ Cách C: Cài đặt chi tiết từng bước thủ công (Manual Step-by-Step Setup)

Nếu bạn muốn cài đặt và chạy từng service độc lập trong các tab terminal khác nhau:

#### Bước 1: Khởi động Database
```bash
docker compose up -d
```

#### Bước 2: Cài đặt Backend NestJS
```bash
cd backend
npm install
cp .env.example .env                  # Chỉnh sửa cấu hình DB & SMTP nếu cần
npx prisma migrate dev                # Đồng bộ database schema
npx prisma generate                   # Generate Prisma client
npm run start:dev                     # Chạy backend dev server (Port 3001)
```

#### Bước 3: Cài đặt Frontend Next.js
```bash
cd ../frontend
npm install
cp .env.local.example .env.local      # Cấu hình URL backend
npm run dev                           # Chạy frontend dev server (Port 3000)
```

### Bước 5: Truy cập
| Dịch vụ | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API Server | http://localhost:3001 |
| Swagger API Docs | http://localhost:3001/api |

---

## Biến môi trường

### Backend (`backend/.env`)
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/court_booking_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Google OAuth2
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email (SMTP - Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"    # Dùng App Password của Google, không phải mật khẩu thường

# Frontend URL (cho redirect links trong email)
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## API Endpoints

### 🔐 Authentication
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/auth/register` | Đăng ký tài khoản | ❌ |
| POST | `/auth/login` | Đăng nhập | ❌ |
| GET | `/auth/google` | Đăng nhập Google | ❌ |
| POST | `/auth/forgot-password` | Gửi email reset mật khẩu | ❌ |
| POST | `/auth/reset-password` | Đặt mật khẩu mới | ❌ |
| GET | `/auth/me` | Lấy thông tin user hiện tại | ✅ User |

### 🏸 Sân (Courts)
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/courts?page=1&limit=10&search=` | Danh sách sân (có phân trang) | ❌ |
| GET | `/courts/:id` | Chi tiết sân | ❌ |
| POST | `/courts` | Tạo sân mới | ✅ Admin |
| PATCH | `/courts/:id` | Cập nhật sân | ✅ Admin |
| DELETE | `/courts/:id` | Đóng sân vĩnh viễn (Soft Delete) | ✅ Admin |

### 📅 Đặt sân (Bookings)
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/bookings/court/:id?date=2025-01-01` | Xem lịch sân theo ngày | ❌ |
| POST | `/bookings` | Tạo đặt sân mới | ✅ User |
| POST | `/bookings/calculate-price` | Tính giá trước khi đặt | ✅ User |
| GET | `/bookings/my` | Lịch sử đặt sân của tôi | ✅ User |
| PATCH | `/bookings/:id/cancel` | Hủy đặt sân | ✅ User |
| GET | `/bookings?page=1&status=` | Tất cả booking (Admin) | ✅ Admin |
| PATCH | `/bookings/:id/status` | Duyệt/Từ chối booking | ✅ Admin |

### 🎟️ Voucher
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/vouchers` | Danh sách voucher | ✅ Admin |
| POST | `/vouchers` | Tạo voucher mới | ✅ Admin |
| PATCH | `/vouchers/:id` | Cập nhật voucher | ✅ Admin |
| DELETE | `/vouchers/:id` | Xóa voucher | ✅ Admin |

### 📊 Thống kê
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/analytics/dashboard?dateRange=thisMonth` | Dashboard thống kê | ✅ Admin |

> **dateRange options:** `7days` \| `30days` \| `thisMonth` \| `thisYear`

---

## Database Schema

```
users
├── id (UUID, PK)
├── email (UNIQUE)
├── password (bcrypt hash)
├── full_name
├── phone_number
├── google_id
├── role (ADMIN | USER)
└── is_active

courts
├── id (UUID, PK)
├── name, location, description, image_url
├── price_per_hour
├── peak_price_per_hour, peak_start_hour, peak_end_hour  ← Dynamic Pricing
├── status (ACTIVE | SUSPENDED | CLOSED)
└── deleted_at  ← Soft Delete

bookings
├── id (UUID, PK)
├── user_id (FK → users)
├── court_id (FK → courts)
├── voucher_id (FK → vouchers, nullable)
├── start_time, end_time
├── total_price
├── status (PENDING | CONFIRMED | CANCELLED)
├── payment_status (UNPAID | PAID)
├── payment_method (CASH | ONLINE)
│
│   [INDEXES]
├── INDEX(court_id, start_time, end_time)  ← Overlap check query
├── INDEX(user_id, created_at)             ← Lịch sử cá nhân
└── INDEX(status, created_at)             ← Admin dashboard filter

vouchers
├── id (UUID, PK)
├── code (UNIQUE)
├── discount_percent
├── max_discount
└── valid_from, valid_to, is_active
```

---

## Thiết kế kỹ thuật nổi bật

### 1. Chống Double-Booking với Database Transaction
Toàn bộ luồng đặt sân (kiểm tra overlap → tính giá → tạo booking) được bọc trong `prisma.$transaction()` để đảm bảo tính atomicity:
```typescript
await this.prisma.$transaction(async (tx) => {
  // 1. Kiểm tra overlap (NewStart < ExistingEnd AND NewEnd > ExistingStart)
  // 2. Tính Dynamic Price theo khung giờ
  // 3. Validate và áp dụng Voucher
  // 4. Tạo Booking
  // → Nếu bất kỳ bước nào fail, toàn bộ rollback
});
```

### 2. Dynamic Pricing — Giá theo Khung giờ Vàng
Giá được tính từng mốc 30 phút, tự động áp dụng `peakPricePerHour` nếu giờ đặt nằm trong `[peakStartHour, peakEndHour)`.

### 3. Auto-refresh Realtime (Polling 6 giây)
Tất cả trang Admin và User tự động refresh dữ liệu ngầm mỗi 6 giây mà không làm gián đoạn thao tác người dùng.

### 4. Email Notifications với Template HTML
Ba loại email được gửi tự động: xác nhận đặt sân, thông báo sân đóng cửa (phân loại ưu tiên URGENT/VIP/NORMAL), và reset mật khẩu.

---

## Tài khoản Demo

| Role | Email | Password |
|------|-------|---------|
| Admin | hatsunemikudangyeu06102004@gmail.com | Abc1234 |
| User | nguyen.van.a@gmail.com | Abc1234 |

---

<div align="center">
Made with ❤️ by Azewro — Zen8Labs Intern 2025
</div>