# SME Backend — Performance Report

**Generated:** 2026-04-02  
**Phases completed:** 1 (Audit) → 2 (DB) → 3 (API Layer) → 4 (Memory/Process)

---

## Phase 1 — Audit Findings

### Index Audit

| Collection | Status Before | Fix Applied |
|---|---|---|
| `don_hang` | 4 `text` indexes attempted (3 silently ignored by MongoDB) | Merged into 1 compound text index |
| `san_pham` | Missing `allowDiskUse` on 8-stage `$facet` aggregate | Added `allowDiskUse: true` |
| `nguyen_lieu` | Missing `allowDiskUse` on 8-stage `$facet` aggregate | Added `allowDiskUse: true` |
| `users` | `getUserById` returned `mat_khau` + `tokens` (sensitive data) | Added projection `{ mat_khau: 0, tokens: 0 }` |
| All DAO `injectDB` | Used `process.env.DB_NAME` instead of `SME_DB_NAME` | Fixed to `SME_DB_NAME \|\| DB_NAME` |

### N+1 Query Findings (Critical)

| Location | Pattern | Lines per call | Fix |
|---|---|---|---|
| `donHangDAO._applyInventoryOnCompleted` (SALE) | `for` loop → `findOne(san_pham)` per line | N × 1 | Batch `$in` fetch → Map lookup |
| `donHangDAO._applyInventoryOnCompleted` (PURCHASE_RECEIPT) | `for` loop → up to 3 `findOne(nguyen_lieu)` per line | N × 3 | Batch `$in` fetch NL + SP |
| `donHangDAO._applyInventoryOnCompleted` (PROD_RECEIPT) | Double N+1: `findOne(san_pham)` + `findOne(nguyen_lieu)` per BOM | N × (1 + M) | Batch SP → collect BOM ma_nls → batch NL |
| `donHangDAO.getProductionNeeds` | `_findSanPhamRef` in loop per order line | N × 1 | Batch SP fetch before loop |

### Critical Bug

| File | Bug | Fix |
|---|---|---|
| `luongDAO.tinhLuongThang` | Dynamic `import("./_keep_tinhLuongThang.js")` — file **does not exist**; crashes at runtime | Implemented salary calculation inline (aggregate chamcong → batch fetch employees → compute pay) |

### Other Bugs

| Location | Bug | Fix |
|---|---|---|
| `.env` | `REFRESH_EXPIRES=7dd` (extra `d`) | Manual fix required: change to `7d` |
| `usersDAO._hasRefreshToken` | `bcrypt.compare()` in loop — blocks event loop | Bounded by token array size (typically 1–3); noted as acceptable for now |

---

## Phase 2 — Database Performance

### Changes Made

**`config/indexes.js`** *(new)*
- Extracted shared `ensureNormalIndex` / `ensureTextIndex` helpers from sanPhamDAO + nguyenLieuDAO
- Used by any DAO that needs safe, idempotent index creation at startup

**`models/donHangDAO.js`**
- Fixed env var: `DB_NAME` → `SME_DB_NAME || DB_NAME`
- Fixed text indexes: replaced 4 separate `createIndex({ field: "text" })` calls with 1 compound text index covering `san_pham.ten_sp`, `san_pham.ten_nl`, `khach_hang_ten`, `nha_cung_cap_ten`
- Added `_batchFetchSanPham`, `_lookupSanPham`, `_batchFetchNguyenLieu`, `_lookupNguyenLieu` static helpers
- Rewrote `_applyInventoryOnCompleted` — all DB reads are now batch-fetched before the update loop
- Rewrote `getProductionNeeds` — batch-fetches san_pham before the loop; NL fetch was already batched

**`models/usersDAO.js`**
- Fixed env var
- `getUserById`: added projection `{ mat_khau: 0, tokens: 0 }` to prevent sensitive field exposure

**`models/luongDAO.js`**
- Fixed env var
- Replaced missing dynamic import with inline `tinhLuongThang` implementation:
  - Aggregates chamcong by `ma_nv` for the month
  - Batch-fetches employee records
  - Calculates salary: `heSoluong × 1,000,000 × (giờ_làm / 160)`

**`models/sanPhamDAO.js`**
- `getAllStock`: added `{ allowDiskUse: true }` to the 8-stage `$facet` aggregate

**`models/nguyenLieuDAO.js`**
- `getAllStock`: added `{ allowDiskUse: true }` to the 8-stage `$facet` aggregate

### Expected Improvement

| Scenario | Before | After |
|---|---|---|
| Complete order with 10 line items (SALE) | 10 `findOne` + 10 `updateOne` = 20 DB ops | 1 `find($in)` + 10 `updateOne` = 11 DB ops |
| Complete PROD_RECEIPT with 5 SP × 3 BOM items | 5 `findOne(SP)` + 15 `findOne(NL)` = 20 reads | 1 `find($in, SP)` + 1 `find($in, NL)` = 2 reads |
| `getProductionNeeds` (10 SP lines) | 10 `findOne(SP)` + 1 `find($in, NL)` = 11 reads | 1 `find($in, SP)` + 1 `find($in, NL)` = 2 reads |
| `getAllStock` on large dataset | May fail (no `allowDiskUse`) | Handles datasets exceeding 100 MB sort buffer |

---

## Phase 3 — API Layer

### Packages Installed
```
compression          — gzip response compression
express-rate-limit   — request rate limiting
node-cache           — in-memory key-value cache
```

### Changes Made

**`server.js`**
- Added `compression()` middleware (gzip for all responses ≥ 1 KB)
- Added global rate limiter: 300 req / 15 min per IP
- Added strict auth limiter on `/api/v1/users/login` + `/api/v1/users/refresh`: 20 req / 15 min
- Env vars: `RATE_LIMIT_MAX`, `RATE_LIMIT_AUTH_MAX` for tuning without code change

**`utils/cache.js`** *(new)*
- Thin wrapper around `node-cache` with `cacheGet`, `cacheSet`, `cacheInvalidate`, `withCache`
- Default TTL: 60 seconds
- `withCache(key, fetcher, ttl)` — cache-aside pattern for any async data source

**`controllers/dashboardControllers.js`**
- `ordersCompare` and `ordersOverview` wrapped with `withCache` (TTL 60 s)
- Cache key encodes all query params — different filter combos get separate cache entries
- Cache bypassed automatically if the fetcher throws (errors are never cached)

### Expected Improvement

| Metric | Before | After |
|---|---|---|
| Repeated dashboard requests (same params, 60 s window) | 6 aggregate queries each call | 1st call: 6 queries. Subsequent: 0 DB ops |
| Response payload size (JSON) | Uncompressed | ~60–75% smaller over HTTP |
| Brute-force login attempts | Unlimited | 20 per 15 min per IP |

---

## Phase 4 — Memory / Process

### Changes Made

**`config/database.js`**
- Added connection pool options to `MongoClient`:
  - `maxPoolSize`: `DB_POOL_MAX` env var (default: 10)
  - `minPoolSize`: `DB_POOL_MIN` env var (default: 2)
  - `maxIdleTimeMS`: `DB_POOL_IDLE_MS` env var (default: 30,000 ms)
  - `connectTimeoutMS`: 10,000 ms (hard-coded fail-fast)
  - `serverSelectionTimeoutMS`: 10,000 ms

### Recommended `.env` Addition
```
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_IDLE_MS=30000
RATE_LIMIT_MAX=300
RATE_LIMIT_AUTH_MAX=20
```

### Manual Fix Required
```
# Current (broken):
REFRESH_EXPIRES=7dd

# Fix to:
REFRESH_EXPIRES=7d
```

---

## Summary Table

| Category | Issue | Severity | Status |
|---|---|---|---|
| N+1 — SALE inventory | `findOne` per line item | Critical | Fixed |
| N+1 — PURCHASE_RECEIPT | Up to 3 `findOne` per line | Critical | Fixed |
| N+1 — PROD_RECEIPT | Double N+1 (SP + BOM NL) | Critical | Fixed |
| N+1 — getProductionNeeds | `findOne(SP)` per order line | High | Fixed |
| Missing `_keep_tinhLuongThang.js` | Runtime crash on salary calculation | Critical | Fixed |
| Multiple text indexes on `don_hang` | 3 of 4 silently dropped | High | Fixed |
| `getUserById` exposes `mat_khau`/`tokens` | Security: sensitive data leak | High | Fixed |
| `allowDiskUse` on `$facet` pipelines | OOM risk on large datasets | High | Fixed |
| Env var `DB_NAME` vs `SME_DB_NAME` | Wrong DB connected | High | Fixed |
| `REFRESH_EXPIRES=7dd` typo | All refresh tokens rejected | High | **Manual fix needed in .env** |
| No connection pooling config | Default pool (5) too small for prod | Medium | Fixed |
| No gzip compression | Large JSON payloads | Medium | Fixed |
| No rate limiting | Brute-force / DDoS exposure | Medium | Fixed |
| Dashboard: 6 aggregates per request | High read latency | Medium | Fixed (cache) |
| `bcrypt.compare` loop in `_hasRefreshToken` | Blocks event loop | Medium | Noted — bounded by token array size |
