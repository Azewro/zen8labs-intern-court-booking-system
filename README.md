# 🏸 Zen8Labs Court Booking System

Chào mừng đến với **Hệ thống đặt sân cầu lông Zen8Labs**! Đây là một dự án Full-stack được thiết kế với kiến trúc Clean Architecture, đáp ứng đầy đủ các tiêu chuẩn khắt khe của một ứng dụng thực tế.

## 🚀 Công nghệ sử dụng (Tech Stack)

- **Frontend:** Next.js 15, React, Tailwind CSS, Framer Motion (Animations), React Hook Form & Zod.
- **Backend:** NestJS, Prisma ORM 7, JWT Auth, Google OAuth20.
- **Cơ sở dữ liệu:** PostgreSQL.
- **Hạ tầng:** Docker & Docker Compose.

## 📁 Cấu trúc dự án (Monorepo)

Dự án được chia làm 2 thư mục chính độc lập:
- `/frontend`: Giao diện người dùng Next.js (Chạy ở cổng `3000`).
- `/backend`: API Server NestJS (Chạy ở cổng `3001`).

## ⚡ Hướng dẫn chạy dự án (Quick Start)

### Bước 1: Khởi động Cơ sở dữ liệu
Đảm bảo bạn đã cài đặt và bật Docker Desktop. Mở terminal ở thư mục gốc (root) và gõ:
```bash
docker-compose up -d
```
*(Lệnh này sẽ tải và chạy một container PostgreSQL ở cổng 5432).*

### Bước 2: Khởi động Backend
Vào thư mục `backend/` và làm theo các bước hướng dẫn chi tiết tại [Backend README](./backend/README.md).

### Bước 3: Khởi động Frontend
Vào thư mục `frontend/` và làm theo các bước hướng dẫn chi tiết tại [Frontend README](./frontend/README.md).