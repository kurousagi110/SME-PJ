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
│   ├── aiCopilotController.js   # Trợ lý Agentic AI Copilot & OCR Hóa đơn nhập hàng
│   ├── approvalController.js    # Trung tâm duyệt việc tập trung (Unified Approval Hub)
│   ├── auditLogController.js    # Nhật ký kiểm toán hệ thống & Visual Diff
│   ├── batchController.js       # Quản lý lô sản xuất (lo_san_xuat) & gợi ý xuất kho FEFO
│   ├── cashbookController.js    # Sổ quỹ, dòng tiền & khóa sổ kỳ kế toán (CashbookController)
│   ├── contractController.js    # Quản lý hợp đồng B2B & đợt thanh toán (ContractController)
│   ├── dashboardController.js   # Báo cáo tổng quan KPI, tăng trưởng cùng kỳ YoY
│   ├── departmentPositionController.js # Sơ đồ tổ chức, phòng ban & chức vụ
│   ├── financialController.js   # P&L, COGS, Tuổi nợ, Dự báo dòng tiền & Đối soát sao kê
│   ├── importController.js      # Nhập dữ liệu hàng loạt từ Excel
│   ├── materialController.js    # Quản lý kho nguyên vật liệu (MaterialController)
│   ├── orderController.js       # Đơn bán, chiết khấu B2B, voucher, chặn nợ & bàn giao
│   ├── partnerController.js     # Mini CRM quản lý đối tác 360° (PartnerController)
│   ├── payrollController.js     # Bảng lương & chấm công nhân viên (PayrollController)
│   ├── planningController.js    # Dự báo nhu cầu, MRP, ABC Pareto, TMĐT, ATP & Supplier Scorecard
│   ├── portalController.js      # Cổng tra cứu khách hàng công khai /portal (4 số cuối SĐT + VietQR)
│   ├── paymentController.js     # Webhook thanh toán SePay/Casso (timingSafeEqualStrings)
│   ├── productController.js     # Danh mục sản phẩm & định mức BOM (ProductController)
│   ├── productionController.js  # Lệnh SX, Kanban 6 công đoạn, hao hụt & Yield Rate
│   ├── quotationController.js   # Báo giá B2B & chuyển đổi Quote-to-Order
│   ├── returnOrderController.js # Quy trình đổi trả hàng RMA & kiểm định QC
│   ├── shippingController.js    # Vận đơn logistics, theo dõi trạng thái & COD
│   ├── stockAdjustmentController.js # Phiếu kiểm kê cân bằng kho (StockAdjustmentController)
│   ├── stockLedgerController.js # Thẻ kho chi tiết & Báo cáo tổng hợp XNT
│   ├── telegramBotController.js # Tự động hóa Bot Telegram & Báo cáo sáng
│   ├── userController.js        # Xác thực người dùng, hồ sơ cá nhân & quản lý tài khoản
│   └── warrantyController.js    # Thẻ bảo hành điện tử, tra cứu SĐT & lịch sử kỹ thuật
├── models/                      # Lớp Data Access Object (DAO) làm việc với MongoDB
│   ├── cashbookDAO.js           # (Alias: soQuyDAO.js)
│   ├── contractDAO.js           # Quản lý hợp đồng B2B & tự sinh Phiếu Thu từng đợt
│   ├── departmentPositionDAO.js # (Alias: phongban_chucvuDAO.js)
│   ├── financialReportDAO.js    # P&L, COGS, Tuổi nợ, Dự báo dòng tiền 12 tuần & Đối soát
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
│   ├── stockLedgerDAO.js        # Thẻ kho & Báo cáo Xuất - Nhập - Tồn
│   └── warrantyDAO.js           # Thẻ bảo hành, tra cứu serial/SĐT & nhật ký bảo trì
├── services/                    # Lớp xử lý nghiệp vụ chuyên sâu & quy trình khép kín
│   ├── departmentService.js
│   ├── materialService.js
│   ├── orderService.js
│   ├── payrollService.js
│   ├── productService.js
│   ├── productionService.js
│   └── telegramBotService.js    # Gửi tin nhắn, báo cáo sáng & nút bấm duyệt 1-click
├── routes/v1/                   # Router Express phiên bản v1
│   ├── index.js                 # Mount toàn bộ các route tiêu chuẩn & alias
│   ├── approvals.route.js
│   ├── bot.route.js             # Telegram bot status, config, test, morning-briefing
│   ├── cashbook.route.js        # (Alias: so-quy.route.js)
│   ├── contract.route.js        # Hợp đồng B2B & thanh toán đợt
│   ├── financial.route.js       # P&L, aging debt, cashflow forecast, bank reconcile
│   ├── material.route.js        # (Alias: nguyen-lieu.route.js)
│   ├── order.route.js           # (Alias: don-hang.route.js, validate-coupon)
│   ├── partner.route.js         # (Alias: doi-tac.route.js)
│   ├── payroll.route.js         # (Alias: luong.route.js)
│   ├── product.route.js         # (Alias: san-pham.route.js)
│   ├── production.route.js      # Lệnh sản xuất, kanban, scrap report
│   ├── quotation.route.js       # (Alias: bao-gia.route.js)
│   ├── return-order.route.js    # (Alias: doi-tra.route.js)
│   ├── shipping.route.js        # (Alias: van-chuyen.route.js)
│   ├── stock-adjustment.route.js # (Alias: dieu-chinh-kho.route.js)
│   ├── stock-ledger.route.js    # (Alias: the-kho.route.js)
│   └── warranty.route.js        # Thẻ bảo hành, tra cứu & nhật ký bảo trì
├── middleware/                  # JWT auth, RBAC 12 vai trò, asyncHandler, errorHandler
├── utils/                       # securityHelpers, permissions, payrollCalculator, auditDiff, planningEngine, aiAgentParser, automationConfig, cronScheduler
└── tests/                       # 12 file Unit & Integration Tests (63 test cases với node:test)
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
6. **Dự Báo Dòng Tiền 12 Tuần & Đối Soát Sao Kê Ngân Hàng**:
   - Truy vấn dự báo dòng tiền: `GET /api/v1/financial/cashflow-forecast?days=90`.
   - Đối soát tự động giao dịch sao kê ngân hàng: `POST /api/v1/financial/bank-reconcile`.
7. **Bảng Kanban Sản Xuất & Báo Cáo Tỷ Lệ Hao Hụt (Yield Rate)**:
   - Lấy bảng tiến độ 6 công đoạn: `GET /api/v1/production/kanban`.
   - Kéo chuyển công đoạn & ghi nhận hao hụt: `PUT /api/v1/production/:id/stage`.
   - Báo cáo phân tích phế phẩm & Yield Rate: `GET /api/v1/production/scrap-report`.
8. **Hợp Đồng Kinh Tế B2B $\to$ Tự Động Sinh Phiếu Thu Sổ Quỹ**:
   - Tạo hợp đồng kèm các đợt thanh toán (Milestones): `POST /api/v1/contracts`.
   - Thu tiền đợt `POST /api/v1/contracts/:id/pay-milestone` $\to$ Tự động sinh ngay Phiếu Thu trong Sổ Quỹ.
9. **Tự Động Hóa Telegram Bot & Báo Cáo Sáng (Morning Briefing)**:
   - Báo cáo sáng định kỳ: `POST /api/v1/bot/telegram/morning-briefing`.
   - Cảnh báo duyệt việc kèm nút bấm hành động `[✅ Duyệt]` / `[❌ Từ Chối]`.

---

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

## 🧪 Bộ Kịch Bản Kiểm Thử (Unit, Integration & E2E QA Suites)

Hệ thống sở hữu bộ **12 file Unit & Integration Test** (`63` test cases) chạy bằng `node --test` (không phụ thuộc DB ngoài) và trình kiểm thử **Deep QA E2E** bằng `gstack`:

```bash
# 1. Chạy toàn bộ 12 file Unit & Integration Test (63 test cases)
cd BackEndSME && npm test

# 2. Chạy riêng bộ test Kiểm kê Kho, Lô FEFO, Thẻ kho & Kiểm soát Chất lượng QC/RMA
npm run test:inventory-qc

# 3. Chạy kiểm thử toàn diện 7 Hành trình Người dùng & Bảo mật bằng gstack
npm run test:e2e
node scratch/gstack_deep_qa_tester.js --live
```

Danh sách các nhóm kiểm thử chính trong `BackEndSME/tests/`:
- `stockAdjustmentAndInventory.test.js`: Kiểm kê kho, chênh lệch thừa/thiếu, phê duyệt nguyên tử & cảnh báo tồn tối thiểu.
- `batchFefoAndStockLedger.test.js`: Thuật toán xuất kho **FEFO**, cảnh báo lô cận hạn & cân bằng **Thẻ kho**.
- `qcYieldAndRmaReturn.test.js`: Tỷ lệ đạt/phế phẩm QC (`> 5%`), hạn mức đổi trả RMA & phân loại nhập kho/phế phẩm/hoàn tiền Sổ quỹ.
- `portalAndWebhookSecurity.test.js`: Xác thực `/portal` 4 số cuối SĐT, Webhook Telegram/Zalo SSRF, `computeAuditDiff` & `escapeSafeRegexPattern`.
- `rbacPermissions.test.js`, `securityHelpers.test.js`, `enterpriseFeatures.test.js`, `orderAndPricing.test.js`, `productionAndKanban.test.js`, `financialAndCashflow.test.js`, `contractsAndWarranty.test.js`, `businessLogic.test.js`.
