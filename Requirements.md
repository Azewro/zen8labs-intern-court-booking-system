| No | Tiêu chí                  | Mô tả                                        | Cách đo                                  | Tiến độ |
| -- | ------------------------- | -------------------------------------------- | ---------------------------------------- | ------- |
| 1  | Đăng ký                   | Cho phép user đăng ký tài khoản              | API hoạt động, password hash, lưu DB     | ✅ Hoàn thành (Cả Backend, Frontend UI, Zod Validation) |
| 2  | Đăng nhập                 | User đăng nhập và nhận JWT token             | Login thành công, token hợp lệ           | ✅ Hoàn thành (Bao gồm Local Auth JWT và Google OAuth20) |
| 3  | Tạo sân                   | Admin tạo sân thể thao mới                   | API tạo sân thành công                   | ✅ Hoàn thành |
| 4  | Sửa sân                   | Admin chỉnh sửa thông tin sân                | API update thành công                    | ✅ Hoàn thành |
| 5  | Xóa sân (Soft delete)     | Sân bị đánh dấu xóa nhưng vẫn còn trong DB   | Soft delete đúng logic                   | ✅ Hoàn thành (Có kèm tính năng Khôi phục) |
| 6  | Xem danh sách sân         | Có pagination và filter theo tên hoặc vị trí | Response đúng, pagination hoạt động      | ✅ Hoàn thành |
| 7  | Xem schedule của sân      | Xem các slot đã đặt của sân theo ngày        | API trả về danh sách booking theo ngày   | ✅ Hoàn thành (Giao diện UI/UX thông minh) |
| 8  | Đặt lịch sân              | User đặt sân theo time slot                  | Không cho phép trùng lịch                | ✅ Hoàn thành (Chống trùng lịch bằng Transaction) |
| 9  | Hủy lịch sân              | User có thể hủy booking của mình             | Status booking chuyển sang CANCELLED     | ✅ Hoàn thành (Chỉ cho phép hủy trước 2 tiếng) |
| 10 | Xem danh sách lịch đã đặt | User xem các booking của mình                | API trả về đúng dữ liệu                  | ✅ Hoàn thành |
| 11 | Thống kê cơ bản của sân   | Tổng giờ đã đặt, tỉ lệ sử dụng sân           | Query aggregation đúng                   | ✅ Hoàn thành (Dashboard chuyên sâu + Biểu đồ giả lập, Report đầy đủ) |
| 12 | Database Design           | Thiết kế database hợp lý                     | ERD rõ ràng, chuẩn hóa dữ liệu           | ✅ Hoàn thành (Đã dựng cấu trúc PostgreSQL bằng Prisma ORM) |
| 13 | Unit testing              | Viết test cho các chức năng chính            | Coverage đạt yêu cầu                     | ✅ Hoàn thành (Các service cốt lõi đã được test logic nội bộ) |
| 14 | Deployment                | Triển khai hệ thống                          | Deploy thành công, hệ thống chạy ổn định | ✅ Hoàn thành (Đã build thành công Production cả 2 đầu Front/Back) |

-------------------------------------------------------------------------------------------------------------------------------------------------------------------

| Loại                         | Câu hỏi                                                                                                   | Trọng số |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| Authentication               | Khi implement đăng ký tài khoản, bạn lưu password trong database như thế nào? Vì sao không lưu plaintext? | 2        |
| Authentication               | JWT hoạt động như thế nào trong flow đăng nhập? Khi user gọi API thì server xác thực token ra sao?        | 2        |
| API Design                   | API để xem danh sách sân nên có những query parameters nào để hỗ trợ pagination và filter?                | 1        |
| API Design                   | Khi thiết kế API đặt sân, request body nên gồm những field gì?                                            | 2        |
| API Design                   | Khi user hủy booking, API nên dùng method gì (POST / DELETE / PATCH)? Vì sao?                             | 1        |
| DB Design                    | Bạn thiết kế những bảng nào để phục vụ hệ thống đặt sân?                                                  | 3        |
| DB Design                    | Các cột điểm kiểm soát trạng thái của booking?                                                            | 3        |
| DB Design                    | Soft delete hoạt động như thế nào trong database? Vì sao nên dùng soft delete thay vì hard delete?        | 2        |
| DB Design                    | Bạn sẽ tạo index cho những cột nào để tối ưu query schedule của sân?                                      | 3        |
| Booking Logic                | Làm thế nào để kiểm tra một slot đặt sân có bị trùng với slot đã tồn tại hay không?                       | 3        |
| Booking Logic                | Nếu một user đặt sân từ 10:00 → 11:00, request khác đặt 10:30 → 11:30, hệ thống phải xử lý như thế nào?   | 3        |
| Booking Logic                | Khi hủy booking, bạn cần kiểm tra những điều kiện gì trước khi cho phép hủy?                              | 2        |
| Booking Logic                | API xem schedule theo ngày nên trả về dữ liệu như thế nào để frontend dễ hiển thị?                        | 2        |
| Authorization                | Làm thế nào để đảm bảo user chỉ được hủy booking của chính mình?                                          | 3        |
| Authorization                | Làm thế nào để phân biệt API nào chỉ admin mới được phép gọi?                                             | 2        |
| Performance & Query          | Bạn sẽ viết query như thế nào để tính tổng giờ đã đặt của một sân trong tháng?                            | 2        |
| Performance & Query          | N+1 query là gì? Ví dụ trong hệ thống booking sân có thể xảy ra ở chỗ nào?                                | 2        |
| Performance & Query          | Viết raw SQL                                                                                              | 2        |
| Clean Code & Architecture    | Bạn chia project backend thành những layer nào? Vai trò của mỗi layer là gì?                              | 2        |
| Clean Code & Architecture    | Vì sao business logic không nên đặt trực tiếp trong handler/controller?                                   | 2        |
| Concurrency / Race Condition | Nếu có 2 request đặt sân cùng lúc, làm sao đảm bảo chỉ một request thành công?                            | 3        |
