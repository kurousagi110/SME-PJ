# SME Management System — ERP Doanh Nghiệp Vừa & Nhỏ

Hệ sinh thái phần mềm quản trị doanh nghiệp vừa và nhỏ (**SME ERP**) toàn diện, chuẩn hóa kiến trúc Full-stack hiện đại, chạy trọn gói và triển khai tự động trên **Docker**. Tích hợp đầy đủ các luồng nghiệp vụ khép kín (**Closed-Loop**): Bán hàng đa kênh & POS, Báo giá B2B, Thẻ kho & Báo cáo Xuất - Nhập - Tồn (XNT), Sản xuất & Định mức vật tư (BOM/MRP), Kế toán dòng tiền & Chốt sổ kỳ kế toán, Đổi trả hàng (RMA), Quản lý đối tác 360° (CRM), Bảng lương nhân sự, Trung tâm duyệt việc thống nhất (Unified Approval Hub) và Luồng bàn giao liên ban bộ 1-Click Handover.

---

## 🌟 Điểm Nổi Bật Của Hệ Thống

- 🚀 **Kiến trúc Full-stack Hiện đại & Chuẩn Hóa**: Next.js 16 (App Router, Turbopack, Server Actions), Express 5 ESM, MongoDB 7 Native Aggregation, Nginx Reverse Proxy. Hệ thống mã nguồn và API được chuẩn hóa 100% tiếng Anh đồng bộ, hỗ trợ backward compatibility cho các định danh legacy.
- 📋 **Báo Giá B2B & Chuyển Đổi Đơn Hàng 1-Click (Quote-to-Order)**: Lập báo giá chuyên nghiệp, tính thuế VAT & chiết khấu thương mại, theo dõi trạng thái vòng đời (`draft` $\to$ `sent` $\to$ `accepted` $\to$ `converted`) và tự động chuyển hóa thành Đơn Bán Hàng chỉ với 1 click.
- 📦 **Thẻ Kho & Báo Cáo Xuất - Nhập - Tồn (Stock Movement Ledger)**: Báo cáo biến động kho chi tiết từng mặt hàng và tổng hợp XNT theo khoảng thời gian thực tế, phân tách rõ ràng nguồn gốc chứng từ (Đơn bán, Đơn mua, Sản xuất, Bàn giao kho, Điều chỉnh kiểm kê, Đổi trả RMA).
- 🔄 **Luồng Nghiệp Vụ Khép Kín (Closed-Loop Integrity)**:
  - Bán lẻ tại quầy POS tự động sinh Phiếu Thu trong Sổ Quỹ.
  - Phê duyệt chi lương tự động sinh Phiếu Chi trong Sổ Quỹ.
  - Quy trình Đổi Trả Hàng (RMA): Trình duyệt $\to$ Kiểm định QC nghiệm thu $\to$ Nhập hoàn kho $\to$ Tự động sinh Phiếu Chi hoàn tiền.
  - Niêm phong & Khóa sổ kỳ kế toán (`Period Closing`): Chặn hoàn toàn hành vi ghi nhận, sửa đổi hoặc hủy chứng từ tài chính trong kỳ đã chốt sổ.
- 🤝 **Trung Tâm Phê Duyệt Thống Nhất & Bàn Giao 1-Click (Handover Hub)**:
  - *Unified Approval Hub (`/approvals`)*: Gom toàn bộ chứng từ chờ duyệt (Mua hàng, Điều chỉnh kho, Chiết khấu đơn bán, Bảng lương) về một nơi, ngăn chặn tự duyệt (anti self-approve).
  - *Inter-Department Handover*: Bàn giao mượt mà từ Kinh Doanh $\to$ Sản Xuất $\to$ Nhập Kho Thành Phẩm $\to$ Vận Đơn Logistics, tích hợp hệ thống Thảo luận & @Mention gửi thông báo realtime tức thì.
- 📊 **Demand Planning & Kênh TMĐT**: Dự báo nhu cầu bán hàng Moving Average, tính toán định mức MRP, phân tích ma trận ABC Pareto, máy tính khấu hao phí sàn Shopee, TikTok Shop, Lazada.
- 📈 **Báo Cáo Tăng Trưởng Cùng Kỳ (YoY Growth)**: Phân tích so sánh Doanh thu, Chi phí, Lợi nhuận gộp theo từng tháng giữa các năm.
- ⚡ **Điều Hướng Thông Minh & Command Palette (`Ctrl + K`)**: Toàn bộ tính năng phân tầng mạch lạc, phím tắt tìm kiếm và kích hoạt nhanh form tác vụ.
- 🔔 **Thông Báo Thời Gian Thực (Socket.io)**: Chuông thông báo realtime theo phòng ban/vai trò và huy hiệu cảnh báo kho an toàn trên Header.
- 🖨️ **Xuất Báo Cáo Excel (UTF-8 BOM) & In Ấn Chuẩn Kế Toán**: In Hóa đơn A4/A5, Phiếu Thu/Chi A5, Phiếu Lương A5, Vận Đơn Logistics A6/75x100mm, Tem Mã Vạch Barcode (Code 128 / QR).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Tầng | Công nghệ & Thư viện chính |
|---|---|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query v5 · Shadcn UI / Radix UI · Tabler Icons · Recharts |
| **Backend** | Node.js 20 (ESM) · Express 5 · Socket.io 4 · JWT Auth (Xoay vòng Refresh Token an toàn) · Winston Logger · Native MongoDB Aggregation |
| **Cơ sở dữ liệu** | MongoDB 7 (Compound Indexes, Aggregation Pipelines tối ưu hóa tốc độ cao, Session Transactions) |
| **Hạ tầng** | Docker Compose · Nginx Alpine (Reverse Proxy, Gzip Compression, WebSocket Proxy, Strict Security Headers) |

---

## 📋 Cấu Trúc Phân Hệ Nghiệp Vụ (Modules)

### 1. 📊 Tổng Quan & Kế Hoạch
- **Bảng Điều Khiển (`/dashboard`)**: KPI tài chính tổng thể, biểu đồ tương tác Doanh thu vs Chi phí (theo VNĐ hoặc số đơn), phân tích tăng trưởng cùng kỳ năm trước & năm nay (YoY).
- **Demand Planning & Kênh TMĐT (`/planning`)**:
  - *Dự báo nhu cầu bán hàng*: Dự báo lượng bán 30 ngày tới theo mô hình Moving Average & độ biến động.
  - *Kế hoạch đặt hàng MRP*: Bóc tách định mức BOM, tự động tính số lượng NVL cần mua dựa trên đơn hàng và tồn kho hiện tại.
  - *Phân tích ABC Pareto*: Phân loại sản phẩm Nhóm A (Doanh số cao 80%), B, C để tối ưu hóa vốn lưu động.
  - *Cảnh báo tồn kho an toàn*: Phát hiện mặt hàng sắp chạm ngưỡng tối thiểu để bổ sung kịp thời.
  - *Kế hoạch bán hàng TMĐT*: Máy tính khấu hao phí sàn Shopee, TikTok Shop, Lazada (phí cố định, thanh toán, freeship, hoa hồng affiliate, tỷ lệ hoàn đơn, chi phí đóng gói) $\to$ tính chuẩn xác biên lợi nhuận ròng và lập kế hoạch Mega Sale.

### 2. 🛒 Kinh Doanh & Bán Hàng
- **Quầy Thu Ngân POS (`/pos`)**: Giao diện bán hàng tại quầy cảm ứng, hỗ trợ máy quét mã vạch, thanh toán tiền mặt/chuyển khoản, tự động đồng bộ sinh phiếu thu sổ quỹ và in hóa đơn nhiệt tức thì.
- **Báo Giá B2B (`/quotations`)**: Lập và quản lý báo giá đối tác, tính thuế VAT & chiết khấu, theo dõi trạng thái gửi duyệt, và chuyển đổi 1-click thành Đơn Bán Hàng.
- **Đơn Bán Hàng (`/sales`)**: Lập và theo dõi đơn xuất bán, chọn nhanh đối tác từ CRM, xuất Excel UTF-8 BOM, in hóa đơn A4 chuẩn đẹp, bàn giao 1-click sang xưởng sản xuất hoặc giao nhận logistics.
- **Đổi Trả Hàng RMA (`/rma`)**: Quản lý yêu cầu bảo hành/đổi trả hàng, kiểm soát số lượng đổi trả so với đơn gốc, nghiệm thu QC và tự sinh phiếu chi hoàn tiền.
- **Vận Chuyển & Giao Hàng (`/shipping`)**: Quản lý vòng đời đơn giao hàng qua các đơn vị vận chuyển (GHN, GHTK, Viettel Post, J&T Express), theo dõi trạng thái, tiền thu hộ COD và **in phiếu vận đơn chuẩn logistics A6 / 75x100mm**.
- **Khách Hàng & Nhà Cung Cấp (`/partners`)**: Mini CRM quản lý đối tác 360°, phân loại khách VIP/khách buôn, tự động tổng hợp doanh số LTV, lịch sử mua hàng và công nợ 2 chiều.
- **In Mã Vạch (`/barcode`)**: Tạo và in tem nhãn mã vạch (Code 128 / QR) dán lên sản phẩm xuất xưởng.

### 3. 📦 Kho & Sản Xuất
- **Thẻ Kho & Báo Cáo XNT (`/stock-ledger`)**: Thẻ kho chi tiết theo từng sản phẩm/nguyên vật liệu và bảng cân đối Xuất - Nhập - Tồn theo kỳ với giá trị thành tiền chính xác.
- **Kho Thành Phẩm (`/product/catalog`, `/product/orders`)**: Danh mục sản phẩm, cấu hình định mức nguyên liệu (BOM) và tạo lệnh sản xuất.
- **Kho Nguyên Vật Liệu (`/material/catalog`, `/material/orders`)**: Danh mục vật tư (gỗ tấm, nẹp, ốc vít, bản lề, sơn...), đơn mua hàng nhập kho và đối soát nhà cung cấp.
- **Tồn Kho Tổng Hợp (`/warehouse`)**: Báo cáo tổng thể Nhập - Xuất - Tồn và giá trị tồn kho.
- **Kiểm Kê & Điều Chỉnh Kho (`/stock-adjustments`)**: Phiếu cân bằng tồn kho thực tế sau kiểm kê kèm quy trình duyệt an toàn chống trừ kho trùng lặp.

### 4. 💰 Tài Chính & Nhân Sự
- **Sổ Quỹ & Công Nợ (`/cashbook`)**: Quản lý dòng tiền Thu - Chi, quỹ tiền mặt và tài khoản ngân hàng, sinh mã tự động `PT-...` / `PC-...`, đối soát công nợ 2 chiều, in Phiếu Thu/Chi A5 chuẩn kế toán.
- **Khóa Sổ Kỳ Kế Toán (`/cashbook` tab Kỳ Kế Toán)**: Chốt sổ định kỳ (tháng/quý/năm), phong tỏa dữ liệu ngăn chặn sửa đổi chứng từ quá khứ để bảo vệ số liệu báo cáo tài chính.
- **Trung Tâm Duyệt Việc (`/approvals`)**: Hàng đợi phê duyệt tập trung cho Ban Giám Đốc và Quản lý cấp phòng ban.
- **Bảng Lương (`/payroll`)**: Tự động tổng hợp dữ liệu chấm công để tính lương toàn bộ nhân viên, phê duyệt chi lương khép kín tự sinh phiếu chi sổ quỹ, in phiếu lương A5 cá nhân và xuất Excel.
- **Bảng Chấm Công (`/check-in`)**: Theo dõi lịch sử vào/ra ca làm, tự động tính tổng giờ công và trừ thời gian đi muộn.
- **Hồ Sơ Nhân Sự (`/staff`)**: Quản lý danh sách nhân viên, mức lương cơ bản, chức danh và thông tin hợp đồng.
- **Phòng Ban & Chức Vụ (`/department`)**: Thiết lập sơ đồ cơ cấu tổ chức công ty.

### 5. ⚙️ Hệ Thống & Tiện Ích
- **Trợ Lý AI SME Copilot (Widget toàn cục)**: Chatbot trí tuệ nhân tạo hỏi đáp số liệu doanh nghiệp tức thời bằng tiếng Việt (Doanh thu, Tồn kho cảnh báo, Công nợ, TMĐT đa kênh).
- **Nhập Dữ Liệu Excel (`/import`)**: Nhập hàng loạt danh mục hàng hóa, nhân sự từ file Excel.
- **Nhật Ký Hệ Thống (`/audit-log`)**: Ghi nhận toàn bộ thao tác nghiệp vụ quan trọng phục vụ kiểm toán và truy vết bảo mật.
- **Hộp Lệnh Nhanh (`Ctrl + K`)**: Tìm kiếm tính năng và mở form thao tác tắt chỉ với vài phím gõ.

---

## 🚀 Hướng Dẫn Khởi Động Nhanh

Hệ thống được đóng gói hoàn chỉnh bằng Docker. **Không cần cài đặt Node.js hay MongoDB trên máy host.**

### 1. Yêu cầu chuẩn bị
- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) hoặc Docker Engine & Docker Compose v2 (Linux, macOS, Windows).

### 2. Khởi chạy hệ thống
```bash
# 1. Clone repository
git clone https://github.com/kurousagi110/SME-PJ.git
cd SME-PJ

# 2. Khởi động toàn bộ cụm dịch vụ qua Docker Compose
docker compose up -d
```

> **Lưu ý**: Lần đầu tiên chạy, Docker sẽ build image frontend/backend và tự động seed sẵn kho dữ liệu thực tế (260+ đơn hàng, 170+ phiếu thu chi, danh mục sản phẩm/vật tư, nhân viên, đối tác). Bạn chỉ cần chờ ~1–2 phút cho các container chuyển sang trạng thái `healthy`.

### 3. Kiểm tra trạng thái container
```bash
docker compose ps
```
Cả 4 container (`sme_nginx`, `sme_frontend`, `sme_api`, `sme_db`) đều ở trạng thái `Up (healthy)`.

---

## 🌐 Đường Dẫn Truy Cập Dịch Vụ

| Dịch vụ | URL | Chức năng |
|---|---|---|
| **Cổng Web Ứng Dụng** | [http://localhost](http://localhost) | Giao diện phần mềm ERP (truy cập qua Nginx port 80) |
| **REST API Backend** | `http://localhost/api/v1` | Cổng API backend cho hệ thống |
| **Tài liệu API Swagger** | [http://localhost/api-docs](http://localhost/api-docs) | Tài liệu tra cứu & test API tương tác |
| **WebSocket Realtime** | `ws://localhost/socket.io/` | Kênh đẩy thông báo tức thời Socket.io |
| **Cơ sở dữ liệu MongoDB** | `localhost:27017` | Cổng kết nối CSDL (dùng cho MongoDB Compass / GUI) |

---

## 🔑 Danh Sách Tài Khoản Đăng Nhập

Mật khẩu mặc định cho **tất cả tài khoản**: **`123456`**

| Tài khoản | Phòng ban | Chức vụ | Quyền hạn chính |
|---|---|---|---|
| **`admin`** | Ban Giám Đốc | Giám đốc | Toàn quyền quản trị hệ thống, xem Audit Log, duyệt lương, chốt sổ kỳ kế toán |
| **`truongkd`** | Phòng Kinh Doanh | Trưởng phòng | Quản lý đơn bán hàng, báo giá B2B, duyệt chiết khấu, xem báo cáo doanh thu, CRM |
| **`sale`** | Phòng Kinh Doanh | Nhân viên | Lập báo giá, lập đơn bán hàng, thao tác quầy thu ngân POS, gửi yêu cầu RMA |
| **`ketoantr`** | Phòng Kế Toán | Kế toán trưởng | Quản lý sổ quỹ, chốt sổ kỳ kế toán, tính & chi lương, đối soát công nợ |
| **`ketoan`** | Phòng Kế Toán | Nhân viên kế toán | Lập phiếu thu/chi, theo dõi phiếu thanh toán, xuất báo cáo tài chính |
| **`thukho`** | Phòng Kho | Thủ kho | Duyệt phiếu kiểm kê điều chỉnh kho, thẻ kho & XNT, duyệt đơn mua NVL, nghiệm thu QC |
| **`nhanvienkho`**| Phòng Kho | Nhân viên kho | Quét mã vạch, theo dõi tồn kho thành phẩm & NVL, tạo phiếu kiểm kê |
| **`nhansutr`** | Phòng Nhân Sự | Trưởng phòng | Quản lý hợp đồng, hồ sơ nhân sự, phòng ban |
| **`nhansu`** | Phòng Nhân Sự | Nhân viên nhân sự | Quản lý chấm công, ghi nhận ca làm việc |
| **`truongxuong`**| Phòng Sản Xuất | Quản đốc xưởng | Lập kế hoạch sản xuất, bóc tách định mức vật tư BOM, bàn giao thành phẩm |
| **`sanxuat`** | Phòng Sản Xuất | Công nhân | Xem danh mục sản phẩm, lệnh sản xuất và quy cách kỹ thuật |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
SME/
├── docker-compose.yml          # Cấu hình orchestration 4 containers (nginx, frontend, api, db)
├── .env.example                # Mẫu biến môi trường
├── nginx/
│   └── default.conf            # Reverse proxy, cân bằng tải, WebSocket, CSP & Gzip
├── BackEndSME/                 # RESTful API Backend (Node.js Express 5 ESM)
│   ├── controllers/            # Controller classes chuẩn hóa tiếng Anh (Order, Product, Cashbook, StockLedger...)
│   ├── models/                 # Model DAOs chuẩn hóa tiếng Anh (orderDAO, productDAO, cashbookDAO, stockLedgerDAO...)
│   ├── routes/v1/              # Endpoint RESTful API `/api/v1/*` (hỗ trợ cả route tiếng Anh & alias tiếng Việt)
│   ├── services/               # Logic nghiệp vụ nâng cao (MRP, Forecast, BOM, Production, Closed-Loop...)
│   ├── middleware/             # Xác thực JWT, phân quyền vai trò, validate Joi, rate limit
│   ├── utils/                  # Audit logger, Socket.io manager, Winston structured logs
│   ├── seed.js                 # Bộ kịch bản tạo dữ liệu thực tế mẫu
│   └── index.js                # Bootstrap Express server, DAO injection & kết nối MongoDB
└── FrontEndSME/                # Giao diện người dùng (Next.js 16 + React 19 + TypeScript)
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/         # Màn hình đăng nhập & bảo vệ phiên làm việc
    │   │   ├── (modules)/      # Các phân hệ: dashboard, sales, quotations, pos, stock-ledger, cashbook...
    │   │   └── actions/        # Server Actions gọi an toàn đến Backend API (dashboard, cashbook, product...)
    │   ├── components/         # UI Components: app-sidebar, nav-main, command-palette, alerts...
    │   ├── hooks/              # Custom hooks: useSocket, useAuth, useProductBOM, useStockAdjustment...
    │   └── lib/                # Tiện ích: format tiền tệ, xuất Excel UTF-8 BOM, in ấn hóa đơn/phiếu/barcode
    └── Dockerfile              # Quy trình đóng gói Multi-stage build tối ưu cho Next.js
```

---

## 🛠️ Các Lệnh Thao Tác Thường Dùng

```bash
# Khởi động dịch vụ ở chế độ chạy ngầm
docker compose up -d

# Xem logs thời gian thực của backend API
docker compose logs -f api

# Xem logs thời gian thực của frontend
docker compose logs -f frontend

# Cập nhật backend trực tiếp vào container đang chạy (không cần rebuild)
docker cp BackEndSME/. sme_api:/app/ && docker restart sme_api

# Build lại container sau khi chỉnh sửa frontend
docker compose build frontend
docker compose up -d frontend

# Chạy test suites xác minh toàn bộ luồng nghiệp vụ
node scratch/test_stock_ledger_and_quotations.js
node scratch/test_fixes_verification.js
node scratch/test_inter_department.js

# Tạm dừng hệ thống (giữ nguyên dữ liệu)
docker compose down

# Xóa bỏ hoàn toàn containers và reset database về trạng thái ban đầu
docker compose down -v
docker compose up -d
```

---

## 📄 Bản Quyền & Giấy Phép

Dự án được xây dựng và tối ưu hóa phục vụ quản lý doanh nghiệp vừa và nhỏ Việt Nam. Phát hành theo giấy phép mã nguồn mở MIT License.
