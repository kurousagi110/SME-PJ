# SME Backend API

Node.js ESM REST API cho hệ thống quản lý doanh nghiệp vừa và nhỏ (**SME ERP**). Toàn bộ mã nguồn, controllers, services, utils và model DAOs được chuẩn hóa tên tiếng Anh đồng bộ, hỗ trợ 100% tính tương thích ngược (backward compatibility) cho các endpoint và dữ liệu legacy.

---

## 🛠️ Tech Stack & Kiến Trúc

| Thành phần | Phiên bản / Thư viện | Mục đích & Chi tiết |
|---|---|---|
| **Runtime** | Node.js ≥ 20 (ES Modules) | Môi trường thực thi hiện đại với native `import/export` |
| **HTTP Framework** | Express v5 | RESTful routing, async error handling middleware |
| **Database** | MongoDB Native Driver v6 | Aggregation Pipelines tốc độ cao, Multi-document Transactions |
| **Authentication** | JWT (jsonwebtoken) v9 + bcrypt v6 + TOTP 2FA | Access/Refresh token xoay vòng bảo mật, hỗ trợ 2FA RFC 6238 & recovery codes |
| **Realtime Engine** | Socket.io v4 | Kênh phát thông báo theo phòng ban/vai trò, chuyển kho, duyệt đơn & @mentions |
| **Logging & Audit** | Winston v3 + Audit Logger (Visual Diff) | Ghi vết nghiệp vụ có cấu trúc kèm so sánh `Trước ↔ Sau` & mức độ nghiêm trọng |
| **Tài liệu API** | Swagger UI v5 + `API_DOCUMENTATION.md` | Giao diện tài liệu tương tác tại `/api-docs` |
| **Bảo mật** | Helmet, CORS, Rate Limit, `securityHelpers` | Fail-closed webhook (`timingSafeEqualStrings`), chống SSRF, ReDoS & XSS |

---

## 🏗️ Cấu Trúc Mã Nguồn (Standard English Layering)

```
BackEndSME/
├── index.js                         # Bootstrap ứng dụng, inject MongoDB vào tất cả DAOs, khởi chạy server & cron
├── server.js                        # Cấu hình Express app, middleware chuỗi, mount router v1
├── seed.js                          # Kịch bản khởi tạo dữ liệu mẫu thực tế
├── controllers/                     # Lớp tiếp nhận HTTP Request & trả Response
│   ├── aiCopilotController.js       # Trợ lý Agentic AI Copilot v2 (multi-turn, RBAC tools, OCR)
│   ├── approvalController.js        # Trung tâm duyệt việc tập trung (PO, DCK, Sale, RMA, HR ESS, Payroll)
│   ├── auditLogController.js        # Nhật ký kiểm toán hệ thống & Visual Diff
│   ├── batchController.js           # Quản lý lô sản xuất (lo_san_xuat) & gợi ý xuất kho FEFO
│   ├── cashbookController.js        # Sổ quỹ, dòng tiền & khóa sổ kỳ kế toán
│   ├── contractController.js        # Quản lý hợp đồng B2B & thanh toán đợt (Milestones)
│   ├── dashboardController.js       # Báo cáo tổng quan KPI, tăng trưởng YoY & Anomaly Detection
│   ├── departmentPositionController.js # Sơ đồ tổ chức, phòng ban & chức vụ
│   ├── financialController.js       # P&L, COGS, Tuổi nợ, Cashflow 12 tuần, Đối soát sao kê & What-If
│   ├── hrRequestController.js       # [Mới] Đơn từ nhân sự ESS (Nghỉ phép/OT) & Chấm công QR/GPS
│   ├── importController.js          # Nhập dữ liệu hàng loạt từ Excel
│   ├── materialController.js        # Quản lý kho nguyên vật liệu
│   ├── orderController.js           # Đơn bán, POS (tích/đổi điểm, ca POS), Promotion động & bàn giao
│   ├── partnerController.js         # Mini CRM 360°, RFM & dự đoán Churn
│   ├── paymentController.js         # VietQR & Webhook gạch nợ tự động SePay/Casso (idempotent)
│   ├── payrollController.js         # Bảng lương KPI + OT + BHXH/TNCN & chấm công
│   ├── planningController.js        # Dự báo nhu cầu v2, MRP, ABC Pareto, TMĐT, ATP & Supplier Scorecard
│   ├── portalController.js          # Cổng tra cứu khách hàng công khai /portal (+ VietQR + Loyalty)
│   ├── posShiftController.js        # [Mới] Quản lý Ca Thu Ngân POS (Mở ca / Kết ca / Kiểm quỹ)
│   ├── productController.js         # Danh mục sản phẩm & định mức BOM
│   ├── productionController.js      # Lệnh SX, Kanban 6 công đoạn, hao hụt & Yield Rate
│   ├── promotionController.js       # [Mới] Chiến dịch Khuyến mãi động & Sổ điểm Loyalty
│   ├── quotationController.js       # Báo giá B2B & chuyển đổi Quote-to-Order
│   ├── returnOrderController.js     # Quy trình đổi trả hàng RMA & kiểm định QC
│   ├── searchController.js          # Omni-Search toàn hệ thống (RBAC scoped)
│   ├── settingsController.js        # [Mới] Cấu hình doanh nghiệp & tham số nghiệp vụ tập trung
│   ├── shippingController.js        # Vận đơn logistics, theo dõi trạng thái & COD
│   ├── stockAdjustmentController.js # Phiếu kiểm kê cân bằng kho
│   ├── stockLedgerController.js     # Thẻ kho chi tiết & Báo cáo tổng hợp XNT
│   ├── telegramBotController.js     # Tự động hóa Telegram / Zalo & Báo cáo sáng
│   ├── userController.js            # Xác thực, 2FA TOTP, hồ sơ cá nhân & phân quyền
│   ├── warehouseController.js       # [Mới] Đa kho, vị trí kệ Bin & Điều chuyển kho nội bộ
│   └── warrantyController.js        # Thẻ bảo hành điện tử, tra cứu SĐT & lịch sử bảo trì
├── models/                          # Data Access Objects (MongoDB Native Collections)
│   ├── crmPipelineDAO.js            # [Phase 4] Collection `crm_opportunities`
│   ├── procurementDAO.js            # [Phase 4] Collections `purchase_requests` & `rfqs`
│   ├── fixedAssetDAO.js             # [Phase 5] Collections `fixed_assets`, `depreciation_logs`, `department_budgets`
│   ├── ecommerceSyncDAO.js          # [Phase 6] Collections `ecommerce_channels`, `ecommerce_sku_mappings`, `ecommerce_sync_logs`
│   ├── systemSettingsDAO.js         # [Phase 1] Collection `company_settings` (cache 30s)
│   ├── promotionDAO.js              # [Phase 1] Collections `promotions` & `loyalty_ledger`
│   ├── posShiftDAO.js               # [Phase 1] Collection `pos_shifts`
│   ├── hrRequestDAO.js              # [Phase 2] Collection `hr_requests`
│   ├── warehouseDAO.js              # [Phase 3] Collections `warehouses`, `warehouse_stocks`, `stock_transfers`
│   ├── cashbookDAO.js, contractDAO.js, financialReportDAO.js, orderDAO.js, partnerDAO.js,
│   │   payrollDAO.js, periodClosingDAO.js, productDAO.js, quotationDAO.js, returnOrderDAO.js,
│   │   shippingDAO.js, stockAdjustmentDAO.js, stockLedgerDAO.js, warrantyDAO.js, ...
├── services/                        # Nghiệp vụ chuyên sâu & dịch vụ tích hợp
│   ├── cogsService.js, einvoiceService.js, logisticsService.js, paymentService.js,
│   │   productionService.js, telegramBotService.js, botNotifierService.js, ...
├── routes/v1/                       # RESTful Express v1 Routers (+ aliases tương thích ngược)
│   ├── settings.route.js            # [Mới] /api/v1/settings
│   ├── promotion.route.js           # [Mới] /api/v1/promotions
│   ├── pos-shift.route.js           # [Mới] /api/v1/pos-shifts
│   ├── hr-request.route.js          # [Mới] /api/v1/hr-requests
│   ├── warehouse.route.js           # [Mới] /api/v1/warehouses
│   └── index.js                     # Mount toàn bộ 35+ endpoint groups chuẩn & legacy aliases
├── middleware/                      # verifyToken, verifyAdmin, verifyApprover, RBAC 12 vai trò, asyncHandler
├── utils/                           # Pure Business Engines (zero DB dependency, dễ unit test)
│   ├── promotionEngine.js           # [Mới] Quy tắc Voucher động, Loyalty earn/redeem/tier & POS Shift summary
│   ├── hrEssEngine.js               # [Mới] Thuế TNCN 7 bậc, BHXH/BHYT/BHTN, Nghỉ phép/OT, Haversine GPS & QR HMAC
│   ├── warehouseTransferEngine.js   # [Mới] State machine chuyển kho, kiểm tra tồn nguồn & tính hao hụt thực nhận
│   ├── payrollCalculator.js         # Tính lương KPI + OT + miễn phạt đi muộn + BHXH/TNCN
│   ├── anomalyEngine.js, bankReconcileEngine.js, crmIntelligence.js, salesRecommendationEngine.js,
│   │   planningEngine.js, reorderEngine.js, aiAgentParser.js, totp.js, securityHelpers.js, ...
└── tests/                           # 26 file Unit & Integration Tests (117 test cases với node:test)
```

---

## 🔄 Các Quy Trình Nghiệp Vụ Khép Kín (Closed-Loop Workflows)

1. **Cấu Hình Hệ Thống Động (`company_settings`)**: `GET/PUT /api/v1/settings` đồng bộ động cho VietQR, lương KPI/BHXH/TNCN, Loyalty, chấm công QR/GPS & cổng tích hợp.
2. **POS Bán Lẻ $\to$ Promotion Động $\to$ Tích/Đổi Điểm Loyalty $\to$ Ca Thu Ngân**: Mở ca, áp mã động, tích/đổi điểm, tự sinh Phiếu Thu & kết ca kiểm quỹ chênh lệch.
3. **Nhân Sự ESS $\to$ Unified Approval Hub $\to$ Bảng Lương BHXH/Thuế TNCN**: Nghỉ phép/OT/đi muộn duyệt trên `/approvals` $\to$ đồng bộ trực tiếp tính lương KPI + OT + BHXH/BHYT/BHTN & Thuế TNCN 7 bậc; chấm công QR xoay vòng HMAC & GPS Geofencing.
4. **Đa Kho & Điều Chuyển Kho Nội Bộ**: `draft` $\to$ `in_transit` $\to$ `received` / `cancelled`, ghi Thẻ kho & xử lý hao hụt thực nhận.
5. **CRM Sales Pipeline $\to$ Báo Giá B2B & Mua Hàng PR $\to$ RFQ $\to$ PO**: Chuyển cơ hội bán hàng 1-click sang `/quotations`; duyệt PR trên `/approvals` $\to$ chấm điểm báo giá nhiều NCC trong RFQ $\to$ 1-click sinh PO + đối soát 3 chiều & Vendor Scorecard.
6. **Thuế GTGT (VAT) · Khấu Hao TSCĐ · Dự Toán Ngân Sách**: Bảng kê VAT đầu ra/đầu vào, trích khấu hao kỳ idempotent theo `YYYY-MM`, và đối chiếu Budget vs Actual theo phòng ban.
7. **Tích Hợp Production-Ready & Omnichannel TMĐT**: Provider Adapters cho HĐĐT (MISA/VNPT/Viettel), Adapter vận chuyển GHN/GHTK + Webhook đối soát COD (`POST /api/v1/shipping/webhook`), Webhook SePay/Casso gạch nợ cả Đơn bán (`DH-...`) & Hợp đồng B2B (`HD-...`), cùng đồng bộ tồn kho đệm & quyết toán tiền sàn Shopee/TikTok/Lazada vào Sổ Quỹ.

---

## 🚀 Hướng Dẫn Vận Hành & Khởi Chạy

```bash
# 1. Chạy qua Docker Compose (từ thư mục gốc)
docker compose up -d

# 2. Cập nhật mã nguồn nóng vào container (không cần rebuild)
docker cp BackEndSME/. sme_api:/app/ && docker restart sme_api

# 3. Chạy cục bộ (Local Development, yêu cầu Node.js >= 20 & MongoDB)
cd BackEndSME && npm install && npm run dev
```

---

## 🧪 Bộ Kịch Bản Kiểm Thử (26 Suites · 117 Test Cases)

```bash
# Chạy toàn bộ 26 file Unit & Integration Test (117 test cases, chạy nhanh không cần DB ngoài)
cd BackEndSME && npm test

# Chạy riêng bộ test Kho, Lô FEFO & QC/RMA
npm run test:inventory-qc

# Chạy kiểm thử E2E & Deep QA
npm run test:e2e
```

Các file kiểm thử cho 6 giai đoạn mở rộng trong `BackEndSME/tests/`:
- `settingsPromotionPosShift.test.js` (Phase 1): Promotion rules, Loyalty earn/redeem/tiers & POS Shift reconciliation.
- `hrEssTaxAndAttendance.test.js` (Phase 2): Thuế TNCN 7 bậc, BHXH áp trần, nghỉ phép/OT, lương tổng hợp, GPS Haversine & QR HMAC.
- `multiWarehouseAndTransfer.test.js` (Phase 3): Đa kho mặc định, state machine chuyển kho & hao hụt thực nhận.
- `crmPipelineAndProcurement.test.js` (Phase 4): CRM weighted forecast/win-rate, xếp hạng RFQ, 3-Way Match & Vendor Scorecard.
- `vatFixedAssetsAndBudget.test.js` (Phase 5): Thuế GTGT payable/credit, khấu hao đường thẳng idempotent & Budget vs Actual alerts.
- `integrationsAndOmnichannel.test.js` (Phase 6): Provider Adapters HĐĐT MISA/Viettel, Logistics GHN status/payload, chống oversell buffer stock & quyết toán tiền sàn TMĐT.
