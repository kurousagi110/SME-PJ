# SME API Documentation

**Base URL:** `/api/v1`
**Authentication:** `Authorization: Bearer {JWT_TOKEN}` (obtained from `/api/v1/users/login`)
**Content-Type:** `application/json`
**Generated:** 2026-04-02

---

## Unified Response Format

All endpoints return one of the following shapes:

### Success
```json
{
  "success": true,
  "message": "Mô tả kết quả",
  "data": { },
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```
> `pagination` is only present on list/search endpoints.

### Error
```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "errorCode": "SNAKE_CASE_CODE",
  "statusCode": 400
}
```

---

## 1. Users (Authentication & Management)

### POST /api/v1/users/register
**Description:** Đăng ký tài khoản người dùng mới
**Auth required:** No

**Request Body:**
```json
{
  "ho_ten": "string — Họ và tên (bắt buộc)",
  "tai_khoan": "string — Tên đăng nhập (bắt buộc)",
  "password": "string — Mật khẩu (bắt buộc)",
  "ngay_sinh": "string — Ngày sinh YYYY-MM-DD (tuỳ chọn)",
  "chuc_vu": { "ten": "string", "mo_ta": "string", "heSoluong": "number" },
  "phong_ban": { "ten": "string", "mo_ta": "string" }
}
```

**Response 201:**
```json
{ "success": true, "message": "Đăng ký thành công", "data": { "insertedId": "ObjectId" } }
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu ho_ten / tai_khoan / password |
| 409 | DUPLICATE_KEY | Tên đăng nhập đã tồn tại |

---

### POST /api/v1/users/login
**Description:** Đăng nhập, nhận accessToken + refreshToken
**Auth required:** No

**Request Body:**
```json
{
  "tai_khoan": "string — Tên đăng nhập (bắt buộc)",
  "password": "string — Mật khẩu (bắt buộc)"
}
```

**Response 200:**
```json
{
  "success": true, "message": "Đăng nhập thành công",
  "data": { "accessToken": "string", "refreshToken": "string", "user": { } }
}
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu tai_khoan / password |
| 401 | LOGIN_FAILED | Sai tài khoản hoặc mật khẩu |

---

### POST /api/v1/users/refresh
**Description:** Làm mới accessToken bằng refreshToken
**Auth required:** No

**Request Body:**
```json
{ "userId": "string", "refreshToken": "string" }
```

**Response 200:**
```json
{ "success": true, "message": "Làm mới token thành công", "data": { "accessToken": "string" } }
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 401 | REFRESH_FAILED | refreshToken không hợp lệ hoặc đã hết hạn |

---

### POST /api/v1/users/logout
**Description:** Đăng xuất thiết bị hiện tại (thu hồi refreshToken)
**Auth required:** Yes

**Request Body:**
```json
{ "userId": "string", "refreshToken": "string" }
```

**Response 200:**
```json
{ "success": true, "message": "Đăng xuất thành công", "data": { "ok": true } }
```

---

### POST /api/v1/users/logout-all
**Description:** Đăng xuất tất cả thiết bị (thu hồi tất cả refreshToken)
**Auth required:** Yes

**Request Body:**
```json
{ "userId": "string" }
```

---

### GET /api/v1/users
**Description:** Lấy danh sách người dùng (có lọc, phân trang)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | No | "" | Tìm kiếm theo tên / tài khoản |
| page | number | No | 1 | Trang |
| limit | number | No | 20 | Số bản ghi/trang |
| trang_thai | number | No | - | 0=khóa, 1=hoạt động |
| phong_ban | string | No | - | Lọc theo phòng ban |
| chuc_vu | string | No | - | Lọc theo chức vụ |

**Response 200:**
```json
{
  "success": true, "message": "Lấy danh sách người dùng thành công",
  "data": [ { "_id": "ObjectId", "ho_ten": "string", "tai_khoan": "string", ... } ],
  "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
}
```

---

### GET /api/v1/users/:id
**Description:** Lấy thông tin một người dùng theo ID
**Auth required:** Yes

**Request Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | MongoDB ObjectId |

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 404 | USER_NOT_FOUND | Không tìm thấy người dùng |

---

### GET /api/v1/users/me/:id
**Description:** Lấy thông tin tài khoản hiện tại
**Auth required:** Yes

---

### PATCH /api/v1/users/:id/profile
**Description:** Cập nhật hồ sơ cá nhân
**Auth required:** Yes

**Request Body:**
```json
{ "ho_ten": "string", "ngay_sinh": "YYYY-MM-DD" }
```

---

### PATCH /api/v1/users/:id/password
**Description:** Đổi mật khẩu
**Auth required:** Yes

**Request Body:**
```json
{ "oldPassword": "string (bắt buộc)", "newPassword": "string (bắt buộc)" }
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | PASSWORD_UPDATE_FAILED | Mật khẩu cũ sai |

---

### PUT /api/v1/users/:id/chuc-vu
**Description:** Thiết lập chức vụ (ghi đè)
**Auth required:** Yes

**Request Body:**
```json
{ "ten": "string", "mo_ta": "string", "heSoluong": "number" }
```

---

### PATCH /api/v1/users/:id/chuc-vu
**Description:** Cập nhật từng trường chức vụ
**Auth required:** Yes

---

### DELETE /api/v1/users/:id/chuc-vu
**Description:** Xóa chức vụ khỏi user
**Auth required:** Yes

---

### PUT /api/v1/users/:id/phong-ban
**Description:** Thiết lập phòng ban (ghi đè)
**Auth required:** Yes

**Request Body:**
```json
{ "ten": "string", "mo_ta": "string" }
```

---

### PATCH /api/v1/users/:id/phong-ban
**Description:** Cập nhật từng trường phòng ban
**Auth required:** Yes

---

### DELETE /api/v1/users/:id/phong-ban
**Description:** Xóa phòng ban khỏi user
**Auth required:** Yes

---

### DELETE /api/v1/users/:id
**Description:** Khóa tài khoản (soft delete)
**Auth required:** Yes

---

### PATCH /api/v1/users/:id/restore
**Description:** Khôi phục tài khoản đã khóa
**Auth required:** Yes

---

### GET /api/v1/users/danh-sach-nhan-vien
**Description:** Lấy danh sách nhân viên (lọc theo phòng ban, phân quyền: manager xem tất cả, staff chỉ xem phòng mình)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | No | "" | Tìm theo mã NV / họ tên |
| phong_ban | string | No | - | Lọc theo tên phòng ban (chỉ manager) |

---

## 2. Sản Phẩm (Products)

### POST /api/v1/san-pham
**Description:** Tạo sản phẩm mới
**Auth required:** Yes

**Request Body:**
```json
{
  "ma_sp": "string — Mã sản phẩm (bắt buộc)",
  "ten_sp": "string — Tên sản phẩm (bắt buộc)",
  "don_gia": "number — Đơn giá bán",
  "so_luong": "number — Số lượng ban đầu (mặc định: 0)",
  "mo_ta": "string — Mô tả",
  "nguyen_lieu": "array — Danh sách nguyên liệu"
}
```

**Response 201:**
```json
{ "success": true, "message": "Tạo sản phẩm thành công", "data": { "insertedId": "ObjectId" } }
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu ma_sp / ten_sp |
| 409 | DUPLICATE_KEY | Mã sản phẩm đã tồn tại |

---

### GET /api/v1/san-pham
**Description:** Danh sách sản phẩm (phân trang, lọc, sắp xếp)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | No | "" | Tìm kiếm full-text |
| minPrice | number | No | - | Giá tối thiểu |
| maxPrice | number | No | - | Giá tối đa |
| status | string | No | - | Trạng thái |
| page | number | No | 1 | Trang |
| limit | number | No | 20 | Số bản ghi/trang |
| sortBy | string | No | createAt | Trường sắp xếp |
| order | string | No | desc | asc / desc |
| includeDeleted | boolean | No | false | Bao gồm đã xóa |

---

### GET /api/v1/san-pham/search
**Description:** Tìm kiếm nhanh sản phẩm
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | No | "" | Từ khóa |
| limit | number | No | 20 | Số kết quả tối đa |

---

### GET /api/v1/san-pham/stock
**Description:** Lấy tồn kho toàn bộ sản phẩm (phân trang)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | No | "" | Tìm kiếm |
| status | string | No | - | Lọc trạng thái |
| min_qty | number | No | - | Số lượng tối thiểu |
| max_qty | number | No | - | Số lượng tối đa |
| page | number | No | 1 | Trang |
| limit | number | No | 20 | Số bản ghi/trang |
| sortBy | string | No | ten_sp | Trường sắp xếp |
| sortDir | string | No | asc | Chiều sắp xếp |

---

### GET /api/v1/san-pham/stats/summary
**Description:** Thống kê tổng hợp tồn kho sản phẩm
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| lowStockThreshold | number | No | 5 | Ngưỡng sắp hết hàng |

---

### GET /api/v1/san-pham/stats/low-stock
**Description:** Danh sách sản phẩm sắp hết hàng
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| threshold | number | No | 5 | Ngưỡng tồn kho |
| limit | number | No | 50 | Số kết quả tối đa |

---

### POST /api/v1/san-pham/bulk/adjust-stock
**Description:** Điều chỉnh tồn kho nhiều sản phẩm cùng lúc
**Auth required:** Yes

**Request Body:**
```json
{
  "updates": [
    { "id": "ObjectId", "delta": "number" }
  ],
  "allowNegative": "boolean — mặc định false"
}
```

---

### POST /api/v1/san-pham/:id/adjust-stock
**Description:** Điều chỉnh tồn kho một sản phẩm
**Auth required:** Yes

**Request Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | MongoDB ObjectId |

**Request Body:**
```json
{
  "delta": "number — tăng (+) hoặc giảm (-)",
  "allowNegative": "boolean",
  "newPrice": "number — cập nhật giá (tuỳ chọn)",
  "newMinStock": "number — cập nhật tồn tối thiểu",
  "newDonVi": "string — cập nhật đơn vị"
}
```

---

### GET /api/v1/san-pham/:id
**Description:** Lấy chi tiết một sản phẩm
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| includeDeleted | boolean | No | false | Bao gồm đã xóa |

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 404 | PRODUCT_NOT_FOUND | Không tìm thấy sản phẩm |

---

### PATCH /api/v1/san-pham/:id
**Description:** Cập nhật thông tin sản phẩm
**Auth required:** Yes

**Request Body (tất cả tuỳ chọn):**
```json
{
  "ten_sp": "string",
  "don_gia": "number",
  "so_luong": "number",
  "mo_ta": "string",
  "nguyen_lieu": "array",
  "trang_thai": "string"
}
```

---

### PATCH /api/v1/san-pham/:id/status
**Description:** Cập nhật trạng thái sản phẩm
**Auth required:** Yes

**Request Body:**
```json
{ "status": "string (bắt buộc)" }
```

---

### DELETE /api/v1/san-pham/:id
**Description:** Xóa mềm sản phẩm
**Auth required:** Yes

---

### PATCH /api/v1/san-pham/:id/restore
**Description:** Khôi phục sản phẩm đã xóa mềm
**Auth required:** Yes

---

### DELETE /api/v1/san-pham/:id/hard
**Description:** Xóa vĩnh viễn sản phẩm
**Auth required:** Yes

---

## 3. Nguyên Liệu (Raw Materials)

### POST /api/v1/nguyen-lieu
**Description:** Tạo nguyên liệu mới
**Auth required:** Yes

**Request Body:**
```json
{
  "ma_nl": "string — Mã nguyên liệu (bắt buộc)",
  "ten_nl": "string — Tên nguyên liệu (bắt buộc)",
  "don_vi": "string — Đơn vị (bắt buộc)",
  "gia_nhap": "number — Giá nhập",
  "so_luong": "number — Số lượng ban đầu",
  "ton_toi_thieu": "number — Tồn tối thiểu",
  "mo_ta": "string"
}
```

**Response 201:**
```json
{ "success": true, "message": "Tạo nguyên liệu thành công", "data": { "insertedId": "ObjectId" } }
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu ma_nl / ten_nl / don_vi |

---

### GET /api/v1/nguyen-lieu
**Description:** Danh sách nguyên liệu (phân trang, lọc)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | No | "" | Tìm kiếm |
| status | string | No | - | Trạng thái |
| lowStockOnly | boolean | No | false | Chỉ hiển thị sắp hết |
| page | number | No | 1 | Trang |
| limit | number | No | 20 | Số bản ghi/trang |
| sortBy | string | No | ten_nl | Trường sắp xếp |
| order | string | No | asc | asc / desc |
| includeDeleted | boolean | No | false | Bao gồm đã xóa |

---

### GET /api/v1/nguyen-lieu/search
**Description:** Tìm kiếm nhanh nguyên liệu
**Auth required:** Yes

---

### GET /api/v1/nguyen-lieu/stock
**Description:** Lấy tồn kho toàn bộ nguyên liệu
**Auth required:** Yes

**Request Query:** (giống san-pham/stock, sortBy mặc định: ten_nl)

---

### GET /api/v1/nguyen-lieu/stats/summary
**Description:** Thống kê tổng hợp tồn kho nguyên liệu
**Auth required:** Yes

---

### GET /api/v1/nguyen-lieu/stats/low-stock
**Description:** Danh sách nguyên liệu sắp hết
**Auth required:** Yes

---

### POST /api/v1/nguyen-lieu/:id/adjust-stock
**Description:** Điều chỉnh tồn kho nguyên liệu
**Auth required:** Yes

**Request Body:**
```json
{
  "deltaQty": "number — bắt buộc (+ nhập, - xuất)",
  "newUnitCost": "number — cập nhật giá nhập (tuỳ chọn)",
  "allowNegative": "boolean — mặc định false"
}
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu deltaQty |
| 400 | STOCK_ADJUST_FAILED | Không đủ tồn kho khi allowNegative=false |

---

### GET /api/v1/nguyen-lieu/:id
**Description:** Lấy chi tiết một nguyên liệu
**Auth required:** Yes

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 404 | MATERIAL_NOT_FOUND | Không tìm thấy nguyên liệu |

---

### PATCH /api/v1/nguyen-lieu/:id
**Description:** Cập nhật thông tin nguyên liệu
**Auth required:** Yes

---

### DELETE /api/v1/nguyen-lieu/:id
**Description:** Xóa mềm nguyên liệu
**Auth required:** Yes

---

### PATCH /api/v1/nguyen-lieu/:id/restore
**Description:** Khôi phục nguyên liệu đã xóa mềm
**Auth required:** Yes

---

## 4. BOM (Bill of Materials)

### POST /api/v1/bom/:san_pham_id
**Description:** Khai báo / ghi đè BOM cho sản phẩm
**Auth required:** Yes

**Request Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| san_pham_id | string | Yes | MongoDB ObjectId của sản phẩm |

**Request Body:**
```json
{
  "items": [
    {
      "nguyen_lieu_id": "ObjectId",
      "ma_nl": "string",
      "qty": "number — định lượng/1sp",
      "waste_rate": "number — tỷ lệ hao hụt (0.05 = 5%)"
    }
  ],
  "ghi_chu": "string"
}
```

**Response 200:**
```json
{ "success": true, "message": "Khai báo BOM thành công", "data": { ... } }
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu san_pham_id |
| 400 | BOM_SET_FAILED | Sản phẩm không tồn tại |

---

### GET /api/v1/bom/:san_pham_id
**Description:** Lấy BOM của sản phẩm
**Auth required:** Yes

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 404 | BOM_NOT_FOUND | Sản phẩm chưa có BOM |

---

### GET /api/v1/bom/:san_pham_id/unit-cost
**Description:** Tính giá thành đơn vị từ BOM và giá nguyên liệu hiện tại
**Auth required:** Yes

**Response 200:**
```json
{
  "success": true, "message": "Tính giá thành thành công",
  "data": { "unitCost": "number", "breakdown": [...] }
}
```

---

## 5. Đơn Hàng (Orders)

### POST /api/v1/don-hang/sales
**Description:** Tạo đơn bán hàng (loai_don = "sale")
**Auth required:** Yes

**Request Body:**
```json
{
  "khach_hang_ten": "string",
  "khach_hang_sdt": "string",
  "san_pham": [
    { "san_pham_id": "ObjectId", "so_luong": "number", "don_gia": "number" }
  ],
  "ghi_chu": "string"
}
```

**Response 201:**
```json
{ "success": true, "message": "Tạo chứng từ thành công", "data": { "insertedId": "ObjectId", "ma_dh": "string" } }
```

---

### POST /api/v1/don-hang/receipts/production
**Description:** Tạo đơn nhập kho sản xuất (loai_don = "prod_receipt")
**Auth required:** Yes

---

### POST /api/v1/don-hang/receipts/purchase
**Description:** Tạo đơn nhập kho mua hàng (loai_don = "purchase_receipt")
**Auth required:** Yes

---

### POST /api/v1/don-hang
**Description:** Tạo chứng từ chung (loai_don mặc định = "sale")
**Auth required:** Yes

---

### GET /api/v1/don-hang
**Description:** Danh sách chứng từ (phân trang, lọc)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | No | "" | Tìm kiếm |
| loai_don | string | No | - | sale / prod_receipt / purchase_receipt |
| khach_hang_ten | string | No | - | Lọc theo tên khách hàng |
| nha_cung_cap_ten | string | No | - | Lọc theo nhà cung cấp |
| nguoi_lap_id | string | No | - | Lọc theo người lập |
| trang_thai | string | No | - | Trạng thái đơn |
| date_from | string | No | - | Từ ngày YYYY-MM-DD |
| date_to | string | No | - | Đến ngày YYYY-MM-DD |
| page | number | No | 1 | Trang |
| limit | number | No | 20 | Số bản ghi/trang |
| sortBy | string | No | created_at | Trường sắp xếp |
| order | string | No | desc | asc / desc |
| includeDeleted | boolean | No | false | Bao gồm đã xóa |

---

### GET /api/v1/don-hang/receipts/production
**Description:** Danh sách đơn nhập kho sản xuất (alias, tự lọc loai_don=prod_receipt)
**Auth required:** Yes

---

### GET /api/v1/don-hang/receipts/production/:id/needs
**Description:** Tính nhu cầu nguyên liệu cho đơn sản xuất
**Auth required:** Yes

**Response 200:**
```json
{
  "success": true, "message": "Lấy nhu cầu nguyên liệu thành công",
  "data": {
    "items": [
      { "nguyen_lieu_id": "ObjectId", "ten_nl": "string", "can": "number", "ton_kho": "number", "du": "boolean" }
    ]
  }
}
```

---

### GET /api/v1/don-hang/code/:ma_dh
**Description:** Lấy chứng từ theo mã đơn hàng
**Auth required:** Yes

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 404 | ORDER_NOT_FOUND | Không tìm thấy chứng từ |

---

### GET /api/v1/don-hang/stats/revenue
**Description:** Thống kê doanh thu theo khoảng thời gian
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| date_from | string | No | - | Từ ngày YYYY-MM-DD |
| date_to | string | No | - | Đến ngày YYYY-MM-DD |

---

### GET /api/v1/don-hang/:id
**Description:** Lấy chi tiết một chứng từ
**Auth required:** Yes

---

### PUT /api/v1/don-hang/:id/items
**Description:** Thay thế toàn bộ danh sách sản phẩm trong đơn
**Auth required:** Yes

**Request Body:**
```json
{ "san_pham": [ { "san_pham_id": "ObjectId", "so_luong": "number", "don_gia": "number" } ] }
```

---

### POST /api/v1/don-hang/:id/items
**Description:** Thêm một sản phẩm vào đơn hàng
**Auth required:** Yes

**Request Body:**
```json
{
  "san_pham_id": "ObjectId (hoặc nguyen_lieu_id)",
  "ma_sp": "string (hoặc ma_nl)",
  "so_luong": "number",
  "don_gia": "number"
}
```

---

### DELETE /api/v1/don-hang/:id/items
**Description:** Xóa một sản phẩm khỏi đơn hàng
**Auth required:** Yes

**Request Body:**
```json
{ "idx": "number — vị trí trong mảng", "code": "string — ma_sp hoặc ma_nl (thay thế idx)" }
```

---

### POST /api/v1/don-hang/:id/discount
**Description:** Áp dụng giảm giá cho đơn hàng
**Auth required:** Yes

**Request Body:**
```json
{ "giam_gia": "number — số tiền giảm giá" }
```

---

### POST /api/v1/don-hang/:id/tax
**Description:** Áp dụng thuế cho đơn hàng
**Auth required:** Yes

**Request Body:**
```json
{ "thue_rate": "number — tỷ lệ thuế (0.1 = 10%)" }
```

---

### POST /api/v1/don-hang/:id/shipping-fee
**Description:** Cập nhật phí vận chuyển
**Auth required:** Yes

**Request Body:**
```json
{ "phi_vc": "number" }
```

---

### POST /api/v1/don-hang/:id/payment
**Description:** Cập nhật thông tin thanh toán
**Auth required:** Yes

**Request Body:**
```json
{
  "phuong_thuc": "string — tiền mặt / chuyển khoản / ...",
  "da_thanh_toan": "number — số tiền đã thanh toán",
  "con_lai": "number"
}
```

---

### PATCH /api/v1/don-hang/:id/note
**Description:** Cập nhật ghi chú đơn hàng
**Auth required:** Yes

**Request Body:**
```json
{ "ghi_chu": "string" }
```

---

### PATCH /api/v1/don-hang/:id/status
**Description:** Cập nhật trạng thái đơn hàng (tự động cập nhật tồn kho)
**Auth required:** Yes

**Request Body:**
```json
{ "trang_thai": "string — draft / confirmed / completed / cancelled / ..." }
```

> Khi trạng thái chuyển sang `completed`, tồn kho sẽ được cập nhật tự động qua MongoDB transaction.

---

### DELETE /api/v1/don-hang/:id
**Description:** Xóa mềm chứng từ
**Auth required:** Yes

---

### PATCH /api/v1/don-hang/:id/restore
**Description:** Khôi phục chứng từ đã xóa mềm
**Auth required:** Yes

---

### DELETE /api/v1/don-hang/:id/hard
**Description:** Xóa vĩnh viễn chứng từ
**Auth required:** Yes

---

## 6. Lương (Payroll)

### POST /api/v1/luong/cham-cong/bulk
**Description:** Chấm công hàng loạt cho nhiều nhân viên trong một ngày
**Auth required:** Yes

**Request Body:**
```json
{
  "ngay_thang": "YYYY-MM-DD (bắt buộc)",
  "items": [
    {
      "ma_nv": "string",
      "gio_check_in": "HH:MM",
      "gio_check_out": "HH:MM",
      "so_gio_lam": "number",
      "ghi_chu": "string"
    }
  ]
}
```

**Response 200:**
```json
{ "success": true, "message": "Bulk chấm công thành công", "data": { ... } }
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu ngay_thang hoặc items rỗng |

---

### POST /api/v1/luong/cham-cong
**Description:** Chấm công cho một nhân viên (tạo mới hoặc cập nhật)
**Auth required:** Yes

**Request Body:**
```json
{
  "ma_nv": "string (bắt buộc)",
  "ngay_thang": "YYYY-MM-DD (bắt buộc)",
  "gio_check_in": "HH:MM",
  "gio_check_out": "HH:MM",
  "so_gio_lam": "number",
  "ghi_chu": "string"
}
```

---

### GET /api/v1/luong/cham-cong/by-day
**Description:** Lấy bản ghi chấm công của một nhân viên trong một ngày
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| ma_nv | string | Yes | Mã nhân viên |
| ngay_thang | string | Yes | YYYY-MM-DD |

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 404 | CHAM_CONG_NOT_FOUND | Không có bản ghi |

---

### GET /api/v1/luong/cham-cong
**Description:** Danh sách chấm công (lọc theo ngày / khoảng ngày / nhân viên)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| ma_nv | string | No | - | Lọc theo mã NV |
| ngay_thang | string | No | - | Ngày cụ thể YYYY-MM-DD |
| from | string | No | - | Từ ngày YYYY-MM-DD |
| to | string | No | - | Đến ngày YYYY-MM-DD |
| page | number | No | 1 | Trang |
| limit | number | No | 50 | Số bản ghi/trang |

---

### DELETE /api/v1/luong/cham-cong/:id
**Description:** Xóa mềm bản ghi chấm công
**Auth required:** Yes

---

### POST /api/v1/luong/tinh-luong
**Description:** Tính lương tháng cho nhân viên
**Auth required:** Yes

**Request Body:**
```json
{
  "ma_nv": "string (bắt buộc)",
  "thang": "number — 1-12 (bắt buộc)",
  "nam": "number — YYYY (bắt buộc)",
  "don_gia_gio": "number — Đơn giá/giờ",
  "thuong": "number — Tiền thưởng",
  "phat": "number — Tiền phạt",
  "ghi_chu": "string"
}
```

**Response 200:**
```json
{
  "success": true, "message": "Tính lương tháng thành công",
  "data": {
    "ma_nv": "string",
    "thang": 3, "nam": 2026,
    "tong_gio": "number",
    "luong_co_ban": "number",
    "thuong": "number",
    "phat": "number",
    "tong_luong": "number"
  }
}
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu ma_nv / thang / nam |
| 400 | TINH_LUONG_FAILED | Không có dữ liệu chấm công tháng này |

---

## 7. Dashboard

### GET /api/v1/dashboard/orders/compare
**Description:** So sánh số liệu đơn hàng giữa 2 năm theo khoảng thời gian
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| metric | string | No | ban_sp | Chỉ số: ban_sp / doanh_thu / so_don |
| yearA | number | No | năm hiện tại | Năm A |
| yearB | number | No | none | Năm B (none = không so sánh) |
| range | string | No | 90d | Khoảng: 7d / 30d / 90d / 365d |
| to | string | No | hôm nay | Ngày kết thúc YYYY-MM-DD |
| trang_thai | string | No | - | Lọc theo trạng thái |
| includeCancelled | boolean | No | true | Bao gồm đơn đã hủy |

**Response 200:**
```json
{
  "success": true, "message": "Lấy biểu đồ so sánh thành công",
  "data": { "rows": [ { "date": "YYYY-MM-DD", "valueA": "number", "valueB": "number" } ] }
}
```

---

### GET /api/v1/dashboard/orders/overview
**Description:** Tổng quan đơn hàng (3 chuỗi dữ liệu cho chart)
**Auth required:** Yes

**Request Query:** (giống orders/compare, không có metric)

**Response 200:**
```json
{
  "success": true, "message": "Lấy tổng quan thành công",
  "data": { "sale": [...], "prod_receipt": [...], "purchase_receipt": [...] }
}
```

---

### GET /api/v1/dashboard/orders/table
**Description:** Bảng đơn hàng cho dashboard (phân trang, lọc)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| page | number | No | 1 | Trang |
| limit | number | No | 20 | Số bản ghi/trang |
| q | string | No | "" | Tìm kiếm |
| loai_don | string | No | - | Lọc loại chứng từ |
| trang_thai | string | No | - | Lọc trạng thái |
| includeDeleted | boolean | No | false | Bao gồm đã xóa |

---

## 8. Phòng Ban & Chức Vụ

### POST /api/v1/phongban-chucvu
**Description:** Tạo phòng ban mới
**Auth required:** Yes

**Request Body:**
```json
{
  "ten_phong_ban": "string (bắt buộc)",
  "mo_ta": "string",
  "chuc_vu": [ { "ten_chuc_vu": "string", "mo_ta": "string", "he_so_luong": "number" } ]
}
```

**Response 201:**
```json
{ "success": true, "message": "Tạo phòng ban thành công", "data": { "insertedId": "ObjectId" } }
```

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 400 | VALIDATION_ERROR | Thiếu ten_phong_ban |
| 409 | DUPLICATE_KEY | Tên phòng ban đã tồn tại |

---

### GET /api/v1/phongban-chucvu
**Description:** Danh sách phòng ban (phân trang)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | No | "" | Tìm kiếm |
| status | string | No | - | Trạng thái |
| page | number | No | 1 | Trang |
| limit | number | No | 20 | Số bản ghi/trang |

---

### GET /api/v1/phongban-chucvu/all/list
**Description:** Lấy toàn bộ phòng ban (không phân trang)
**Auth required:** Yes

**Request Query:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| includeDeleted | boolean | No | false | Bao gồm đã xóa |

---

### GET /api/v1/phongban-chucvu/:id
**Description:** Lấy chi tiết một phòng ban (bao gồm danh sách chức vụ)
**Auth required:** Yes

**Response Errors:**
| Status | errorCode | When |
|--------|-----------|------|
| 404 | PHONGBAN_NOT_FOUND | Không tìm thấy phòng ban |

---

### PATCH /api/v1/phongban-chucvu/:id
**Description:** Cập nhật thông tin phòng ban
**Auth required:** Yes

**Request Body (tất cả tuỳ chọn):**
```json
{ "ten_phong_ban": "string", "mo_ta": "string", "trang_thai": "string" }
```

---

### DELETE /api/v1/phongban-chucvu/:id
**Description:** Xóa mềm phòng ban
**Auth required:** Yes

---

### PATCH /api/v1/phongban-chucvu/:id/restore
**Description:** Khôi phục phòng ban đã xóa mềm
**Auth required:** Yes

---

### DELETE /api/v1/phongban-chucvu/:id/hard
**Description:** Xóa vĩnh viễn phòng ban
**Auth required:** Yes

---

### POST /api/v1/phongban-chucvu/:id/chuc-vu
**Description:** Thêm chức vụ vào phòng ban
**Auth required:** Yes

**Request Body:**
```json
{
  "ten_chuc_vu": "string (bắt buộc)",
  "mo_ta": "string",
  "he_so_luong": "number — hệ số lương"
}
```

**Response 200:**
```json
{ "success": true, "message": "Thêm chức vụ thành công", "data": { "modifiedCount": 1, "chuc_vu_id": "ObjectId" } }
```

---

### PATCH /api/v1/phongban-chucvu/:id/chuc-vu/:chucVuId
**Description:** Cập nhật thông tin chức vụ
**Auth required:** Yes

**Request Body (tất cả tuỳ chọn):**
```json
{ "ten_chuc_vu": "string", "mo_ta": "string", "he_so_luong": "number", "trang_thai": "string" }
```

---

### DELETE /api/v1/phongban-chucvu/:id/chuc-vu/:chucVuId
**Description:** Xóa chức vụ khỏi phòng ban
**Auth required:** Yes

---

### PATCH /api/v1/phongban-chucvu/:id/chuc-vu/:chucVuId/status
**Description:** Cập nhật trạng thái chức vụ
**Auth required:** Yes

**Request Body:**
```json
{ "trang_thai": "string (bắt buộc)" }
```

---

## Error Codes Reference

| errorCode | HTTP | Description |
|-----------|------|-------------|
| VALIDATION_ERROR | 400 | Dữ liệu đầu vào không hợp lệ / thiếu trường bắt buộc |
| BAD_REQUEST | 400 | Yêu cầu không hợp lệ |
| UNAUTHORIZED | 401 | Chưa đăng nhập |
| MISSING_TOKEN | 401 | Thiếu Authorization header |
| INVALID_TOKEN | 401 | Token không hợp lệ |
| TOKEN_EXPIRED | 401 | Token đã hết hạn |
| LOGIN_FAILED | 401 | Sai tài khoản hoặc mật khẩu |
| REFRESH_FAILED | 401 | refreshToken không hợp lệ |
| FORBIDDEN | 403 | Không có quyền truy cập |
| NOT_FOUND | 404 | Không tìm thấy tài nguyên |
| USER_NOT_FOUND | 404 | Không tìm thấy người dùng |
| PRODUCT_NOT_FOUND | 404 | Không tìm thấy sản phẩm |
| MATERIAL_NOT_FOUND | 404 | Không tìm thấy nguyên liệu |
| ORDER_NOT_FOUND | 404 | Không tìm thấy đơn hàng |
| BOM_NOT_FOUND | 404 | Sản phẩm chưa có BOM |
| CHAM_CONG_NOT_FOUND | 404 | Không tìm thấy bản ghi chấm công |
| PHONGBAN_NOT_FOUND | 404 | Không tìm thấy phòng ban |
| DUPLICATE_KEY | 409 | Dữ liệu đã tồn tại (mã trùng) |
| INTERNAL_ERROR | 500 | Lỗi máy chủ nội bộ |

---

## API Summary

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | POST | /api/v1/users/register | No | Đăng ký tài khoản |
| 2 | POST | /api/v1/users/login | No | Đăng nhập |
| 3 | POST | /api/v1/users/refresh | No | Làm mới token |
| 4 | POST | /api/v1/users/logout | Yes | Đăng xuất |
| 5 | POST | /api/v1/users/logout-all | Yes | Đăng xuất tất cả thiết bị |
| 6 | GET | /api/v1/users | Yes | Danh sách người dùng |
| 7 | GET | /api/v1/users/danh-sach-nhan-vien | Yes | Danh sách nhân viên (phân quyền) |
| 8 | GET | /api/v1/users/me/:id | Yes | Thông tin tài khoản hiện tại |
| 9 | GET | /api/v1/users/:id | Yes | Chi tiết người dùng |
| 10 | PATCH | /api/v1/users/:id/profile | Yes | Cập nhật hồ sơ |
| 11 | PATCH | /api/v1/users/:id/password | Yes | Đổi mật khẩu |
| 12 | PUT | /api/v1/users/:id/chuc-vu | Yes | Thiết lập chức vụ |
| 13 | PATCH | /api/v1/users/:id/chuc-vu | Yes | Cập nhật chức vụ |
| 14 | DELETE | /api/v1/users/:id/chuc-vu | Yes | Xóa chức vụ |
| 15 | PUT | /api/v1/users/:id/phong-ban | Yes | Thiết lập phòng ban |
| 16 | PATCH | /api/v1/users/:id/phong-ban | Yes | Cập nhật phòng ban |
| 17 | DELETE | /api/v1/users/:id/phong-ban | Yes | Xóa phòng ban |
| 18 | DELETE | /api/v1/users/:id | Yes | Khóa tài khoản |
| 19 | PATCH | /api/v1/users/:id/restore | Yes | Khôi phục tài khoản |
| 20 | POST | /api/v1/san-pham | Yes | Tạo sản phẩm |
| 21 | GET | /api/v1/san-pham | Yes | Danh sách sản phẩm |
| 22 | GET | /api/v1/san-pham/search | Yes | Tìm kiếm nhanh sản phẩm |
| 23 | GET | /api/v1/san-pham/stock | Yes | Tồn kho sản phẩm |
| 24 | GET | /api/v1/san-pham/stats/summary | Yes | Thống kê tồn kho |
| 25 | GET | /api/v1/san-pham/stats/low-stock | Yes | Sản phẩm sắp hết |
| 26 | POST | /api/v1/san-pham/bulk/adjust-stock | Yes | Điều chỉnh tồn kho hàng loạt |
| 27 | POST | /api/v1/san-pham/:id/adjust-stock | Yes | Điều chỉnh tồn kho một SP |
| 28 | GET | /api/v1/san-pham/:id | Yes | Chi tiết sản phẩm |
| 29 | PATCH | /api/v1/san-pham/:id | Yes | Cập nhật sản phẩm |
| 30 | PATCH | /api/v1/san-pham/:id/status | Yes | Cập nhật trạng thái SP |
| 31 | DELETE | /api/v1/san-pham/:id | Yes | Xóa mềm sản phẩm |
| 32 | PATCH | /api/v1/san-pham/:id/restore | Yes | Khôi phục sản phẩm |
| 33 | DELETE | /api/v1/san-pham/:id/hard | Yes | Xóa vĩnh viễn sản phẩm |
| 34 | POST | /api/v1/nguyen-lieu | Yes | Tạo nguyên liệu |
| 35 | GET | /api/v1/nguyen-lieu | Yes | Danh sách nguyên liệu |
| 36 | GET | /api/v1/nguyen-lieu/search | Yes | Tìm kiếm nhanh NL |
| 37 | GET | /api/v1/nguyen-lieu/stock | Yes | Tồn kho nguyên liệu |
| 38 | GET | /api/v1/nguyen-lieu/stats/summary | Yes | Thống kê tồn kho NL |
| 39 | GET | /api/v1/nguyen-lieu/stats/low-stock | Yes | Nguyên liệu sắp hết |
| 40 | POST | /api/v1/nguyen-lieu/:id/adjust-stock | Yes | Điều chỉnh tồn kho NL |
| 41 | GET | /api/v1/nguyen-lieu/:id | Yes | Chi tiết nguyên liệu |
| 42 | PATCH | /api/v1/nguyen-lieu/:id | Yes | Cập nhật nguyên liệu |
| 43 | DELETE | /api/v1/nguyen-lieu/:id | Yes | Xóa mềm nguyên liệu |
| 44 | PATCH | /api/v1/nguyen-lieu/:id/restore | Yes | Khôi phục nguyên liệu |
| 45 | POST | /api/v1/bom/:san_pham_id | Yes | Khai báo / ghi đè BOM |
| 46 | GET | /api/v1/bom/:san_pham_id | Yes | Lấy BOM sản phẩm |
| 47 | GET | /api/v1/bom/:san_pham_id/unit-cost | Yes | Tính giá thành đơn vị |
| 48 | POST | /api/v1/don-hang/sales | Yes | Tạo đơn bán hàng |
| 49 | POST | /api/v1/don-hang/receipts/production | Yes | Tạo đơn nhập kho SX |
| 50 | POST | /api/v1/don-hang/receipts/purchase | Yes | Tạo đơn nhập kho mua |
| 51 | POST | /api/v1/don-hang | Yes | Tạo chứng từ chung |
| 52 | GET | /api/v1/don-hang | Yes | Danh sách chứng từ |
| 53 | GET | /api/v1/don-hang/receipts/production | Yes | Danh sách đơn nhập kho SX |
| 54 | GET | /api/v1/don-hang/receipts/production/:id/needs | Yes | Nhu cầu nguyên liệu |
| 55 | GET | /api/v1/don-hang/code/:ma_dh | Yes | Chứng từ theo mã |
| 56 | GET | /api/v1/don-hang/stats/revenue | Yes | Thống kê doanh thu |
| 57 | GET | /api/v1/don-hang/:id | Yes | Chi tiết chứng từ |
| 58 | PUT | /api/v1/don-hang/:id/items | Yes | Thay thế danh sách SP |
| 59 | POST | /api/v1/don-hang/:id/items | Yes | Thêm SP vào đơn |
| 60 | DELETE | /api/v1/don-hang/:id/items | Yes | Xóa SP khỏi đơn |
| 61 | POST | /api/v1/don-hang/:id/discount | Yes | Áp dụng giảm giá |
| 62 | POST | /api/v1/don-hang/:id/tax | Yes | Áp dụng thuế |
| 63 | POST | /api/v1/don-hang/:id/shipping-fee | Yes | Cập nhật phí vận chuyển |
| 64 | POST | /api/v1/don-hang/:id/payment | Yes | Cập nhật thanh toán |
| 65 | PATCH | /api/v1/don-hang/:id/note | Yes | Cập nhật ghi chú |
| 66 | PATCH | /api/v1/don-hang/:id/status | Yes | Cập nhật trạng thái (+ tồn kho) |
| 67 | DELETE | /api/v1/don-hang/:id | Yes | Xóa mềm chứng từ |
| 68 | PATCH | /api/v1/don-hang/:id/restore | Yes | Khôi phục chứng từ |
| 69 | DELETE | /api/v1/don-hang/:id/hard | Yes | Xóa vĩnh viễn chứng từ |
| 70 | POST | /api/v1/luong/cham-cong/bulk | Yes | Chấm công hàng loạt |
| 71 | POST | /api/v1/luong/cham-cong | Yes | Chấm công một NV |
| 72 | GET | /api/v1/luong/cham-cong/by-day | Yes | Chấm công theo ngày |
| 73 | GET | /api/v1/luong/cham-cong | Yes | Danh sách chấm công |
| 74 | DELETE | /api/v1/luong/cham-cong/:id | Yes | Xóa bản ghi chấm công |
| 75 | POST | /api/v1/luong/tinh-luong | Yes | Tính lương tháng |
| 76 | GET | /api/v1/dashboard/orders/compare | Yes | So sánh đơn hàng |
| 77 | GET | /api/v1/dashboard/orders/overview | Yes | Tổng quan đơn hàng |
| 78 | GET | /api/v1/dashboard/orders/table | Yes | Bảng đơn hàng dashboard |
| 79 | POST | /api/v1/phongban-chucvu | Yes | Tạo phòng ban |
| 80 | GET | /api/v1/phongban-chucvu | Yes | Danh sách phòng ban |
| 81 | GET | /api/v1/phongban-chucvu/all/list | Yes | Toàn bộ phòng ban |
| 82 | GET | /api/v1/phongban-chucvu/:id | Yes | Chi tiết phòng ban |
| 83 | PATCH | /api/v1/phongban-chucvu/:id | Yes | Cập nhật phòng ban |
| 84 | DELETE | /api/v1/phongban-chucvu/:id | Yes | Xóa mềm phòng ban |
| 85 | PATCH | /api/v1/phongban-chucvu/:id/restore | Yes | Khôi phục phòng ban |
| 86 | DELETE | /api/v1/phongban-chucvu/:id/hard | Yes | Xóa vĩnh viễn phòng ban |
| 87 | POST | /api/v1/phongban-chucvu/:id/chuc-vu | Yes | Thêm chức vụ |
| 88 | PATCH | /api/v1/phongban-chucvu/:id/chuc-vu/:chucVuId | Yes | Cập nhật chức vụ |
| 89 | DELETE | /api/v1/phongban-chucvu/:id/chuc-vu/:chucVuId | Yes | Xóa chức vụ |
| 90 | PATCH | /api/v1/phongban-chucvu/:id/chuc-vu/:chucVuId/status | Yes | Trạng thái chức vụ |

---

## 9. Sổ Quỹ & Khóa Sổ Kỳ Kế Toán (Cashbook & Period Closing)

**Base Route:** `/api/v1/cashbook` *(Alias: `/api/v1/so-quy`)*

### GET /api/v1/cashbook
**Description:** Lấy danh sách phiếu thu / chi kèm phân trang và lọc đa tiêu chí  
**Auth required:** Yes  
**Query Parameters:**
- `type` / `loai_phieu`: "thu" | "chi"
- `category` / `hang_muc`: danh mục thu chi
- `method` / `phuong_thuc`: "tien_mat" | "chuyen_khoan"
- `fromDate` / `tu_ngay`, `toDate` / `den_ngay`: khoảng thời gian ghi nhận (YYYY-MM-DD)
- `search` / `q`: tìm kiếm mã phiếu, đối tượng, ghi chú
- `page`, `limit`: phân trang (mặc định page=1, limit=20)

### GET /api/v1/cashbook/tong-quan
**Description:** Thống kê tổng quan dòng tiền (Tổng thu, Tổng chi, Tồn quỹ hiện tại, Biểu đồ biến động)  
**Auth required:** Yes  

### GET /api/v1/cashbook/cong-no
**Description:** Danh sách đối soát công nợ 2 chiều (Phải thu khách hàng & Phải trả nhà cung cấp)  
**Auth required:** Yes  

### POST /api/v1/cashbook
**Description:** Lập phiếu thu hoặc phiếu chi mới (Kiểm tra chặn tự động nếu ngày ghi nhận thuộc kỳ kế toán đã khóa sổ)  
**Auth required:** Yes  
**Request Body:**
```json
{
  "type": "thu",
  "category": "thu_ban_hang",
  "amount": 2500000,
  "method": "chuyen_khoan",
  "partner": "Công ty TNHH Giải Pháp Công Nghệ",
  "reference_code": "DH-20260928-1234",
  "record_date": "2026-09-28",
  "note": "Thu tiền đơn bán hàng"
}
```

### PUT /api/v1/cashbook/:id/huy
**Description:** Hủy phiếu thu / chi (Chỉ Admin / Kế toán trưởng; Chặn nếu thuộc kỳ đã khóa sổ)  
**Auth required:** Yes (Admin)  
**Request Body:**
```json
{
  "reason": "Nhập sai số tiền hóa đơn"
}
```

### GET /api/v1/cashbook/ky-ke-toan
**Description:** Danh sách các kỳ kế toán và trạng thái khóa sổ  
**Auth required:** Yes  

### POST /api/v1/cashbook/ky-ke-toan/chot-so
**Description:** Niêm phong và khóa sổ kỳ kế toán (Chỉ Ban Giám Đốc / Kế toán trưởng)  
**Auth required:** Yes (Admin)  
**Request Body:**
```json
{
  "period": "2026-08",
  "fromDate": "2026-08-01",
  "toDate": "2026-08-31",
  "note": "Chốt sổ Báo cáo Tài chính Tháng 8/2026"
}
```

### POST /api/v1/cashbook/ky-ke-toan/:ky/mo-khoa
**Description:** Mở khóa kỳ kế toán đã chốt sổ phục vụ điều chỉnh ngoại lệ (Ghi nhật ký Audit bắt buộc)  
**Auth required:** Yes (Admin)  
**Request Body:**
```json
{
  "reason": "Điều chỉnh bổ sung hóa đơn chiết khấu theo quyết định giám đốc"
}
```

---

## 10. Thẻ Kho & Báo Cáo Xuất - Nhập - Tồn (Stock Movement Ledger)

**Base Route:** `/api/v1/stock-ledger` *(Alias: `/api/v1/the-kho`)*

### GET /api/v1/stock-ledger/in-out-balance
**Description:** Báo cáo Xuất - Nhập - Tồn tổng hợp theo kỳ (Tồn đầu, Nhập trong kỳ, Xuất trong kỳ, Tồn cuối & Giá trị thành tiền)  
**Auth required:** Yes  
**Query Parameters:**
- `fromDate` / `tu_ngay`: Ngày bắt đầu kỳ (YYYY-MM-DD)
- `toDate` / `den_ngay`: Ngày kết thúc kỳ (YYYY-MM-DD)
- `type` / `loai`: "all" | "san_pham" | "nguyen_lieu"

### GET /api/v1/stock-ledger/card
**Description:** Thẻ kho chi tiết cho một mặt hàng cụ thể, liệt kê toàn bộ dòng phát sinh và số dư lũy kế tức thời  
**Auth required:** Yes  
**Query Parameters:**
- `itemId`: ID mặt hàng (bắt buộc)
- `type`: "san_pham" | "nguyen_lieu"
- `fromDate`, `toDate`: Khoảng thời gian tra cứu

---

## 11. Báo Giá B2B & Chuyển Đổi Đơn Hàng (Quotations & Quote-to-Order)

**Base Route:** `/api/v1/quotations` *(Alias: `/api/v1/bao-gia`)*

### POST /api/v1/quotations
**Description:** Lập báo giá B2B mới kèm tính toán chiết khấu và thuế VAT  
**Auth required:** Yes  
**Request Body:**
```json
{
  "customer_name": "Tập đoàn Công nghệ Alpha Tech",
  "phone": "0987654321",
  "email": "contact@alphatech.vn",
  "items": [
    {
      "product_id": "6732f...",
      "code": "SP001",
      "name": "Bàn làm việc thông minh Pro",
      "quantity": 5,
      "price": 5000000
    }
  ],
  "discount": 1250000,
  "tax_rate": 0.1,
  "valid_until": "2026-10-28",
  "note": "Báo giá cung cấp nội thất văn phòng"
}
```

### GET /api/v1/quotations
**Description:** Lấy danh sách báo giá kèm bộ lọc trạng thái và phân trang  
**Auth required:** Yes  
**Query Parameters:** `status` ("draft", "sent", "accepted", "rejected", "converted"), `search`, `page`, `limit`

### GET /api/v1/quotations/:id
**Description:** Chi tiết 1 báo giá theo ID hoặc mã báo giá `BG-...`  
**Auth required:** Yes  

### PATCH /api/v1/quotations/:id/status
**Description:** Cập nhật trạng thái báo giá (`sent`, `accepted`, `rejected`, `expired`)  
**Auth required:** Yes  

### POST /api/v1/quotations/:id/convert-to-order
**Description:** Chuyển đổi 1-Click từ Báo giá sang Đơn Bán Hàng, kế thừa toàn bộ danh sách mặt hàng, giá bán, chiết khấu và thuế VAT  
**Auth required:** Yes  

---

## 12. Trung Tâm Phê Duyệt Thống Nhất (Unified Approval Hub)

**Base Route:** `/api/v1/approvals`

### GET /api/v1/approvals/pending
**Description:** Lấy toàn bộ danh sách chứng từ đang chờ phê duyệt trên toàn hệ thống (Đơn mua NVL, Điều chỉnh kiểm kê, Đơn bán chiết khấu cao, Bảng lương tháng)  
**Auth required:** Yes (Approver/Admin)  

### POST /api/v1/approvals/action
**Description:** Phê duyệt hoặc từ chối chứng từ tập trung (Áp dụng anti self-approve)  
**Auth required:** Yes (Approver/Admin)  
**Request Body:**
```json
{
  "type": "STOCK_ADJUSTMENT",
  "id": "6732f...",
  "action": "APPROVE",
  "reason": "Số liệu kiểm kê thực tế chính xác"
}
```

---

## 13. Đổi Trả Hàng RMA & Kiểm Định QC (Return Orders)

**Base Route:** `/api/v1/return-orders` *(Alias: `/api/v1/doi-tra`)*

### POST /api/v1/return-orders
**Description:** Tạo yêu cầu đổi trả hàng RMA (Kiểm soát nghiêm ngặt không cho đổi trả vượt số lượng đơn gốc)  
**Auth required:** Yes  

### GET /api/v1/return-orders
**Description:** Lấy danh sách phiếu RMA kèm trạng thái xử lý  
**Auth required:** Yes  

### PATCH /api/v1/return-orders/:id/approve
**Description:** Quản lý phê duyệt yêu cầu đổi trả, chuyển kho tiến hành kiểm định QC  
**Auth required:** Yes (Approver)  

### PATCH /api/v1/return-orders/:id/qc-inspect
**Description:** Nghiệm thu kiểm định QC: Nhập hoàn kho sản phẩm đạt chuẩn và tự động sinh Phiếu Chi hoàn tiền trong Sổ Quỹ  
**Auth required:** Yes (Warehouse/QC)  

---

## 14. Bàn Giao Liên Ban Bộ 1-Click Handover & Thảo Luận @Mentions

**Base Route:** `/api/v1/order` *(Alias: `/api/v1/don-hang`)*

### POST /api/v1/order/:id/chuyen-san-xuat
**Description:** Bàn giao đơn bán hàng sang Phòng Sản Xuất để lập Lệnh Sản Xuất  
**Auth required:** Yes  

### POST /api/v1/order/:id/ban-giao-kho
**Description:** Sản xuất hoàn tất, bàn giao thành phẩm nhập kho lưu trữ  
**Auth required:** Yes  

### POST /api/v1/order/:id/chuyen-van-chuyen
**Description:** Kho đóng gói xong, chuyển giao đơn hàng tạo Vận Đơn Logistics  
**Auth required:** Yes  

### POST /api/v1/order/:id/comments
**Description:** Thảo luận nội bộ trên chứng từ, trích xuất `@username` và phát thông báo Socket.io realtime  
**Auth required:** Yes  
**Request Body:**
```json
{
  "content": "Đã bàn giao đơn hàng cho @truongkd và @sale kiểm tra tiến độ giao hàng!"
}
```

---

## 15. Vận Chuyển Logistics (Shipping)

**Base Route:** `/api/v1/shipping` *(Alias: `/api/v1/van-chuyen`)*

### GET /api/v1/shipping
**Description:** Danh sách vận đơn logistics, đối soát tiền thu hộ COD  
**Auth required:** Yes  

### GET /api/v1/shipping/tong-quan
**Description:** Thống kê tổng quan tình hình giao nhận hàng hóa  
**Auth required:** Yes  

### POST /api/v1/shipping
**Description:** Tạo vận đơn vận chuyển mới  
**Auth required:** Yes  

### PATCH /api/v1/shipping/:id/status
**Description:** Cập nhật trạng thái giao nhận vận đơn  
**Auth required:** Yes  

---

## 16. Đối Tác CRM (Partners)

**Base Route:** `/api/v1/partner` *(Alias: `/api/v1/doi-tac`)*

### GET /api/v1/partner
**Description:** Danh sách đối tác khách hàng & nhà cung cấp kèm phân loại VIP, công nợ và doanh số LTV  
**Auth required:** Yes  

### GET /api/v1/partner/tong-quan
**Description:** Thống kê CRM đối tác  
**Auth required:** Yes  

### GET /api/v1/partner/:id
**Description:** Chi tiết hồ sơ Customer 360°  
**Auth required:** Yes  

### POST /api/v1/partner
**Description:** Tạo đối tác mới  
**Auth required:** Yes  

---

## 17. Điều Chỉnh Kho Kiểm Kê (Stock Adjustments)

**Base Route:** `/api/v1/stock-adjustment` *(Alias: `/api/v1/dieu-chinh-kho`)*

### POST /api/v1/stock-adjustment
**Description:** Lập phiếu kiểm kê điều chỉnh tồn kho  
**Auth required:** Yes  

### GET /api/v1/stock-adjustment
**Description:** Danh sách phiếu kiểm kê chờ duyệt và đã xử lý  
**Auth required:** Yes  

### PATCH /api/v1/stock-adjustment/:id/approve
**Description:** Phê duyệt phiếu điều chỉnh kho (Tự động cộng/trừ tồn kho an toàn bằng MongoDB session transaction / atomic latch)  
**Auth required:** Yes (Approver)  

### PATCH /api/v1/stock-adjustment/:id/reject
**Description:** Từ chối phiếu điều chỉnh kho kèm lý do  
**Auth required:** Yes (Approver)  

---

## 18. Sản Xuất & Lệnh SX (Production Orders & Traceability)

**Base Route:** `/api/v1/production` *(Alias: `/api/v1/san-xuat`)*

### POST /api/v1/production
**Description:** Tạo lệnh sản xuất: Bóc tách BOM, kiểm tra trừ kho NVL và cộng thành phẩm  
**Auth required:** Yes  

### GET /api/v1/production/logs
**Description:** Nhật ký lịch sử các đợt sản xuất  
**Auth required:** Yes  

### GET /api/v1/production/lo/:ma_lo
**Description:** Tra cứu nguồn gốc xuất xứ lô sản xuất theo mã lô  
**Auth required:** Yes  

