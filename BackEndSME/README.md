# SME Backend API

Node.js ESM REST API cho hệ thống quản lý doanh nghiệp vừa và nhỏ (**SME ERP**). Toàn bộ hệ thống mã nguồn, controllers, services và model DAOs được chuẩn hóa tên tiếng Anh đồng bộ, hỗ trợ 100% tính tương thích ngược (backward compatibility) cho các endpoint và dữ liệu legacy.

---

## 🛠️ Tech Stack & Kiến Trúc

| Thành phần | Phiên bản / Thư viện | Mục đích & Chi tiết |
|---|---|---|
| **Runtime** | Node.js ≥ 20 (ES Modules) | Môi trường thực thi hiện đại với native `import/export` |
| **HTTP Framework** | Express v5 | RESTful routing, async error handling middleware |
| **Database** | MongoDB Native Driver v6 | Aggregation Pipelines tốc độ cao, Multi-document Transactions |
| **Authentication** | JWT (jsonwebtoken) v9 + bcrypt v6 | Access token ngắn hạn + Refresh token xoay vòng bảo mật |
| **Realtime Engine** | Socket.io v4 | Kênh phát thông báo theo phòng ban/vai trò và @mentions |
| **Logging & Audit** | Winston v3 + Audit Logger | Ghi vết nghiệp vụ có cấu trúc (CREATE, UPDATE, DELETE, CLOSE_PERIOD) |
| **Tài liệu API** | Swagger UI v5 | Giao diện tài liệu tương tác tại `/api-docs` |
| **Bảo mật** | Helmet, CORS, Express Rate Limit | Chống brute-force, injection và bảo vệ HTTP headers |

---

## 🏗️ Cấu Trúc Mã Nguồn (Standard English Layering)

```
BackEndSME/
├── index.js                     # Bootstrap ứng dụng, inject MongoDB vào DAOs, khởi chạy server
├── server.js                    # Cấu hình Express app, middleware chuỗi, mount router v1
├── seed.js                      # Kịch bản khởi tạo dữ liệu mẫu thực tế
├── controllers/                 # Lớp tiếp nhận HTTP Request & trả Response (Standard English Classes)
│   ├── approvalController.js    # Trung tâm duyệt việc tập trung (Unified Approval Hub)
│   ├── cashbookController.js    # Sổ quỹ, dòng tiền & khóa sổ kỳ kế toán (CashbookController)
│   ├── dashboardController.js   # Báo cáo tổng quan KPI, tăng trưởng cùng kỳ YoY
│   ├── departmentPositionController.js # Sơ đồ tổ chức, phòng ban & chức vụ
│   ├── importController.js      # Nhập dữ liệu hàng loạt từ Excel
│   ├── materialController.js    # Quản lý kho nguyên vật liệu (MaterialController)
│   ├── orderController.js       # Quản lý đơn bán hàng, bàn giao 1-click & mentions
│   ├── partnerController.js     # Mini CRM quản lý đối tác 360° (PartnerController)
│   ├── payrollController.js     # Bảng lương & chấm công nhân viên (PayrollController)
│   ├── planningController.js    # Dự báo nhu cầu bán hàng, MRP, ABC Pareto, TMĐT
│   ├── productController.js     # Danh mục sản phẩm & định mức BOM (ProductController)
│   ├── productionController.js  # Lệnh sản xuất, bóc tách nguyên liệu & tra cứu mã lô
│   ├── quotationController.js   # Báo giá B2B & chuyển đổi Quote-to-Order
│   ├── returnOrderController.js # Quy trình đổi trả hàng RMA & kiểm định QC
│   ├── shippingController.js    # Vận đơn logistics, theo dõi trạng thái & COD
│   ├── stockAdjustmentController.js # Phiếu kiểm kê cân bằng kho (StockAdjustmentController)
│   ├── stockLedgerController.js # Thẻ kho chi tiết & Báo cáo tổng hợp XNT
│   └── userController.js        # Xác thực người dùng, hồ sơ cá nhân & quản lý tài khoản
├── models/                      # Lớp Data Access Object (DAO) làm việc với MongoDB
│   ├── cashbookDAO.js           # (Alias: soQuyDAO.js)
│   ├── departmentPositionDAO.js # (Alias: phongban_chucvuDAO.js)
│   ├── materialDAO.js           # (Alias: nguyenLieuDAO.js)
│   ├── notificationDAO.js       # (Alias: thongBaoDAO.js)
│   ├── orderDAO.js              # (Alias: donHangDAO.js + donHangCRUD/Inventory/State)
│   ├── partnerDAO.js            # (Alias: doiTacDAO.js)
│   ├── payrollDAO.js            # (Alias: luongDAO.js)
│   ├── periodClosingDAO.js      # Khóa sổ kỳ kế toán & niêm phong chứng từ
│   ├── productDAO.js            # (Alias: sanPhamDAO.js)
│   ├── quotationDAO.js          # Nghiệp vụ báo giá B2B & tính thuế VAT
│   ├── returnOrderDAO.js        # Đổi trả hàng RMA & đối soát số lượng đơn gốc
│   ├── shippingDAO.js           # (Alias: vanChuyenDAO.js)
│   ├── stockAdjustmentDAO.js    # (Alias: dieuChinhKhoDAO.js)
│   └── stockLedgerDAO.js        # Thẻ kho & Báo cáo Xuất - Nhập - Tồn
├── services/                    # Lớp xử lý nghiệp vụ chuyên sâu & quy trình khép kín
│   ├── departmentService.js
│   ├── materialService.js
│   ├── orderService.js
│   ├── payrollService.js
│   ├── productService.js
│   └── productionService.js
├── routes/v1/                   # Router Express phiên bản v1
│   ├── index.js                 # Mount toàn bộ các route tiêu chuẩn & alias
│   ├── approvals.route.js
│   ├── cashbook.route.js        # (Alias: so-quy.route.js)
│   ├── material.route.js        # (Alias: nguyen-lieu.route.js)
│   ├── order.route.js           # (Alias: don-hang.route.js)
│   ├── partner.route.js         # (Alias: doi-tac.route.js)
│   ├── payroll.route.js         # (Alias: luong.route.js)
│   ├── product.route.js         # (Alias: san-pham.route.js)
│   ├── quotation.route.js       # (Alias: bao-gia.route.js)
│   ├── return-order.route.js    # (Alias: doi-tra.route.js)
│   ├── shipping.route.js        # (Alias: van-chuyen.route.js)
│   ├── stock-adjustment.route.js # (Alias: dieu-chinh-kho.route.js)
│   └── stock-ledger.route.js    # (Alias: the-kho.route.js)
├── middleware/                  # JWT auth, role authorization, asyncHandler, errorHandler
└── utils/                       # Audit logger, response formatter, socketManager, Winston
```

---

## 🔄 Các Quy Trình Nghiệp Vụ Khép Kín (Closed-Loop Workflows)

1. **Báo Giá B2B $\to$ Đơn Hàng (Quote-to-Order)**:
   - Tạo báo giá tại `/api/v1/quotations`.
   - Trình duyệt và gửi khách hàng (`accepted`).
   - Gọi `POST /api/v1/quotations/:ma_bao_gia/convert-to-order` $\to$ Hệ thống tự sinh Đơn Bán Hàng kế thừa toàn bộ danh sách mặt hàng, đơn giá, chiết khấu và thuế VAT chính xác.
2. **Thẻ Kho & Xuất Nhập Tồn (Stock Movement Ledger)**:
   - Tổng hợp biến động kho từ mọi nguồn chứng từ (Đơn bán, Đơn mua, Lệnh SX, Bàn giao kho, Điều chỉnh kiểm kê, Đổi trả RMA).
   - Truy vấn Báo cáo XNT tổng hợp: `GET /api/v1/stock-ledger/in-out-balance`.
   - Tra cứu Thẻ Kho chi tiết từng mặt hàng: `GET /api/v1/stock-ledger/card`.
3. **Đổi Trả Hàng (RMA) $\to$ QC $\to$ Tự Động Sinh Phiếu Chi**:
   - Nhân viên gửi yêu cầu RMA kèm đối soát số lượng với đơn bán gốc.
   - Quản lý duyệt yêu cầu $\to$ Thủ kho nghiệm thu QC đạt chuẩn.
   - Hệ thống tự động nhập hoàn kho mặt hàng và sinh Phiếu Chi (`PC-...`) hoàn tiền khách hàng trong Sổ Quỹ.
4. **Khóa Sổ Kỳ Kế Toán (Period Closing Locking)**:
   - Chốt sổ định kỳ tại `POST /api/v1/cashbook/ky-ke-toan/chot-so`.
   - Khi kỳ kế toán đã khóa, toàn bộ các API tạo phiếu, hủy phiếu hoặc chỉnh sửa chứng từ thuộc kỳ đều bị chặn với mã lỗi `403 Forbidden`.
5. **Bàn Giao Liên Ban Bộ 1-Click Handover**:
   - `POST /api/v1/order/:id/chuyen-san-xuat` $\to$ Chuyển đơn sang Lệnh Sản Xuất.
   - `POST /api/v1/order/:id/ban-giao-kho` $\to$ Sản xuất xong bàn giao vào Kho Thành Phẩm.
   - `POST /api/v1/order/:id/chuyen-van-chuyen` $\to$ Kho xuất hàng tạo ngay Vận Đơn Logistics.
   - `POST /api/v1/order/:id/comments` $\to$ Thảo luận nội bộ và tag `@username` gửi thông báo realtime.

---

## 🚀 Hướng Dẫn Vận Hành & Khởi Chạy

### 1. Khởi chạy với Docker (Khuyến nghị)
Hệ thống API chạy trong container `sme_api`, kết nối trực tiếp với MongoDB container:
```bash
# Từ thư mục gốc dự án
docker compose up -d
```
- API Endpoint: `http://localhost/api/v1`
- Swagger UI: `http://localhost/api-docs`
- Health check: `http://localhost/api/v1/health`

### 2. Cập nhật mã nguồn nóng vào container (Không cần rebuild)
Khi chỉnh sửa mã nguồn backend trên máy host, đồng bộ trực tiếp vào container:
```bash
docker cp BackEndSME/. sme_api:/app/ && docker restart sme_api
```

### 3. Chạy cục bộ không qua Docker (Local Development)
Yêu cầu: Node.js ≥ 20 và MongoDB đang hoạt động.
```bash
cd BackEndSME
npm install
npm run dev
```

---

## 🧪 Bộ Kịch Bản Kiểm Thử (Verification Test Suites)

Hệ thống đi kèm 3 bộ test suite tự động kiểm tra toàn bộ luồng nghiệp vụ khép kín:
```bash
# 1. Kiểm tra Thẻ Kho, XNT và Báo Giá B2B Quote-to-Order
node scratch/test_stock_ledger_and_quotations.js

# 2. Kiểm tra Phân quyền bảo mật, Khóa sổ kỳ kế toán, RMA & QC, POS Auto-Cashbook
node scratch/test_fixes_verification.js

# 3. Kiểm tra Luồng Bàn Giao 1-Click Handover & Thông Báo @Mentions Realtime
node scratch/test_inter_department.js
```
Tất cả các bộ test đều chạy tự động qua REST API thực tế và xác thực tính toàn vẹn của dữ liệu trong cơ sở dữ liệu.
