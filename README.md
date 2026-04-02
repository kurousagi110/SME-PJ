# 🚀 Hệ thống Quản trị Doanh nghiệp SME (Full-Stack)

Dự án này là một giải pháp quản trị toàn diện dành cho các Doanh nghiệp Vừa và Nhỏ (SME). Hệ thống được thiết kế theo kiến trúc Micro-services cơ bản, tối ưu hóa hiệu năng, đảm bảo tính toàn vẹn dữ liệu và sẵn sàng triển khai thực tế (Production-ready).

---

## 💎 Những "Tinh túy" của dự án (Key Highlights)

Dự án không chỉ là CRUD cơ bản mà được áp dụng các tiêu chuẩn thiết kế phần mềm doanh nghiệp:

### 1. Kiến trúc & Toàn vẹn dữ liệu (Backend)
- **Service-Oriented Architecture (SOA):** Tách biệt hoàn toàn Controller (tiếp nhận request), Service (xử lý logic nghiệp vụ) và Model (truy xuất DB). Không có "Fat Controllers".
- **MongoDB Transactions:** Sử dụng Session/Transaction nguyên bản (Native Driver) cho các luồng rủi ro cao (ví dụ: Tạo Đơn hàng + Trừ Kho). Đảm bảo tính ACID: Nếu lỗi một bước, toàn bộ giao dịch sẽ Rollback, không bao giờ có tình trạng lệch kho.
- **Bảo mật & Chuẩn hóa:** Global Error Handling, Response format thống nhất 100%, bảo mật bằng Helmet, XSS/NoSQL Injection prevention và Winston Logging.

### 2. Tối ưu Trải nghiệm & Hiệu năng (Frontend)
- **Feature-Based Structure:** Tổ chức thư mục Next.js theo từng phân hệ nghiệp vụ (Inventory, Orders, Payroll), giúp dễ dàng scale dự án khi có thêm tính năng mới.
- **TanStack Query (React Query):** Quản lý State Server hoàn hảo. Cache dữ liệu thông minh, tự động cập nhật ngầm (background refetch), loại bỏ hoàn toàn tình trạng Stale Data và giảm tải tối đa cho Backend.
- **Strict Type Safety & UI:** Sử dụng TypeScript 100%, kết hợp Zod Validation cho các form phức tạp (BOM). Giao diện hiện đại, tái sử dụng cao với Tailwind CSS và Shadcn/UI.

### 3. Vận hành & Triển khai (DevOps)
- **Dockerized Full-Stack:** Đóng gói hoàn chỉnh Frontend, Backend và Database thành các containers độc lập.
- **Nginx Reverse Proxy:** Nginx đóng vai trò là cửa ngõ duy nhất (Cổng 80). Tự động điều hướng file tĩnh cho Frontend và uỷ quyền (proxy pass) các request `/api/v1/*` vào Backend bảo mật bên trong, giải quyết triệt để lỗi CORS.

---

## 📁 Cấu trúc Thư mục Tổng quan

```text
SME-PJ/
├── BackEndSME/               # Node.js API (Cổng nội bộ: 5000)
│   ├── src/
│   │   ├── controllers/      # Nhận Request, Trả Response
│   │   ├── services/         # Logic nghiệp vụ SME (Core)
│   │   ├── models/           # MongoDB DAOs
│   │   └── routes/v1/        # API Routes
│   └── Dockerfile            # Cấu hình build API Image
│
├── FrontEndSME/              # Next.js App Router (Cổng nội bộ: 3000)
│   ├── src/
│   │   ├── app/              # UI Pages (Routing)
│   │   ├── features/         # Logic phân tách theo nghiệp vụ (Orders, BOM...)
│   │   ├── hooks/api/        # TanStack Query Hooks
│   │   └── components/       # Shared UI (Shadcn, DataTable)
│   └── Dockerfile            # Cấu hình build đa bước (Multi-stage)
│
├── nginx/
│   └── default.conf          # Nginx Routing & Proxy Pass rules
│
└── docker-compose.yml        # Orchestration (Kết nối Frontend, Backend, Mongo, Nginx)
```
## 🚀 Hướng dẫn Cài đặt & Khởi chạy (Getting Started)

Dự án hỗ trợ 2 môi trường khởi chạy: **Docker** (khuyên dùng để xem thành quả hoặc deploy) và **Local** (dành cho quá trình phát triển, code trực tiếp).

### 🛠 Yêu cầu tiên quyết (Prerequisites)
- **Git** để clone dự án.
- **Docker & Docker Compose** (Nếu chạy cách 1).
- **Node.js v18+** và **MongoDB** (Nếu chạy cách 2).

### 📝 Bước 1: Cấu hình Biến môi trường (.env)
Trước khi chạy, bạn cần tạo file `.env` cho cả Backend và Frontend.

**1. Tại thư mục `BackEndSME/`**, tạo file `.env`:
```env
PORT=5000
DB_URI=mongodb://db:27017/sme_database # Đổi 'db' thành 'localhost' nếu chạy Local không dùng Docker
DB_NAME=sme_database
JWT_SECRET=your_super_secret_jwt_key_here
ALLOWED_ORIGINS=http://localhost,http://localhost:3000
```

**2. Tại thư mục `FrontEndSME/`, tạo file `.env`:**
```env
NEXT_PUBLIC_API_URL=/api/v1 # Nginx sẽ tự động proxy vào Backend
```
## 🐳 Cách 1: Chạy bằng Docker (Khuyên dùng)
Đây là cách nhanh nhất. Docker sẽ tự động cài đặt Database, Node.js, cài các package và kết nối qua Nginx.

Mở Terminal tại thư mục gốc của dự án (SME-PJ/).

Chạy lệnh Build và Start:

Bash
docker compose up --build -d
Chờ khoảng 1-2 phút để Docker tải image và khởi động. Sau đó truy cập:

Frontend UI: http://localhost

Backend API: http://localhost/api/v1/...

Để xem log lỗi nếu có:
```
Bash
docker compose logs -f api       # Xem log của Backend
docker compose logs -f frontend  # Xem log của Frontend
Để tắt dự án:
```

```
Bash
docker compose down

```
## 💻 Cách 2: Chạy Local (Dành cho Development)
Sử dụng cách này khi bạn muốn sửa code và thấy giao diện thay đổi ngay lập tức (Hot-reload) mà không cần build lại Docker.

1. Khởi động Database (MongoDB):
Đảm bảo bạn đã cài MongoDB compass hoặc chạy MongoDB local ở cổng 27017.
(Lưu ý: Đổi DB_URI trong BackEndSME/.env thành mongodb://localhost:27017/sme_database)

2. Khởi động Backend:
Mở Terminal 1:

Bash
cd BackEndSME
npm install
npm run dev
Backend sẽ chạy tại: http://localhost:5000

3. Khởi động Frontend:
(Lưu ý: Khi chạy dev local không qua Nginx, đổi NEXT_PUBLIC_API_URL trong FrontEndSME/.env thành http://localhost:5000/api/v1)
Mở Terminal 2:

Bash
```
cd FrontEndSME
npm install
npm run dev
Frontend sẽ chạy tại: http://localhost:3000
```