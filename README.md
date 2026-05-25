# SME Management System

Hệ thống quản lý doanh nghiệp vừa và nhỏ (SME) — full-stack, chạy hoàn toàn qua Docker.

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query v5 · Ant Design 6 |
| Backend | Node.js ESM · Express 5 · Socket.io 4 · JWT Auth · Winston Logger |
| Database | MongoDB 7 |
| Infrastructure | Docker · Nginx reverse proxy · Gzip · WebSocket |

## Yêu cầu

**Chỉ cần Docker Desktop.** Không cần cài Node.js, npm, hay MongoDB trên máy.

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)

## Khởi động nhanh

```bash
git clone <repo-url>
cd sme-pj
docker compose up -d
```

Lần đầu chạy: Docker build image và tự động seed dữ liệu mẫu. Chờ ~1–2 phút, sau đó truy cập:

**http://localhost**

## URL truy cập

| Service | URL | Mô tả |
|---|---|---|
| Ứng dụng web | http://localhost | Giao diện chính (qua Nginx) |
| API Backend | http://localhost/api/v1 | REST API (qua Nginx) |
| Swagger Docs | http://localhost/api-docs | Tài liệu API tương tác |
| Socket.io | ws://localhost/socket.io/ | WebSocket real-time (qua Nginx) |
| MongoDB | localhost:27017 | Chỉ dùng cho dev / GUI tool |

## Tính năng

| Module | Mô tả |
|---|---|
| Dashboard | Tổng quan KPI, biểu đồ doanh thu, danh sách đơn hàng gần đây |
| Đơn hàng bán | Tạo, theo dõi và quản lý đơn hàng bán hàng |
| Sản phẩm | Danh mục sản phẩm, lệnh sản xuất |
| Nguyên liệu | Danh mục nguyên liệu, đơn mua hàng, phiếu nhập kho |
| Kho | Tồn kho nguyên liệu và thành phẩm |
| Điều chỉnh kho | Tạo và phê duyệt phiếu điều chỉnh tồn kho |
| Nhân viên | Quản lý danh sách nhân viên |
| Phòng ban | Quản lý phòng ban và chức vụ |
| Chấm công | Theo dõi check-in / check-out nhân viên |
| Audit Log | Lịch sử thao tác hệ thống (chỉ admin) |
| Tài khoản | Quản lý tài khoản người dùng |

## Real-time (Socket.io)

Backend tích hợp Socket.io với xác thực JWT qua cookie. Sau khi đăng nhập, frontend nhận thông báo real-time qua `NotificationBell`:

| Room | Nhận thông báo |
|---|---|
| `room:all_users` | Tất cả người dùng đã đăng nhập |
| `room:admin` | Phòng giám đốc / Giám đốc |
| `room:approver` | Thủ kho |
| `user:<tai_khoan>` | Cá nhân từng user |

Nginx proxy WebSocket tại `/socket.io/` với `proxy_read_timeout 3600s`.

## Tài khoản mẫu

Tất cả tài khoản dùng mật khẩu: **`123456`**

| Tài khoản | Phòng ban | Chức vụ |
|---|---|---|
| `admin` | Phòng giám đốc | Giám đốc (toàn quyền) |
| `truongkd` | Phòng kinh doanh | Trưởng phòng kinh doanh |
| `sale` | Phòng kinh doanh | Nhân viên kinh doanh |
| `ketoantr` | Phòng kế toán | Kế toán trưởng |
| `ketoan` | Phòng kế toán | Nhân viên kế toán |
| `nhansutr` | Phòng nhân sự | Trưởng phòng nhân sự |
| `nhansu` | Phòng nhân sự | Nhân viên nhân sự |
| `thukho` | Phòng kho | Thủ kho |
| `nhanvienkho` | Phòng kho | Nhân viên kho |
| `truongxuong` | Phòng sản xuất | Trưởng xưởng |
| `sanxuat` | Phòng sản xuất | Công nhân sản xuất |

## Cấu trúc dự án

```
sme-pj/
├── docker-compose.yml          # Định nghĩa 4 services: nginx, api, frontend, db
├── nginx/
│   └── default.conf            # Reverse proxy + WebSocket + Gzip + Security headers
├── BackEndSME/                 # Node.js Express API (ESM)
│   ├── controllers/            # Request handlers (audit log, BOM, đơn hàng, kho…)
│   ├── models/                 # MongoDB DAOs
│   ├── routes/                 # REST routes /api/v1/*
│   ├── services/               # Business logic
│   ├── middleware/             # auth, asyncHandler, validate, requestLogger…
│   ├── utils/
│   │   ├── auditLogger.js      # Ghi audit log vào collection audit_log
│   │   ├── socketManager.js    # Socket.io: init, auth, rooms, broadcast helpers
│   │   ├── cache.js            # In-memory cache (node-cache)
│   │   └── logger.js           # Winston structured logger
│   ├── seed.js                 # Seed dữ liệu mẫu (chỉ chạy nếu DB trống)
│   └── index.js                # Entry point: connect DB → inject DAOs → init Socket.io → listen
└── FrontEndSME/                # Next.js 16 frontend
    ├── src/
    │   ├── app/
    │   │   ├── (modules)/      # Các trang: dashboard, sales, product, material…
    │   │   │   ├── audit-log/  # Trang lịch sử thao tác (admin only)
    │   │   │   └── dieu-chinh-kho/  # Trang điều chỉnh tồn kho
    │   │   └── actions/        # Server Actions gọi API backend
    │   ├── components/
    │   │   └── NotificationBell.tsx  # Real-time notification bell (Socket.io)
    │   ├── hooks/              # TanStack Query hooks
    │   │   └── useSocket.tsx   # Socket.io client hook
    │   └── lib/
    │       ├── http.ts         # SSR HTTP client (sử dụng API_INTERNAL_URL)
    │       └── http.client.ts  # Client-side HTTP (axios)
    └── Dockerfile
```

## Lệnh Docker thường dùng

```bash
# Khởi động tất cả services
docker compose up -d

# Build lại và khởi động (sau khi thay đổi code)
docker compose up --build -d

# Xem logs backend
docker compose logs api --tail=50 -f

# Xem logs frontend
docker compose logs frontend --tail=50 -f

# Dừng (giữ nguyên data)
docker compose down

# Dừng + xóa toàn bộ data (reset hoàn toàn)
docker compose down -v
```

## Biến môi trường (docker-compose.yml)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `JWT_SECRET` | *(cần thay)* | Secret ký access token |
| `JWT_REFRESH_SECRET` | *(cần thay)* | Secret ký refresh token |
| `ACCESS_EXPIRES` | `15m` | Thời hạn access token |
| `REFRESH_EXPIRES` | `7d` | Thời hạn refresh token |
| `ALLOWED_ORIGINS` | `http://localhost,...` | CORS & Socket.io allowed origins |
| `MONGO_URI` | `mongodb://db:27017` | URI kết nối MongoDB |
| `SME_DB_NAME` | `SME_db_mongo` | Tên database |

## Xử lý sự cố

**Reset database về trạng thái ban đầu:**
```bash
docker compose down -v && docker compose up -d
```

**Xem log lỗi:**
```bash
docker compose logs api --tail=50
```

**Seed lại thủ công** (seed tự động bỏ qua nếu đã có dữ liệu — cần xóa collection `users` trước):
```bash
docker compose exec api node seed.js
```

**Port 80 bị chiếm bởi ứng dụng khác:**

Sửa trong `docker-compose.yml`:
```yaml
nginx:
  ports:
    - "8080:80"   # đổi 80 thành port khác
```
