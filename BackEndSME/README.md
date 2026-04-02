# SME Backend API

Node.js ESM REST API cho hệ thống quản lý doanh nghiệp SME.

## Tech Stack

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| Node.js | ≥ 18 (ESM) | Runtime |
| Express | v5 | HTTP framework |
| MongoDB Native Driver | v6 | Database |
| JWT (jsonwebtoken) | v9 | Authentication |
| bcrypt | v6 | Password hashing |
| Winston | v3 | Logging |
| Swagger UI | v5 | API documentation |
| helmet, cors, express-rate-limit | — | Security |

## Chạy với Docker (khuyến nghị)

```bash
# Từ thư mục gốc SME-PJ/
docker compose up -d
```

API chạy tại: `http://localhost/api/v1`

## Chạy development (không dùng Docker)

Yêu cầu: Node.js ≥ 18, MongoDB đang chạy.

```bash
cd BackEndSME
npm install
npm run dev
```

## NPM Scripts

| Script | Lệnh | Mô tả |
|---|---|---|
| `npm run dev` | `nodemon index.js` | Development với auto-reload |
| `npm start` | `node index.js` | Production |
| `npm run seed` | `node seed.js` | Seed dữ liệu thủ công |

## Biến môi trường

| Biến | Mô tả | Ví dụ |
|---|---|---|
| `MONGO_URI` | URI kết nối MongoDB | `mongodb://db:27017` |
| `SME_DB_NAME` | Tên database | `SME_db_mongo` |
| `PORT` | Port API | `8000` (local) / `5000` (Docker) |
| `JWT_SECRET` | Secret cho access token | *(bắt buộc, dùng chuỗi ngẫu nhiên dài)* |
| `JWT_REFRESH_SECRET` | Secret cho refresh token | *(bắt buộc, khác JWT_SECRET)* |
| `ACCESS_EXPIRES` | Thời hạn access token | `15m` |
| `REFRESH_EXPIRES` | Thời hạn refresh token | `7d` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost,http://localhost:3000` |

File `.env` mẫu (local dev):
```env
MONGO_URI=mongodb://localhost:27017
SME_DB_NAME=SME_db_mongo
PORT=8000
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
ACCESS_EXPIRES=15m
REFRESH_EXPIRES=7d
```

> **Lưu ý bảo mật:** Thay thế JWT secrets mặc định trong `docker-compose.yml` trước khi deploy production.

## API Documentation

Swagger UI có sẵn khi server đang chạy:

- Docker: http://localhost/api-docs
- Local dev: http://localhost:8000/api-docs

Hỗ trợ Bearer token authentication để test endpoint trực tiếp trên browser.

## Seed Dữ Liệu

### Tự động khi khởi động

`seedIfEmpty(client)` được gọi tự động trong `index.js`:
- Collection `users` **rỗng** → seed toàn bộ 6 collections
- Đã có dữ liệu → **bỏ qua**, không ghi đè

### Thủ công

```bash
# Docker:
docker compose exec api node seed.js

# Local:
npm run seed
```

### Dữ liệu được seed

| Collection | Số lượng | Nội dung |
|---|---|---|
| `phongban_chucvu` | 6 | Phòng ban + chức vụ |
| `users` | 11 | Tài khoản các phòng ban (mật khẩu: `123456`) |
| `nguyen_lieu` | 10 | Nguyên vật liệu |
| `san_pham` | 10 | Sản phẩm |
| `bom_san_pham` | 4 | Bill of Materials |
| `don_hang` | 5 | Đơn hàng mẫu |

## Cấu trúc thư mục

```
BackEndSME/
├── index.js              # Entry point — kết nối DB, init DAOs, start server
├── server.js             # Express app, middleware, routes
├── seed.js               # Seed script (export seedIfEmpty + standalone)
├── config/
│   ├── database.js       # MongoDB connection helper
│   └── indexes.js        # Index management utilities
├── controllers/          # Nhận request, gọi service, trả response
├── models/               # MongoDB DAOs — toàn bộ query DB ở đây
├── routes/v1/            # Express routers (versioned)
├── services/             # Business logic, validation, transaction management
├── middleware/
│   ├── auth.js           # JWT verification
│   ├── asyncHandler.js   # Wrap async handlers
│   └── errorHandler.js   # Global error handler
└── utils/
    ├── ApiError.js        # Custom error class
    ├── response.js        # sendSuccess / sendError helpers
    └── logger.js          # Winston logger
```

## Kiến trúc luồng request

```
Request → Nginx:80 → api:5000
  → middleware (helmet, cors, rate-limit, sanitize)
  → route → verifyToken → controller
  → service (business logic, transaction)
  → DAO (MongoDB query)
  → response (sendSuccess / ApiError)
```
