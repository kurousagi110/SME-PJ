# SME Management System

Hệ thống quản lý doanh nghiệp vừa và nhỏ (SME) — full-stack, chạy hoàn toàn qua Docker.

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS · TanStack Query |
| Backend | Node.js ESM · Express 5 · JWT Auth |
| Database | MongoDB 7 |
| Infrastructure | Docker · Nginx reverse proxy |

## Yêu cầu

**Chỉ cần Docker Desktop.** Không cần cài Node.js, npm, hay MongoDB trên máy.

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)

## Khởi động nhanh

```bash
git clone <repo-url>
cd SME-PJ
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
| MongoDB | localhost:27017 | Chỉ dùng cho dev / GUI tool |

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
SME-PJ/
├── docker-compose.yml      # Định nghĩa toàn bộ services
├── nginx/
│   └── default.conf        # Reverse proxy config
├── BackEndSME/             # Node.js Express API
│   ├── controllers/
│   ├── models/             # MongoDB DAOs
│   ├── routes/v1/
│   ├── services/
│   ├── middleware/
│   ├── seed.js             # Seed dữ liệu mẫu
│   └── index.js
└── FrontEndSME/            # Next.js frontend
    ├── src/
    │   ├── app/            # App Router + Server Actions
    │   ├── components/     # UI components (Shadcn)
    │   ├── hooks/          # TanStack Query hooks
    │   └── types/
    └── Dockerfile
```

## Lệnh Docker thường dùng

```bash
# Khởi động tất cả services
docker compose up -d

# Xem logs backend
docker compose logs api --tail=50 -f

# Xem logs frontend
docker compose logs frontend --tail=50 -f

# Dừng (giữ nguyên data)
docker compose down

# Dừng + xóa toàn bộ data (reset hoàn toàn)
docker compose down -v
```

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
