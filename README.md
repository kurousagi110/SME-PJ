# SME Management System — ERP Doanh Nghiệp Vừa & Nhỏ

Hệ sinh thái phần mềm quản trị doanh nghiệp vừa và nhỏ (**SME ERP**) toàn diện, chuẩn hóa kiến trúc Full-stack hiện đại, chạy trọn gói và triển khai tự động trên **Docker**. Tích hợp đầy đủ các luồng nghiệp vụ khép kín (**Closed-Loop**): Bán hàng đa kênh & POS (Multi-cart, Ca thu ngân, Margin Guard, Khuyến mãi động & Loyalty), Báo giá B2B, Hợp đồng Milestone & Bảo hành, Đa kho & Điều chuyển kho nội bộ, Thẻ kho & Xuất - Nhập - Tồn (XNT), Sản xuất Kanban & BOM/MRP, Kế toán dòng tiền & Chốt sổ kỳ kế toán, Đổi trả hàng (RMA/QC), CRM 360° (RFM & Churn), Nhân sự ESS (Nghỉ phép/OT, Chấm công QR/GPS) & Bảng lương KPI/BHXH/Thuế TNCN, Trung tâm duyệt việc thống nhất (Unified Approval Hub) và Cấu hình hệ thống tập trung.

---

## 🌟 Điểm Nổi Bật Của Hệ Thống

- 🚀 **Kiến trúc Full-stack Hiện đại & Chuẩn Hóa**: Next.js 16 (App Router, Turbopack, Server Actions), Express 5 ESM, MongoDB 7 Native Aggregation, Nginx Reverse Proxy. Mã nguồn và API được chuẩn hóa 100% tiếng Anh đồng bộ, hỗ trợ backward compatibility cho các định danh legacy.
- ⚙️ **Cấu Hình Doanh Nghiệp & Hệ Thống Tập Trung (`/settings`)**: Quản trị động thông tin pháp nhân (in hóa đơn/phiếu), tài khoản nhận tiền **VietQR**, tham số tính lương KPI/BHXH/Thuế TNCN, quy tắc tích điểm **Loyalty**, giờ làm & tọa độ **GPS/QR chấm công** — khử hoàn toàn tham số hardcode.
- 🏷️ **Promotion Engine Động & Khách Hàng Thân Thiết (`/promotions`)**: CRUD chiến dịch mã ưu đãi linh hoạt (giảm `%` có mức trần, giảm tiền cố định, freeship, đơn tối thiểu, thời hạn, giới hạn lượt dùng, nhóm khách hàng; tự động seed sẵn `SME5`, `SME10`, `VIP50K`, `FREESHIP`). Tích điểm tự động khi mua hàng, đổi điểm trừ tiền trực tiếp tại POS, phân hạng thành viên (`Đồng / Bạc / Vàng / Bạch Kim`) và hiển thị điểm trên `/portal`.
- 🏪 **Quầy Thu Ngân POS Thế Hệ Mới (`/pos`)**: Hỗ trợ lưu tạm **Multi-Cart** (tối đa 5 hóa đơn), quản lý **Ca Thu Ngân (Mở ca – Kết ca – Kiểm quỹ chênh lệch – Lịch sử ca)**, gợi ý mua kèm thông minh (**Cross-sell**) & cảnh báo biên lợi nhuận (**Margin Guard**), VietQR, âm thanh quét mã vạch, áp mã khuyến mãi động & quy đổi điểm Loyalty.
- 🏢 **Quản Lý Đa Kho, Vị Trí Kệ (Bin) & Điều Chuyển Nội Bộ (`/warehouses`)**: Hỗ trợ nhiều kho vận hành (`KHO-TONG`, `KHO-XUONG`, `KHO-SHOWROOM`, `KHO-QC` và tạo kho chi nhánh mới), gán mã vị trí kệ (`bin_location`) & ngưỡng tồn tối thiểu riêng cho từng kho, cùng quy trình **Phiếu điều chuyển kho nội bộ** (`draft` $\to$ `in_transit` $\to$ `received` / `cancelled`) ghi nhận đồng bộ Thẻ kho và kiểm soát hao hụt vận chuyển.
- 🧑‍💼 **Cổng Nhân Sự Tự Phục Vụ ESS & Chấm Công QR/GPS (`/hr-requests`)**: Nhân viên tự gửi đơn nghỉ phép năm (tự động kiểm soát quỹ phép còn lại), đăng ký tăng ca **OT (150% / 200% / 300%)**, xin đi muộn/về sớm, công tác — đổ thẳng vào **Unified Approval Hub (`/approvals`)** để quản lý phê duyệt (có chống tự duyệt). Tích hợp **Chấm công QR động** xoay vòng ký HMAC-SHA256 chống chụp ảnh gửi hộ và **GPS Geofencing** (Haversine).
- 💵 **Bảng Lương KPI + OT + BHXH & Thuế TNCN Lũy Tiến (`/payroll`)**: Tự động tổng hợp chấm công, cộng **Hoa hồng KD**, **Lương khoán SX**, **Tiền tăng ca OT** từ đơn đã duyệt, tự động **miễn phạt đi muộn** cho buổi có đơn duyệt, tính **BHXH (8%) / BHYT (1.5%) / BHTN (1%)**, phần DN đóng (**21.5%**) có áp trần và **Thuế TNCN lũy tiến 7 bậc** chuẩn luật Việt Nam.
- 💰 **Tài Chính Thông Minh: P&L, Dự Báo Dòng Tiền 12 Tuần, What-If & Đối Soát Ngân Hàng (`/financial-reports`)**: Báo cáo P&L (COGS Moving Average), dự báo dòng tiền 12 tuần (Burn Rate, Runway Months), trình mô phỏng **What-If Simulator**, tự động đối soát sao kê ngân hàng với Sổ Quỹ SME và quản lý tuổi nợ (Aging Debt) + chặn nợ vượt hạn mức (`CREDIT_LIMIT_EXCEEDED`).
- 🏭 **Bảng Kanban Sản Xuất & Quản Lý Hao Hụt (`/product/orders`)**: Giám sát tiến độ xưởng trực quan qua 6 công đoạn (`raw_material_prep` $\to$ `machining` $\to$ `finishing` $\to$ `assembly_qc` $\to$ `completed`), hỗ trợ quét Barcode, bắn realtime Socket.io, báo cáo Yield Rate (%) / Scrap Rate (%), truy xuất lô **FEFO** (`/traceability`) và kiểm định đổi trả **RMA/QC** (`/returns`).
- 📑 **Hợp Đồng Kinh Tế B2B, Báo Giá & Bảo Hành (`/contracts`, `/quotations`)**: Báo giá B2B chuyển đổi 1-click thành Đơn bán; Hợp đồng thanh toán theo đợt (Milestone billing) 1-click sinh Phiếu Thu vào Sổ Quỹ; Thẻ bảo hành điện tử theo Serial/SĐT & nhật ký bảo dưỡng định kỳ.
- 🧠 **Agentic AI Copilot v2, Anomaly Detection & CRM RFM/Churn**: Trợ lý AI hội thoại đa lượt có lọc công cụ theo RBAC, OCR hóa đơn thông minh, cảnh báo bất thường (doanh thu giảm, phế phẩm QC tăng đột biến, chiết khấu bất thường, Z-score OPEX), phân khúc khách hàng **RFM** & dự đoán nguy cơ rời bỏ (**Churn Risk**).
- 🤖 **Tự Động Hóa Đa Kênh Telegram & Zalo + Auto-Reorder (`/automation`)**: Cron Scheduler chạy nền gửi Báo cáo sáng, Cảnh báo tồn kho thấp & lô cận hạn FEFO, Nhắc nợ/hợp đồng, Cảnh báo bất thường và tự động tạo **PO nháp tái đặt hàng (Auto-Reorder)** đưa vào hàng đợi duyệt.
- 🌐 **Cổng Khách Hàng Tự Phục Vụ (`/portal`) & VietQR**: Tra cứu công khai đơn hàng, tiến độ SX/giao nhận, điểm thưởng Loyalty, hợp đồng B2B kèm mã **VietQR** và bảo hành bằng Mã + 4 số cuối SĐT.
- 🔐 **Bảo Mật Doanh Nghiệp Đa Tầng & 2FA TOTP**: Phân quyền **RBAC 12 vai trò**, xác thực hai yếu tố **TOTP 2FA** (RFC 6238) kèm mã khôi phục dùng 1 lần, Nhật ký kiểm toán **Visual Diff (`Trước ↔ Sau`)**, xác thực Webhook fail-closed (`timingSafeEqualStrings`), chống SSRF, ReDoS và XSS.
- ⚡ **Trải Nghiệm Người Dùng Hiện Đại**: Tìm kiếm toàn cục **Omni-Search (`Ctrl + K`)**, chuyển đổi giao diện Sáng/Tối (Theme Toggle), duyệt hàng loạt & xem nhanh trên `/approvals`, PWA (`manifest.json`), quét Camera Barcode/QR, xuất Excel UTF-8 BOM và in ấn chuẩn kế toán.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Tầng | Công nghệ & Thư viện chính |
|---|---|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query v5 · TanStack Table v8 · Shadcn UI / Radix UI · Tabler Icons & Lucide · Recharts |
| **Backend** | Node.js 20 (ESM) · Express 5 · Socket.io 4 · JWT Auth (Refresh Token Rotation + Optional TOTP 2FA) · Winston Logger · Native MongoDB Aggregation |
| **Cơ sở dữ liệu** | MongoDB 7 (Compound Indexes, Aggregation Pipelines, Session Transactions, Automated `mongodump` Backup) |
| **Hạ tầng** | Docker Compose · Nginx Alpine (Reverse Proxy, Gzip, WebSocket Proxy, Strict Security Headers) |

---

## 📋 Cấu Trúc Phân Hệ Nghiệp Vụ (Modules)

### 1. 📊 Tổng Quan & Kế Hoạch
- **Bảng Điều Khiển (`/dashboard`)**: KPI tài chính tổng thể, biểu đồ Doanh thu vs Chi phí, so sánh tăng trưởng cùng kỳ (YoY) và cảnh báo bất thường.
- **Trình Ký & Phê Duyệt (`/approvals`)**: Hàng đợi tập trung duyệt Đơn mua vật tư (gồm PO tự động tái đặt hàng), Kiểm kê kho, Đơn bán hàng, Đổi trả RMA, **Đơn từ Nhân sự ESS (Nghỉ phép / OT)** và Chi lương tháng — hỗ trợ duyệt hàng loạt, xem trước nhanh và chặn tự duyệt.
- **Demand Planning & Kênh TMĐT (`/planning`)**: Dự báo nhu cầu v2 (lọc outlier Mega Sale, khoảng tin cậy), MRP bóc tách BOM, tồn kho an toàn động, ma trận ABC Pareto, ước tính ngày giao **ATP** theo lead-time thực tế, bảng điểm NCC và máy tính biên lợi nhuận sàn Shopee / TikTok Shop / Lazada.

### 2. 🛒 Kinh Doanh & Bán Hàng
- **Quầy Thu Ngân POS (`/pos`)**: Multi-cart 5 tab, **Quản lý Ca Thu Ngân (Mở ca / Kết ca / Kiểm quỹ)**, mã khuyến mãi động, tích & đổi điểm Loyalty, Cross-sell, Margin Guard, VietQR và in hóa đơn nhiệt tức thì.
- **Khuyến Mãi & Loyalty (`/promotions`)**: Quản lý chiến dịch mã giảm giá động (CRUD, bật/tắt, giới hạn lượt dùng, ngày hết hạn) và bảng xếp hạng điểm tích lũy thành viên.
- **Báo Giá B2B (`/quotations`)**: Lập báo giá chuyên nghiệp, tính VAT & chiết khấu, chuyển đổi 1-click Quote-to-Order.
- **Đơn Bán Hàng (`/sales`)**: Phân tầng giá B2B, áp dụng voucher từ Promotion Engine, chặn vượt hạn mức tín dụng, bàn giao 1-click sang sản xuất hoặc vận chuyển, in hóa đơn A4.
- **Phễu Cơ Hội Bán Hàng (`/crm-pipeline`)**: Bảng Kanban 6 giai đoạn (`lead` → `qualified` → `proposal` → `negotiation` → `won` / `lost`), dự báo doanh số có trọng số (`Weighted Forecast`), tỷ lệ chốt thắng, nhật ký chăm sóc khách hàng & nút **1-Click chuyển sang Báo giá B2B**.
- **Hợp Đồng & Bảo Hành (`/contracts`)**: Hợp đồng Milestone billing (1-click hoặc tự động gạch nợ qua Webhook ngân hàng SePay/Casso sinh Phiếu Thu Sổ Quỹ) và Thẻ bảo hành điện tử theo Serial/SĐT + nhật ký bảo trì.
- **Đổi & Trả Hàng RMA (`/returns`)**: Kiểm soát số lượng hoàn trả, nghiệm thu QC (`nhap_lai_kho` / `phe_pham` / `can_sua_chua`) và tự động sinh Phiếu Chi hoàn tiền.
- **Vận Chuyển (`/shipping`) & Đồng Bộ Sàn TMĐT (`/ecommerce-sync`)**: Adapter vận chuyển GHN/GHTK/Viettel Post + Webhook tự động cập nhật trạng thái & đối soát thu hộ COD về Sổ Quỹ; kết nối gian hàng Shopee / TikTok Shop / Lazada, ánh xạ SKU kèm tồn kho đệm (`buffer_stock`) chống bán âm kho, kéo đơn và quyết toán doanh thu sau phí sàn vào Sổ Quỹ.
- **Khách Hàng & NCC (`/partners` — CRM 360° + RFM/Churn)**, **In Mã Vạch (`/barcode`)**, và **Cổng Khách Hàng (`/portal`)**.

### 3. 📦 Kho & Sản Xuất
- **Đa Kho & Chuyển Kho Nội Bộ (`/warehouses`)**: Danh sách kho (`KHO-TONG`, `KHO-XUONG`, `KHO-SHOWROOM`, `KHO-QC`...), phân bổ tồn kho theo kho & **vị trí kệ (`bin_location`)**, lập/xuất/nhận/hủy **Phiếu điều chuyển kho nội bộ** có ghi nhận hao hụt.
- **Mua Hàng Nâng Cao PR / RFQ (`/procurement`)**: Quy trình Đề xuất mua hàng (**PR**, tích hợp duyệt tại `/approvals`) → Yêu cầu & Ma trận so sánh báo giá nhiều NCC (**RFQ**, tự động xếp hạng giá/tốc độ/công nợ) → **1-Click Chọn thầu tạo PO** → **Vendor Scorecard (`A/B/C/D`)** & công cụ **Đối soát 3 chiều (3-Way Matching: PO ↔ Nhập kho ↔ Hóa đơn NCC)**.
- **Thành Phẩm & Xưởng Sản Xuất (`/product/catalog`, `/product/orders`)**: BOM định mức, Lệnh sản xuất, Bảng **Kanban 6 công đoạn**, ghi nhận phế phẩm & báo cáo Yield/Scrap Rate.
- **Nguyên Vật Liệu (`/material/catalog`, `/material/orders`)**, **Tồn Kho Tổng Hợp (`/warehouse`)**, **Kiểm Kê Điều Chỉnh (`/stock-adjustments`)**, **Truy Xuất Lô FEFO (`/traceability`)**, và **Thẻ Kho & XNT (`/stock-ledger`)**.

### 4. 💰 Tài Chính & Nhân Sự
- **Báo Cáo Tài Chính P&L (`/financial-reports`)**: P&L chuẩn VAS (COGS Moving Average), Dự báo dòng tiền 12 tuần, Đối soát sao kê ngân hàng, What-If Simulator, Hiệu quả sinh lời sản phẩm, Tuổi nợ (Aging Debt).
- **Thuế GTGT (VAT) · Tài Sản Cố Định · Ngân Sách (`/fixed-assets`)**: Bảng kê Thuế GTGT đầu vào/đầu ra theo Tháng/Quý/Năm (xuất Excel chuẩn HTKK), Quản lý Tài sản cố định & chạy **Khấu hao đường thẳng hàng tháng** (chống trùng kỳ) + lịch bảo trì thiết bị, và **Dự toán Ngân sách theo phòng ban (Budget vs Actual)** cảnh báo ngưỡng 80% / vượt 100%.
- **Sổ Quỹ & Công Nợ (`/cashbook`)**: Phiếu Thu/Chi tự động (`PT-...` / `PC-...`), đối soát công nợ 2 chiều, Khóa sổ kỳ kế toán (`Period Closing`).
- **Bảng Lương KPI & Thuế (`/payroll`)**: Tự động tính lương cơ bản, Hoa hồng KD, Lương khoán SX, **Tiền tăng ca OT**, **Miễn phạt đi muộn** theo đơn duyệt, khấu trừ **BHXH/BHYT/BHTN & Thuế TNCN 7 bậc**, duyệt chi tự động sinh Phiếu Chi Sổ Quỹ và in phiếu lương A5.
- **Đơn Từ Nhân Sự ESS (`/hr-requests`)**: Tự tạo đơn nghỉ phép năm (kiểm tra quỹ phép), đăng ký tăng ca OT (`150%/200%/300%`), đi muộn/về sớm, công tác, kèm **Chấm công QR động & GPS Geofencing**.
- **Chấm Công (`/check-in`)**, **Hồ Sơ Nhân Sự (`/staff`)**, **Phòng Ban & Chức Vụ (`/department`)**, **Tài Khoản & Bảo Mật 2FA (`/account`)**.

### 5. ⚙️ Hệ Thống & Tiện Ích
- **Cấu Hình Hệ Thống (`/settings`)**: Cấu hình pháp nhân, tài khoản VietQR mặc định, tham số lương KPI/BHXH/TNCN, quy tắc tích điểm Loyalty, và tọa độ/thời gian xoay mã QR chấm công.
- **Tự Động Hóa & Bot (`/automation`)**, **Trợ Lý Agentic AI Copilot v2 & OCR**, **Nhập Excel (`/import`)**, **Nhật Ký Hệ Thống Visual Diff (`/audit-log`)**, và **Omni-Search (`Ctrl + K`)**.

---

## 🚀 Hướng Dẫn Khởi Động Nhanh

Hệ thống được đóng gói hoàn chỉnh bằng Docker. **Không cần cài đặt Node.js hay MongoDB trên máy host.**

```bash
# 1. Clone repository
git clone https://github.com/kurousagi110/SME-PJ.git
cd SME-PJ

# 2. Khởi động toàn bộ cụm dịch vụ qua Docker Compose
docker compose up -d

# 3. Kiểm tra trạng thái container (sme_nginx, sme_frontend, sme_api, sme_db, sme_backup)
docker compose ps
```

> **Lưu ý**: Lần đầu chạy, hệ thống tự động seed dữ liệu mẫu thực tế (đơn hàng, sổ quỹ, sản phẩm/vật tư, nhân sự, đối tác, 4 kho mặc định, 4 mã khuyến mãi mặc định và cấu hình hệ thống chuẩn).

---

## 🌐 Đường Dẫn Truy Cập Dịch Vụ

| Dịch vụ | URL | Chức năng |
|---|---|---|
| **Cổng Web Ứng Dụng** | [http://localhost](http://localhost) | Giao diện phần mềm ERP (qua Nginx port 80) |
| **Cổng Khách Hàng** | [http://localhost/portal](http://localhost/portal) | Tra cứu đơn hàng, hợp đồng VietQR, bảo hành & điểm Loyalty |
| **REST API Backend** | `http://localhost/api/v1` | Cổng API RESTful v1 |
| **Tài liệu API Swagger** | [http://localhost/api-docs](http://localhost/api-docs) | Tài liệu tra cứu & test API tương tác |
| **WebSocket Realtime** | `ws://localhost/socket.io/` | Kênh đẩy thông báo tức thời Socket.io |
| **Cơ sở dữ liệu MongoDB** | `localhost:27017` | Cổng kết nối MongoDB Compass / GUI |

---

## 🔑 Danh Sách Tài Khoản Đăng Nhập

Mật khẩu mặc định cho **tất cả tài khoản**: **`123456`**

| Tài khoản | Phòng ban | Chức vụ | Quyền hạn chính |
|---|---|---|---|
| **`admin`** | Ban Giám Đốc | Giám đốc | Toàn quyền quản trị, `/settings`, Audit Log, duyệt tất cả chứng từ, chốt sổ kỳ kế toán |
| **`truongkd`** | Phòng Kinh Doanh | Trưởng phòng | Đơn bán, báo giá B2B, quản lý khuyến mãi (`/promotions`), duyệt chiết khấu, CRM |
| **`sale`** | Phòng Kinh Doanh | Nhân viên | Lập báo giá, đơn bán, POS (Mở/Kết ca), gửi yêu cầu RMA, tạo đơn ESS |
| **`ketoantr`** | Phòng Kế Toán | Kế toán trưởng | Sổ quỹ, chốt sổ kỳ kế toán, tính & chi lương (BHXH/TNCN), báo cáo tài chính |
| **`ketoan`** | Phòng Kế Toán | Nhân viên kế toán | Lập phiếu thu/chi, theo dõi thanh toán, báo cáo tài chính |
| **`thukho`** | Phòng Kho | Thủ kho | Đa kho & duyệt điều chuyển kho (`/warehouses`), kiểm kê, thẻ kho XNT, duyệt đơn mua, QC RMA |
| **`nhanvienkho`** | Phòng Kho | Nhân viên kho | Quản lý vị trí kệ Bin, tạo phiếu chuyển kho/kiểm kê, quét mã vạch |
| **`nhansutr`** | Phòng Nhân Sự | Trưởng phòng | Quản lý hồ sơ nhân sự, duyệt đơn nghỉ phép/OT (ESS), phòng ban, lương |
| **`nhansu`** | Phòng Nhân Sự | Nhân viên nhân sự | Chấm công, sinh mã QR điểm danh, quản lý ca làm |
| **`truongxuong`** | Phòng Sản Xuất | Quản đốc xưởng | Kế hoạch sản xuất, BOM, Kanban xưởng, bàn giao thành phẩm |
| **`sanxuat`** | Phòng Sản Xuất | Công nhân | Xem lệnh sản xuất, cập nhật công đoạn, gửi đơn ESS & chấm công |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
SME/
├── docker-compose.yml          # Orchestration: nginx, frontend, api, db, backup
├── .env.example                # Mẫu biến môi trường
├── AGENTS.md                   # Quy chuẩn mã nguồn, Git flow & kiểm thử
├── nginx/default.conf          # Reverse proxy, WebSocket, CSP & Gzip
├── scripts/                    # mongo-backup.sh & restore.sh
├── BackEndSME/                 # RESTful API Backend (Node.js 20 ESM + Express 5)
│   ├── controllers/            # settings, promotion, posShift, hrRequest, warehouse, order, financial...
│   ├── models/                 # systemSettingsDAO, promotionDAO, posShiftDAO, hrRequestDAO, warehouseDAO...
│   ├── routes/v1/              # /settings, /promotions, /pos-shifts, /hr-requests, /warehouses, ...
│   ├── services/               # paymentService, einvoiceService, logisticsService, telegramBotService...
│   ├── utils/                  # promotionEngine, hrEssEngine, warehouseTransferEngine, payrollCalculator...
│   ├── tests/                  # 26 file Unit & Integration Tests (117 test cases với node:test)
│   └── API_DOCUMENTATION.md    # Tài liệu chi tiết toàn bộ REST API endpoints
└── FrontEndSME/                # Next.js 16 + React 19 + TypeScript + Tailwind v4
    └── src/
        ├── app/(modules)/      # settings, promotions, hr-requests, warehouses, crm-pipeline, procurement, fixed-assets, ecommerce-sync...
        ├── app/actions/        # Server Actions chuẩn hóa tiếng Anh (đầy đủ 40+ action modules)
        ├── components/         # app-sidebar, pos/pos-shift-bar, command-palette, ai-copilot-widget...
        └── lib/                # http, permissions, export, barcode, utils
```

---

## 🧪 Kiểm Thử & Quy Chuẩn Chất Lượng

```bash
# Chạy toàn bộ bộ test Backend (26 file test — 117 test cases, không cần DB ngoài)
npm run test:backend

# Chạy toàn bộ bộ kiểm thử (Backend Unit/Integration + Deep QA E2E)
npm test

# Chạy riêng nhóm test Kho, Lô FEFO & QC/RMA
npm run test:inventory-qc

# Chạy kiểm thử E2E & Kiến trúc
npm run test:e2e
```

**Husky Git Hooks tự động bảo vệ chất lượng trước mỗi commit / push:**
- `.husky/pre-commit`: Chặn commit lên `main`/`dev`, kiểm tra merge conflict, kiểm tra cú pháp toàn bộ file JS (`node --check`), kiểm tra bảo mật tĩnh `$regex`, và chạy toàn bộ **117 test cases** Backend.
- `.husky/commit-msg`: Bắt buộc chuẩn **Conventional Commits** (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`).
- `.husky/pre-push`: Chặn push trực tiếp lên `main`/`dev`, chạy full Backend tests + Deep QA.

---

## 💾 Sao Lưu & Khôi Phục Dữ Liệu (MongoDB Backup & Restore)

Hệ thống tích hợp sẵn service `sme_backup` trong [docker-compose.yml](docker-compose.yml) dùng `mongodump --archive --gzip`:
- **Lịch chạy tự động**: mặc định `0 2 * * *` (02:00 sáng hàng ngày, tùy chỉnh qua `BACKUP_CRON`).
- **Xoay vòng lưu trữ**: giữ bản sao lưu `14` ngày (`BACKUP_RETENTION_DAYS`) trong `./backups/`.

```bash
# Chạy sao lưu thủ công ngay lập tức
docker compose run --rm --entrypoint /bin/bash backup -c "/usr/local/bin/mongo-backup.sh --once"

# Khôi phục vào DB tạm để kiểm tra an toàn
./scripts/restore.sh backups/sme_backup_YYYYMMDD_HHMMSS.archive.gz --target-db=SME_restore_verify
```

---

## 🗺️ Trạng Thái Lộ Trình Mở Rộng (Expansion Roadmap — Hoàn Tất 6/6 Giai Đoạn)

| Giai đoạn | Phạm vi tính năng | Trạng thái |
|---|---|---|
| **Phase 1** | Cấu hình hệ thống (`/settings`), Promotion Engine & Loyalty (`/promotions`), Quản lý Ca Thu Ngân POS | ✅ Đã hoàn thành |
| **Phase 2** | Cổng Nhân sự ESS (Nghỉ phép / OT), Tích hợp Approval Hub, BHXH & Thuế TNCN 7 bậc, Chấm công QR/GPS | ✅ Đã hoàn thành |
| **Phase 3** | Quản lý Đa Kho, Vị trí kệ (`Bin Location`) & Điều chuyển kho nội bộ (`/warehouses`) | ✅ Đã hoàn thành |
| **Phase 4** | CRM Sales Pipeline (`/crm-pipeline`) & Mua hàng nâng cao PR → RFQ → Vendor Scorecard (`/procurement`) | ✅ Đã hoàn thành |
| **Phase 5** | Bảng kê Thuế GTGT (VAT), Tài sản cố định / Khấu hao & Dự toán Ngân sách (`/fixed-assets`) | ✅ Đã hoàn thành |
| **Phase 6** | Provider Adapters HĐĐT (MISA/VNPT/Viettel), Adapter GHN/GHTK & COD Webhook, Payment Webhook Hợp đồng, Đồng bộ Sàn TMĐT (`/ecommerce-sync`) | ✅ Đã hoàn thành |

---

## 📄 Bản Quyền & Giấy Phép

Dự án phát hành theo giấy phép mã nguồn mở **MIT License**.
