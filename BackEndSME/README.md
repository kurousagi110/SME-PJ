# BackEndSME

A robust **Node.js back-end system** for Small and Medium Enterprises (SME), providing a complete REST API for inventory management, production planning (BOM), order processing, and employee payroll.

Built on a **Service-Oriented Architecture (SOA)** with full separation of concerns across controllers, services, and data-access objects (DAO).

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Business Modules](#business-modules)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Docker Deployment](#docker-deployment)
7. [API Standards](#api-standards)
8. [Authentication](#authentication)
9. [Performance & Security](#performance--security)
10. [Security Features](#security-features)
11. [Logging & Monitoring](#logging--monitoring)
12. [Data Integrity](#data-integrity)
13. [API Documentation](#api-documentation)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | ≥ 18.x |
| Framework | Express | v5 (ES Modules) |
| Database | MongoDB (Native Driver) | v6 |
| Authentication | JSON Web Tokens (JWT) | v9 |
| Password Hashing | bcrypt | v6 |
| Compression | compression (gzip) | v1 |
| Rate Limiting | express-rate-limit | v8 |
| Caching | node-cache (in-memory) | v5 |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) | v6/v5 |
| Config | dotenv | v17 |

> The project uses **ES Modules** (`"type": "module"` in `package.json`). All imports use the `import/export` syntax.

---

## Project Structure

```
BackEndSME/
│
├── index.js                  # App entry point — connects DB, injects DAOs, starts server
├── server.js                 # Express app setup — CORS, middleware, route mounting
├── swagger.js                # Swagger/OpenAPI spec configuration
│
├── config/
│   ├── database.js           # MongoDB connection factory with connection pool settings
│   └── indexes.js            # Shared MongoDB index helpers (ensureNormalIndex / ensureTextIndex)
│
├── controllers/              # Request handling — parse input, call service, send response
│   ├── sanPhamControllers.js
│   ├── nguyenLieuControllers.js
│   ├── bomControllers.js
│   ├── donHangControllers.js
│   ├── luongControllers.js
│   ├── dashboardControllers.js
│   ├── phongban_chucvu.Controllers.js
│   └── usersControllers.js
│
├── services/                 # Business logic — validation, orchestration, error mapping
│   ├── sanPhamService.js
│   ├── nguyenLieuService.js
│   ├── bomService.js
│   ├── donHangService.js     # Owns MongoDB session/transaction management
│   ├── luongService.js
│   ├── dashboardService.js
│   ├── phongBanService.js
│   └── userService.js
│
├── models/                   # Data Access Objects (DAO) — all MongoDB queries live here
│   ├── sanPhamDAO.js
│   ├── nguyenLieuDAO.js
│   ├── bomDAO.js
│   ├── donHangDAO.js
│   ├── luongDAO.js
│   ├── dashbroadDAO.js
│   ├── phongban_chucvuDAO.js
│   └── usersDAO.js
│
├── routes/
│   ├── v1/                   # Versioned API routes (current — use these)
│   │   ├── index.js          # Aggregates all v1 routers, mounted at /api/v1
│   │   ├── users.route.js
│   │   ├── san-pham.route.js
│   │   ├── nguyen-lieu.route.js
│   │   ├── bom.route.js
│   │   ├── don-hang.route.js
│   │   ├── luong.route.js
│   │   ├── dashboard.route.js
│   │   └── phongban-chucvu.route.js
│   └── *.route.js            # Legacy routes under /api/* (deprecated, backward-compat only)
│
├── middleware/
│   ├── auth.js               # JWT verification (verifyToken, verifyAdmin) + injectAuthDB
│   ├── asyncHandler.js       # Wraps async route handlers — forwards errors to errorHandler
│   ├── errorHandler.js       # Global 4-arg Express error handler (last middleware in chain)
│   └── validate.js           # Lightweight request validation (requireBody, requireParam, parseQuery)
│
├── utils/
│   ├── ApiError.js           # Custom error class with static factories (notFound, badRequest, …)
│   ├── response.js           # Unified response helpers (sendSuccess, sendError, buildPagination)
│   └── cache.js              # In-memory cache wrapper (withCache, cacheGet, cacheSet, cacheInvalidate)
│
├── API_DOCUMENTATION.md      # Full endpoint reference (90 endpoints across 8 modules)
└── PERFORMANCE_REPORT.md     # Audit findings and optimizations applied
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **controllers/** | Parse `req`, call one service method, return `sendSuccess()`. No business logic. |
| **services/** | Validate input, enforce business rules, call DAO(s), throw `ApiError` on failure. Owns transactions. |
| **models/** | Execute MongoDB queries. Return `{ error }` on failure, data on success. No business logic. |
| **routes/v1/** | Declare HTTP method + path, attach middleware (`verifyToken`, `requireBody`), forward to controller. |
| **middleware/** | Cross-cutting concerns: auth, validation, error formatting, async error propagation. |
| **utils/** | Pure helpers with no side effects: error construction, response formatting, caching. |

---

## Business Modules

### Inventory — Sản Phẩm & Nguyên Liệu

Manages two separate stock pools:

- **san_pham** (Finished Goods / Thành phẩm): Products sold to customers or produced from raw materials.
- **nguyen_lieu** (Raw Materials / Nguyên liệu): Input materials consumed during production.

**Key behaviors:**
- Stock levels are tracked by `so_luong` (quantity) with an optional `ton_toi_thieu` (minimum threshold).
- `getAllStock()` returns a computed `status` field per item: `"đủ hàng"` / `"sắp hết"` / `"hết hàng"` — derived from the `so_luong` vs `ton_toi_thieu` ratio.
- Stock adjustments (`adjustStock`) are atomic `$inc` operations with an optional negative-stock guard.
- Text search uses a MongoDB text index over name, description, and related fields.

---

### Production — Bill of Materials (BOM)

The BOM system links finished products to the raw materials required to produce them.

```
san_pham (SP046)
  └── nguyen_lieu: [
        { ma_nl: "NL001", ten: "Steel", so_luong: 2, don_vi: "kg" },
        { ma_nl: "NL002", ten: "Paint",  so_luong: 0.5, don_vi: "L" }
      ]
```

**Key behaviors:**
- BOM is stored inline within the `san_pham` document (`nguyen_lieu[]` array field).
- `bomDAO.calcUnitCost()` aggregates raw material costs using a single `$in` batch query.
- When a Production Receipt (`prod_receipt`) order is completed, the system automatically:
  1. Deducts raw material stock per BOM `dinh_muc × quantity_produced`.
  2. Adds the produced quantity to finished goods stock.
  3. Fails atomically (MongoDB transaction) if any material is insufficient.

---

### Order Processing — Đơn Hàng

Three distinct order types share a unified document structure:

| `loai_don` | Direction | Stock Effect on Completion |
|---|---|---|
| `sale` | Outbound to customer | Deducts finished goods (`san_pham.so_luong -= qty`) |
| `purchase_receipt` | Inbound from supplier | Adds to raw materials or finished goods stock |
| `prod_receipt` | Internal production | Deducts raw materials, adds finished goods (BOM-driven) |

**Status workflow (SALE):**

```
draft → confirmed → paid → shipping → completed
      ↘                              ↗
        → cancelled (from any state)
```

**Key behaviors:**
- Status transitions are validated against a per-`loai_don` whitelist (`ALLOWED_TRANSITIONS_BY_TYPE`).
- Inventory effects trigger **only on** `→ completed` transition, inside a **MongoDB transaction**.
- Transaction management lives in `DonHangService.updateStatus()` — not in the controller.
- N+1 query patterns eliminated: all product/material lookups during inventory update are **batch-fetched** via `$in` before the update loop.

---

### Payroll — Lương & Chấm Công

Tracks daily attendance and computes monthly salary.

**Attendance (Chấm công):**
- Records: `ma_nv`, `ngay_thang` (date), `gio_check_in`, `gio_check_out`, `so_gio_lam`, `di_tre`.
- Upsert-based: calling the API again for the same employee + date overwrites the record.
- Bulk upsert supported for importing a full day's roster via a single request.

**Salary calculation (`tinhLuongThang`):**
```
Formula:
  luong_co_ban    = he_so_luong × 1,000,000 VND
  ty_le_lam_viec  = min(1, tong_gio_lam / 160)   ← 160h = standard monthly hours
  luong_thuc_nhan = luong_co_ban × ty_le_lam_viec
```
- `he_so_luong` (salary coefficient) is stored on the employee's `chuc_vu` (position) object.
- The calculation aggregates all attendance records for the requested month/year in a single pipeline, then batch-fetches employee data.

---

### Departments & Positions — Phòng Ban & Chức Vụ

Master data for organizational structure. Each user document embeds `phong_ban` (department) and `chuc_vu` (position) as sub-objects, enabling filter queries without joins.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **MongoDB** 6.x (Atlas or self-hosted)
- **npm** ≥ 9.x

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd BackEndSME

# Install dependencies
npm install
```

### Running the Server

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:8000` by default.

```
✅ MongoDB connected & ping ok (db=SME_db_mongo)
🚀 Server running on http://localhost:8000
📖 Swagger docs: http://localhost:8000/api-docs
🔗 API v1 base:  http://localhost:8000/api/v1
```

---

## Environment Variables

Create a `.env` file in the project root. **Never commit this file.**

### Required

| Variable | Description | Example |
|---|---|---|
| `SME_DB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `SME_DB_NAME` | Database name | `SME_db_mongo` |
| `JWT_SECRET` | Secret key for access tokens | `your-strong-secret-key` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `your-strong-refresh-secret` |
| `ACCESS_EXPIRES` | Access token lifetime | `15m` |
| `REFRESH_EXPIRES` | Refresh token lifetime | `7d` ⚠️ |
| `PORT` | HTTP port | `8000` |
| `HOST_NAME` | Base host (for Swagger display) | `http://localhost` |

> ⚠️ **Important:** `REFRESH_EXPIRES` must be `7d` (not `7d`). An extra `d` causes `jsonwebtoken` to reject all refresh tokens at sign time.

### Optional / Tuning

| Variable | Description | Default |
|---|---|---|
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000,http://localhost:5173` |
| `RATE_LIMIT_MAX` | Max requests per 15 min (global) | `300` |
| `RATE_LIMIT_AUTH_MAX` | Max login attempts per 15 min | `20` |
| `DB_POOL_MAX` | MongoDB max connection pool size | `10` |
| `DB_POOL_MIN` | MongoDB min connection pool size | `2` |
| `DB_POOL_IDLE_MS` | Idle connection timeout (ms) | `30000` |
| `REBUILD_TEXT_INDEX` | Set `true` to drop & recreate text indexes | `false` |

### Example `.env`

```dotenv
HOST_NAME=http://localhost
PORT=8000

SME_DB_NAME=SME_db_mongo
SME_DB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=SME

JWT_SECRET=replace-with-a-long-random-string
JWT_REFRESH_SECRET=replace-with-a-different-long-random-string
ACCESS_EXPIRES=15m
REFRESH_EXPIRES=7d

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
RATE_LIMIT_MAX=300
RATE_LIMIT_AUTH_MAX=20
```

---

## Docker Deployment

The project ships with a `Dockerfile`, `docker-compose.yml`, and an **Nginx reverse proxy** that stand up the full stack with a single command — no local Node.js or MongoDB installation required.

### Architecture

```
                          sme_network (Docker bridge)
  ┌──────────┐   :80   ┌─────────────────┐  :5000  ┌─────────────────┐  :27017  ┌──────────────────┐
  │  Client  │────────▶│  sme_nginx      │────────▶│  sme_api        │─────────▶│  sme_db          │
  │ (Browser │  HTTP   │  nginx:alpine   │ internal│  Node.js 18     │ internal │  MongoDB 7       │
  │  / curl) │         │  Port 80 (pub.) │         │  Port 5000      │          │  Port 27017      │
  └──────────┘         │  Gzip + Headers │         │  Express v5     │          │  Vol: mongo_data │
                        └─────────────────┘         └─────────────────┘          └──────────────────┘
```

**Port 5000 is not exposed to the host.** All external traffic must pass through Nginx on port 80. Port 27017 is exposed only for local database GUI tools (Compass / Studio 3T) — remove that mapping before a public deployment.

Docker Compose creates an internal bridge network (`sme_network`). Service names resolve via Docker's internal DNS:

| From | To | DNS name | Protocol |
|---|---|---|---|
| `nginx` | Node.js app | `api:5000` | HTTP |
| `api` | MongoDB | `db:27017` | MongoDB wire protocol |

`config/database.js` resolves the MongoDB URI in this priority order:

| Priority | Variable | Used when |
|---|---|---|
| 1 | `MONGO_URI` | Docker / CI — set to `mongodb://db:27017` |
| 2 | `SME_DB_URI` | Local dev with MongoDB Atlas |
| 3 | `MOVIEREVIEWS_DB_URI` | Legacy fallback |

### Files

| File | Purpose |
|---|---|
| `Dockerfile` | Builds the Node.js image from `node:18-alpine`. Runs as non-root user with `dumb-init` for graceful shutdown. |
| `.dockerignore` | Excludes `node_modules`, `.env`, `.git`, `*.original.js`, and docs from the image. |
| `docker-compose.yml` | Defines `nginx` + `api` + `db` services, health check, named volume, and shared bridge network. |
| `nginx/default.conf` | Nginx config: reverse proxy to `api:5000`, gzip compression, security headers, 20 MB upload limit. |

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) **or** Docker Engine + Docker Compose v2 (Linux)

### Quick Start

```bash
# 1. Clone and enter the project
git clone <repository-url>
cd BackEndSME

# 2. Build images and start all services in the background
docker-compose up --build -d

# 3. Stream logs (Ctrl+C to stop following)
docker-compose logs -f api        # Node.js application logs
docker-compose logs -f nginx      # Nginx access / error logs

# 4. Verify the stack is running
curl http://localhost/             # root health check (via Nginx → Node.js)
curl http://localhost/api/v1/...  # API endpoints — all go through port 80
```

> **Note:** The API is now accessed on **port 80**, not port 5000.  
> `http://localhost/api/v1/users/login` — correct ✅  
> `http://localhost:5000/api/v1/users/login` — blocked (port not exposed) ❌

### Common Commands

| Command | Description |
|---|---|
| `docker-compose up --build -d` | Build images and start all services in detached mode |
| `docker-compose logs -f api` | Follow live logs from the Node.js container |
| `docker-compose logs -f nginx` | Follow live Nginx access and error logs |
| `docker-compose logs -f db` | Follow live MongoDB logs |
| `docker-compose ps` | Show running container status and health |
| `docker-compose down` | Stop and remove containers (MongoDB **data is preserved**) |
| `docker-compose down -v` | Stop, remove containers **and delete all data** (full reset) |
| `docker-compose restart api` | Restart only the API (e.g., after an env change) |
| `docker-compose restart nginx` | Reload Nginx after editing `nginx/default.conf` |

### Secrets & Environment Variables

The `docker-compose.yml` ships with placeholder values for JWT secrets. **Replace them before any deployment:**

```yaml
# docker-compose.yml
JWT_SECRET: replace_with_strong_secret                    # ← change
JWT_REFRESH_SECRET: replace_with_different_strong_secret  # ← change
```

For production, prefer Docker secrets or an external secrets manager over plain-text values in compose files.

### Port Reference

| Service | Host Port | Container Port | Visibility | Description |
|---|---|---|---|---|
| `nginx` | **`80`** | `80` | **Public** | Sole external entry point |
| `api` | *(none)* | `5000` | Internal only | Express REST API — access via Nginx |
| `db` | `27017` | `27017` | Dev only | MongoDB — remove `ports` block for production |

### Nginx Features

| Feature | Configuration |
|---|---|
| Reverse proxy | All requests forwarded to `api:5000` via `upstream api_backend` with `keepalive 32` |
| Gzip compression | Enabled for `application/json`, JS, CSS, XML — min 1 KB, level 5 |
| Upload limit | `client_max_body_size 20M` — supports large product images and BOM CSV imports |
| Security headers | `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection` |
| Real IP forwarding | `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` — Express reads these via `trust proxy 1` |
| Static files | Commented-out blocks ready for `public/` and `uploads/` directories |
| Swagger UI | `/api-docs` proxied separately to ensure UI assets load correctly |

### Health Check

The `db` service uses a `mongosh` health check. The `api` service waits for `db` to be healthy (`condition: service_healthy`) before starting. `nginx` waits for `api` to be up before routing traffic — preventing 502 errors on cold start.

---

## API Standards

### Base URL

```
/api/v1
```

> Legacy routes at `/api/*` remain for backward compatibility but are **deprecated**. All new development must target `/api/v1/*`.

### Versioned Endpoints

| Module | Base Path |
|---|---|
| Users / Auth | `/api/v1/users` |
| Sản phẩm (Products) | `/api/v1/san-pham` |
| Nguyên liệu (Raw Materials) | `/api/v1/nguyen-lieu` |
| BOM | `/api/v1/bom` |
| Đơn hàng (Orders) | `/api/v1/don-hang` |
| Lương (Payroll) | `/api/v1/luong` |
| Dashboard | `/api/v1/dashboard` |
| Phòng ban / Chức vụ | `/api/v1/phongban-chucvu` |

### Response Format

All endpoints return a consistent JSON envelope.

**Success (2xx)**

```json
{
  "success": true,
  "message": "Lấy danh sách thành công",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 153,
    "totalPages": 8
  }
}
```

> `pagination` is only present on list endpoints. Single-resource responses omit it.

**Error (4xx / 5xx)**

```json
{
  "success": false,
  "message": "Không tìm thấy sản phẩm",
  "errorCode": "NOT_FOUND",
  "statusCode": 404
}
```

### Standard Error Codes

| `errorCode` | HTTP | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Resource does not exist |
| `BAD_REQUEST` | 400 | Missing or invalid input |
| `VALIDATION_ERROR` | 400 | Field-level validation failure |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `CONFLICT` | 409 | Duplicate key (e.g., `ma_sp` already exists) |
| `OPERATION_FAILED` | 400 | DAO-level operation returned an error |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## Authentication

The API uses a **dual-token JWT** strategy.

| Token | Lifetime | Purpose |
|---|---|---|
| **Access Token** | `15m` | Sent as `Authorization: Bearer <token>` on every protected request |
| **Refresh Token** | `7d` | Used once to obtain a new access token via `POST /api/v1/users/refresh` |

Refresh tokens are **hashed with bcrypt** and stored in the `users.tokens[]` array. On refresh, the old token array is cleared and a new hashed token is stored (token rotation).

### Auth Flow

```
POST /api/v1/users/login
  → { accessToken, refreshToken }

Request with accessToken:
  Authorization: Bearer <accessToken>

When accessToken expires:
  POST /api/v1/users/refresh  { userId, refreshToken }
  → { accessToken, refreshToken }  ← tokens rotated

POST /api/v1/users/logout    ← revokes current refreshToken
POST /api/v1/users/logout-all ← revokes all refresh tokens
```

### Role-Based Access

Admin-only endpoints are protected by the `verifyAdmin` middleware, which checks `req.user.chuc_vu.heSoluong` or an admin flag set during registration.

---

## Performance & Security

### Caching

Dashboard endpoints (`ordersCompare`, `ordersOverview`) are wrapped with a **60-second cache-aside** layer using `node-cache`. Repeated requests with identical query parameters are served from memory without hitting MongoDB.

```js
// Cache key encodes all query params for per-combination caching
const data = await withCache(`dashboard:overview:${yearA}:${range}`, fetcher, 60);
```

Cache can be invalidated programmatically via `cacheInvalidate("dashboard:")`.

### Pagination

All list endpoints support `page` and `limit` query parameters. Maximum `limit` is enforced at the DAO level (200 for stock endpoints, 50–100 for others) to prevent unbounded result sets.

### MongoDB Indexing

Indexes are created idempotently at startup via shared helpers in `config/indexes.js`:

| Collection | Key Indexes |
|---|---|
| `san_pham` | `ma_sp` (unique), `trang_thai+so_luong`, compound text index |
| `nguyen_lieu` | `ma_nl` (unique), `trang_thai+so_luong`, compound text index |
| `don_hang` | `ma_dh` (unique), `trang_thai`, `created_at`, `loai_don`, compound text index |
| `luong` | `ma_nv+ngay_thang` (unique), `user_id+ngay_thang`, `trang_thai` |
| `users` | `tai_khoan` (unique), `trang_thai`, `tokens.token` |
| `bom_san_pham` | `san_pham_id` (unique), `items.nguyen_lieu_id` |

The `don_hang` collection uses a **single compound text index** across all searchable fields (`san_pham.ten_sp`, `san_pham.ten_nl`, `khach_hang_ten`, `nha_cung_cap_ten`), respecting MongoDB's one-text-index-per-collection constraint.

### N+1 Query Elimination

Inventory update operations (on order completion) previously issued one `findOne` per line item. These are now batch-fetched using `$in`:

```
Before (10-line order):   10 findOne + 10 updateOne = 20 DB ops
After  (10-line order):    1 find($in) + 10 updateOne = 11 DB ops

PROD_RECEIPT (5 SP × 3 BOM):  20 reads → 2 reads
```

### Rate Limiting

| Scope | Limit |
|---|---|
| Global (all routes) | 300 requests / 15 min per IP |
| Auth routes (`/login`, `/refresh`) | 20 requests / 15 min per IP |

Limits are configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_AUTH_MAX` environment variables.

### CORS

Allowed origins are controlled by the `ALLOWED_ORIGINS` environment variable (comma-separated). Requests from unlisted origins are rejected with a `CORS` error. Requests with no `Origin` header (Postman, server-to-server, mobile apps) are always allowed.

### Connection Pooling

The MongoDB client is configured with an explicit connection pool:

```
maxPoolSize:    10  (configurable via DB_POOL_MAX)
minPoolSize:     2  (configurable via DB_POOL_MIN)
maxIdleTimeMS: 30s  (configurable via DB_POOL_IDLE_MS)
connectTimeoutMS: 10s
```

### Response Compression

All HTTP responses are gzip-compressed via the `compression` middleware, applied globally before route handlers. This typically reduces JSON payload size by **60–75%**.

---

## Security Features

### Helmet — Secure HTTP Headers

[`helmet`](https://helmetjs.github.io/) is applied globally as the **first middleware** in `server.js`. It sets a suite of security-related response headers on every request:

| Header | Value | Prevents |
|---|---|---|
| `Content-Security-Policy` | Restrictive default-src | XSS, data injection |
| `X-DNS-Prefetch-Control` | `off` | DNS prefetch leaks |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing attacks |
| `Referrer-Policy` | `no-referrer` | Referrer leakage |
| `X-Permitted-Cross-Domain-Policies` | `none` | Flash/PDF cross-domain |

> Helmet's headers complement but do not duplicate the security headers already set in `nginx/default.conf`.

### NoSQL Injection Sanitisation

[`express-mongo-sanitize`](https://github.com/fiznool/express-mongo-sanitize) strips any key starting with `$` or containing `.` from `req.body`, `req.query`, and `req.params` — applied **after** `express.json()` so the body is already parsed.

**Without sanitisation, an attacker can send:**
```json
{ "tai_khoan": { "$gt": "" }, "mat_khau": { "$gt": "" } }
```
This would match every user document and bypass password checks. `express-mongo-sanitize` removes the `$gt` keys before the query reaches the DAO layer.

### Health Check

```
GET /api/v1/health
```

A public endpoint (no authentication required) that verifies system health:

```json
{
  "success": true,
  "status": "OK",
  "timestamp": "2026-04-02T10:00:00.000Z",
  "uptime": "3600s",
  "database": {
    "status": "Connected",
    "latencyMs": 4
  },
  "memory": {
    "rss":       "85.3 MB",
    "heapUsed":  "42.1 MB",
    "heapTotal": "61.0 MB"
  }
}
```

Returns **HTTP 200** when healthy, **HTTP 503** when MongoDB is unreachable. Use this endpoint for Docker health checks, load balancer probes, and uptime monitoring.

---

## Logging & Monitoring

The project uses [`winston`](https://github.com/winstonjs/winston) for structured, leveled logging. All `console.log` / `console.error` calls have been replaced.

### Log Levels

| Level | When used |
|---|---|
| `error` | Unhandled exceptions, DB errors, startup failures |
| `warn` | Operational errors (4xx responses, failed business rules) |
| `info` | Server start, DB connect/disconnect, HTTP requests |
| `debug` | Verbose detail (development only) |

### Transports

| Transport | File | Content |
|---|---|---|
| Console | — | Colorized in `development`; JSON in `production` |
| File | `logs/error.log` | `error` level only (max 10 MB × 5 files) |
| File | `logs/combined.log` | All levels (max 20 MB × 10 files) |
| File | `logs/exceptions.log` | Uncaught exceptions |
| File | `logs/rejections.log` | Unhandled promise rejections |

Files are rotated automatically when they reach their size limit.

### Request Logging

Every completed HTTP request is logged by `middleware/requestLogger.js`:

```
2026-04-02 10:00:00 [info]: HTTP { method: "POST", url: "/api/v1/users/login",
                                   status: 200, ip: "192.168.1.10", duration: "23.4ms" }
```

Log level is determined by response status: `error` for 5xx, `warn` for 4xx, `info` for 2xx/3xx.

### Accessing Logs

```bash
# Live stream inside Docker
docker-compose logs -f api

# Read log files on host (mapped from container via volume if configured)
tail -f logs/combined.log
tail -f logs/error.log

# Filter only errors
grep '"level":"error"' logs/combined.log | jq .
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | Minimum log level to emit |
| `NODE_ENV` | `development` | `production` disables colorized console output |

---

## Data Integrity

Critical write operations use **MongoDB multi-document transactions** via `session.withTransaction()` to guarantee atomicity. The native MongoDB driver is used directly — no Mongoose.

### Order Status → Inventory (Existing)

**Location:** `services/donHangService.js → updateStatus()`

When an order transitions to `completed`, two operations must succeed together or both must be rolled back:

1. Update `don_hang.trang_thai` → `"completed"` and append to `lich_su` (history)
2. Apply inventory changes to `san_pham` / `nguyen_lieu` collections

```
SALE order completed:         san_pham.so_luong  -= qty  (per line item)
PURCHASE_RECEIPT completed:   nguyen_lieu.so_luong += qty (per line item)
PROD_RECEIPT completed:       nguyen_lieu.so_luong -= BOM qty × units produced
                              san_pham.so_luong   += units produced
```

If MongoDB cannot deduct stock (e.g. `so_luong < required`), the `updateOne` with `{ so_luong: { $gte: need } }` matches 0 documents, the service throws, and `withTransaction` rolls back the entire session — **the status field is never changed**.

### BOM Update → Product Sync (New in Phase 3)

**Location:** `services/bomService.js → setBOM()` + `models/bomDAO.js → setBOM()`

Updating a Bill of Materials involves two collections that must stay in sync:

| Collection | Field | Role |
|---|---|---|
| `bom_san_pham` | `items[]` | Primary BOM store (used by costing `calcUnitCost`) |
| `san_pham` | `nguyen_lieu[]` | Embedded BOM (used by PROD_RECEIPT inventory logic) |

Both writes are wrapped in the **same transaction session**:

```
withTransaction:
  1. bom_san_pham.updateOne({ san_pham_id }, { $set: { items, ghi_chu } })   ← upsert
  2. san_pham.updateOne({ _id: san_pham_id }, { $set: { nguyen_lieu: [...] } })
```

If either write fails (e.g. `san_pham_id` not found, network error during step 2), the entire transaction is aborted and **neither** collection is modified.

### How Sessions Are Passed

`mongoClient` is stored on `app.locals` in `index.js` and accessed in controllers:

```js
// Controller
const mongoClient = req.app?.locals?.mongoClient;
await BomService.setBOM(san_pham_id, items, { ghi_chu, mongoClient });

// Service — starts the session and owns the lifecycle
const session = mongoClient.startSession();
try {
  await session.withTransaction(async () => {
    await BomDAO.setBOM(san_pham_id, items, { ghi_chu, session }); // throws on error → rollback
  });
} finally {
  await session.endSession();  // always released
}

// DAO — receives session, passes it to every collection operation
await bom.updateOne({ ... }, { ... }, { session });
await san_pham.updateOne({ ... }, { ... }, { session });
```

> **Note:** MongoDB transactions require a **replica set** (or sharded cluster). A standalone `mongod` does not support multi-document transactions. The `mongo:7` service in `docker-compose.yml` runs in standalone mode — for local testing of transactions, initialize a single-node replica set or use MongoDB Atlas.

---

## API Documentation

Full endpoint reference — 90 endpoints across 8 modules:

**[→ API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**

Interactive Swagger UI (when server is running):

```
http://localhost:8000/api-docs
```

The Swagger UI supports Bearer token authentication for testing protected endpoints directly in the browser.

---

## Project Scripts

```bash
npm start        # Start server with Node.js
npm run dev      # Start server with Nodemon (auto-restart)
```

---

## Graceful Shutdown

The server handles `SIGINT` and `SIGTERM` signals:

1. Stops accepting new HTTP connections.
2. Closes the MongoDB client (returns all pool connections).
3. Exits with code `0`.

This ensures no in-flight requests are dropped and no database connections are leaked during container restarts or deployment.
