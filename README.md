# SME Management System — ERP Doanh Nghiệp Vừa & Nhỏ

Hệ sinh thái phần mềm quản trị doanh nghiệp vừa và nhỏ (**SME ERP**) toàn diện, hiện đại, chạy trọn gói trên **Docker**. Tích hợp đầy đủ các nghiệp vụ từ Bán hàng đa kênh, Kho & Sản xuất (BOM/MRP), Kế toán dòng tiền, Mini CRM, Bảng lương nhân sự đến Báo cáo phân tích dữ liệu so sánh cùng kỳ (YoY).

---

## 🌟 Điểm Nổi Bật Của Hệ Thống

- 🚀 **Kiến trúc Full-stack Hiện đại**: Next.js 16 (App Router, Turbopack, Server Actions), Express 5 ESM, MongoDB 7, Nginx Reverse Proxy.
- 📊 **Demand Planning & Bán Hàng Đa Kênh TMĐT**: Dự báo nhu cầu bán hàng, tính toán định mức MRP, ma trận ABC Pareto, tích hợp khấu hao & chính sách sàn Shopee, TikTok Shop, Lazada.
- 📈 **Báo Cáo So Sánh Cùng Kỳ (YoY Growth)**: Phân tích tăng trưởng Doanh thu, Chi phí, Lợi nhuận gộp theo từng tháng giữa các năm.
- ⚡ **Điều Hướng Thông Minh & Command Palette (`Ctrl + K`)**: Toàn bộ tính năng được nhóm gọn gàng theo 5 khối nghiệp vụ, hỗ trợ phím tắt tìm kiếm tức thì.
- 🔔 **Thông Báo Thời Gian Thực (Socket.io)**: Chuông thông báo realtime theo phòng ban/vai trò và huy hiệu cảnh báo kho an toàn trên Header.
- 🖨️ **Xuất Báo Cáo Excel (UTF-8 BOM) & In Ấn Chuẩn Mực**: In Hóa đơn A4/A5, Phiếu Thu/Chi A5, Phiếu Lương A5, Tem Mã Vạch Barcode dán bao bì.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Tầng | Công nghệ & Thư viện chính |
|---|---|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query v5 · Shadcn UI / Radix UI · Tabler Icons · Recharts |
| **Backend** | Node.js 20 (ESM) · Express 5 · Socket.io 4 · JWT Auth (Xoay vòng Refresh Token an toàn) · Winston Logger · Joi Validation |
| **Cơ sở dữ liệu** | MongoDB 7 (Mongoose DAO, Aggregation Pipelines tối ưu tốc độ cao) |
| **Hạ tầng** | Docker Compose · Nginx Alpine (Reverse Proxy, Gzip, WebSocket, Strict Security Headers) |

---

## 📋 Cấu Trúc Phân Hệ Nghiệp Vụ (5 Khối Tính Năng)

Hệ thống được tổ chức phân tầng rõ ràng trên thanh Sidebar và Command Palette:

### 1. 📊 Tổng Quan & Kế Hoạch
- **Bảng Điều Khiển (`/dashboard`)**: KPI tài chính tổng thể, biểu đồ tương tác Doanh thu vs Chi phí (theo VNĐ hoặc số đơn), phân tích tăng trưởng cùng kỳ năm trước & năm nay (YoY).
- **Demand Planning & Kênh TMĐT (`/planning`)**:
  - *Dự báo nhu cầu bán hàng*: Dự báo lượng bán 30 ngày tới theo mô hình Moving Average & độ biến động.
  - *Kế hoạch đặt hàng MRP*: Bóc tách định mức BOM, tự động tính số lượng NVL cần mua dựa trên đơn hàng và tồn kho.
  - *Phân tích ABC Pareto*: Phân loại sản phẩm Nhóm A (Doanh số cao 80%), B, C để tối ưu hóa vốn lưu động.
  - *Cảnh báo tồn kho an toàn*: Phát hiện mặt hàng sắp cạn kho để bổ sung kịp thời.
  - *Kế hoạch bán hàng TMĐT*: Máy tính khấu hao phí sàn Shopee, TikTok Shop, Lazada (phí cố định, thanh toán, freeship, hoa hồng KOC affiliate, tỷ lệ hoàn đơn, chi phí đóng gói) $\to$ tính chuẩn xác biên lợi nhuận ròng và lập kế hoạch Mega Sale.

### 2. 🛒 Kinh Doanh & Bán Hàng
- **Quầy Thu Ngân POS (`/pos`)**: Giao diện bán hàng tại quầy cảm ứng, hỗ trợ máy quét mã vạch, thanh toán tiền mặt/chuyển khoản, in hóa đơn nhiệt tức thì.
- **Đơn Bán Hàng (`/sales`)**: Lập và theo dõi đơn xuất bán, chọn nhanh đối tác từ CRM, xuất Excel UTF-8 BOM, in hóa đơn A4 chuẩn đẹp.
- **Vận Chuyển & Giao Hàng (`/shipping`)**: Quản lý vòng đời đơn giao hàng qua các đối tác vận chuyển hàng đầu Việt Nam (GHN, GHTK, Viettel Post, J&T Express), theo dõi trạng thái, tiền thu hộ COD và **in phiếu vận đơn chuẩn logistics A6 / 75x100mm**.
- **Khách Hàng & Nhà Cung Cấp (`/partners`)**: Mini CRM quản lý đối tác 360°, phân loại khách VIP/khách buôn, tự động tổng hợp doanh số LTV, lịch sử mua hàng và công nợ.
- **In Mã Vạch (`/barcode`)**: Tạo và in tem nhãn mã vạch (Code 128 / QR) dán lên sản phẩm xuất xưởng.

### 3. 📦 Kho & Sản Xuất
- **Kho Thành Phẩm (`/product/catalog`, `/product/orders`)**: Danh mục sản phẩm, cấu hình định mức nguyên liệu (BOM) và tạo lệnh sản xuất.
- **Kho Nguyên Vật Liệu (`/material/catalog`, `/material/orders`)**: Danh mục vật tư (gỗ tấm, nẹp, ốc vít, bản lề, sơn...), đơn mua hàng nhập kho và đối soát nhà cung cấp.
- **Tồn Kho Tổng Hợp (`/warehouse`)**: Báo cáo tổng thể Nhập - Xuất - Tồn và giá trị tồn kho.
- **Kiểm Kê & Điều Chỉnh Kho (`/dieu-chinh-kho`)**: Phiếu cân bằng tồn kho thực tế sau kiểm kê kèm quy trình duyệt.

### 4. 💰 Tài Chính & Nhân Sự
- **Sổ Quỹ & Công Nợ (`/cashbook`)**: Quản lý dòng tiền Thu - Chi, quỹ tiền mặt và tài khoản ngân hàng, sinh mã tự động `PT-...` / `PC-...`, đối soát công nợ 2 chiều (khách nợ và nợ NCC), in Phiếu Thu/Chi A5 chuẩn kế toán.
- **Bảng Lương (`/payroll`)**: Tự động tổng hợp dữ liệu chấm công để tính lương toàn bộ nhân viên, hỗ trợ in phiếu lương A5 cá nhân và xuất bảng lương ra Excel.
- **Bảng Chấm Công (`/check-in`)**: Theo dõi lịch sử vào/ra ca làm, tự động tính tổng giờ công và trừ thời gian đi muộn.
- **Hồ Sơ Nhân Sự (`/staff`)**: Quản lý danh sách nhân viên, mức lương cơ bản, chức danh và thông tin hợp đồng.
- **Phòng Ban & Chức Vụ (`/department`)**: Thiết lập sơ đồ cơ cấu tổ chức công ty.

### 5. ⚙️ Hệ Thống & Tiện Ích
- **Trợ Lý AI SME Copilot (Widget toàn cục)**: Chatbot trí tuệ nhân tạo hỏi đáp số liệu doanh nghiệp tức thời bằng tiếng Việt (Doanh thu, Tồn kho cảnh báo, Công nợ, TMĐT đa kênh).
- **Nhập Dữ Liệu Excel (`/import`)**: Nhập hàng loạt danh mục hàng hóa, nhân sự từ file Excel.
- **Nhật Ký Hệ Thống (`/audit-log`)**: Ghi nhận toàn bộ thao tác nghiệp vụ quan trọng phục vụ kiểm toán và truy vết bảo mật (chỉ tài khoản Admin).
- **Hộp Lệnh Nhanh (`Ctrl + K`)**: Tìm kiếm tính năng và mở form thao tác tắt chỉ với vài phím gõ.

---

## 🚀 Hướng Dẫn Khởi Động Nhanh

Hệ thống được cấu hình sẵn môi trường Docker. **Không cần cài đặt Node.js, npm hay MongoDB trên máy host.**

### 1. Yêu cầu chuẩn bị
- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) (hỗ trợ Linux, macOS, Windows).

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
| **`admin`** | Ban Giám Đốc | Giám đốc | Toàn quyền quản trị hệ thống, xem Audit Log, phê duyệt |
| **`truongkd`** | Phòng Kinh Doanh | Trưởng phòng | Quản lý đơn bán hàng, xem báo cáo doanh thu, CRM |
| **`sale`** | Phòng Kinh Doanh | Nhân viên | Lập đơn bán hàng, thao tác quầy thu ngân POS |
| **`ketoantr`** | Phòng Kế Toán | Kế toán trưởng | Quản lý sổ quỹ, tính bảng lương, đối soát công nợ |
| **`ketoan`** | Phòng Kế Toán | Nhân viên kế toán | Lập phiếu thu/chi, theo dõi phiếu thanh toán |
| **`thukho`** | Phòng Kho | Thủ kho | Duyệt phiếu kiểm kê điều chỉnh kho, quản lý xuất/nhập |
| **`nhanvienkho`**| Phòng Kho | Nhân viên kho | Quét mã vạch, theo dõi tồn kho thành phẩm & NVL |
| **`nhansutr`** | Phòng Nhân Sự | Trưởng phòng | Quản lý hợp đồng, hồ sơ nhân sự, phòng ban |
| **`nhansu`** | Phòng Nhân Sự | Nhân viên nhân sự | Quản lý chấm công, ghi nhận ca làm việc |
| **`truongxuong`**| Phòng Sản Xuất | Quản đốc xưởng | Lập kế hoạch sản xuất, bóc tách định mức vật tư BOM |
| **`sanxuat`** | Phòng Sản Xuất | Công nhân | Xem danh mục sản phẩm và quy cách kỹ thuật |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
SME/
├── docker-compose.yml          # Cấu hình orchestration 4 containers (nginx, frontend, api, db)
├── .env.example                # Mẫu biến môi trường
├── nginx/
│   └── default.conf            # Reverse proxy, cân bằng tải, WebSocket, CSP & Gzip
├── BackEndSME/                 # RESTful API Backend (Node.js Express 5 ESM)
│   ├── controllers/            # Xử lý nghiệp vụ: Bán hàng, Kho, Kế toán, Lương, TMĐT...
│   ├── models/                 # Lớp DAO truy vấn MongoDB (Mongoose)
│   ├── routes/                 # Khai báo Endpoint RESTful API `/api/v1/*`
│   ├── services/               # Logic nghiệp vụ nâng cao (MRP, Thuật toán Forecast, BOM...)
│   ├── middleware/             # Xác thực JWT, phân quyền vai trò, validate Joi, rate limit
│   ├── utils/                  # Audit logger, Socket.io manager, Winston structured logs
│   ├── seed.js                 # Bộ kịch bản tạo dữ liệu thực tế mẫu
│   └── index.js                # Điểm khởi chạy máy chủ Express & kết nối MongoDB
└── FrontEndSME/                # Giao diện người dùng (Next.js 16 + React 19 + TypeScript)
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/         # Màn hình đăng nhập & bảo vệ phiên làm việc
    │   │   ├── (modules)/      # Các phân hệ: dashboard, sales, pos, planning, cashbook...
    │   │   └── actions/        # Server Actions gọi an toàn đến Backend API
    │   ├── components/         # UI Components: app-sidebar, nav-main, command-palette, alerts...
    │   ├── hooks/              # Custom hooks: useSocket, useAuth, TanStack Query hooks
    │   └── lib/                # Tiện ích: format tiền tệ, xuất Excel UTF-8 BOM, in ấn
    └── Dockerfile              # Quy trình đóng gói Multi-stage build tối ưu cho Next.js
```

---

## 🛠️ Các Lệnh Thao Tác Docker Thường Dùng

```bash
# Khởi động dịch vụ ở chế độ chạy ngầm
docker compose up -d

# Xem logs thời gian thực của backend
docker compose logs -f api

# Xem logs thời gian thực của frontend
docker compose logs -f frontend

# Build lại container sau khi chỉnh sửa mã nguồn
docker compose build frontend
docker compose up -d frontend

# Tạm dừng hệ thống (giữ nguyên dữ liệu)
docker compose down

# Xóa bỏ hoàn toàn containers và reset database về trạng thái ban đầu
docker compose down -v
docker compose up -d
```

---

## 📄 Bản Quyền & Giấy Phép

Dự án được xây dựng và tối ưu hóa phục vụ quản lý doanh nghiệp vừa và nhỏ Việt Nam. Phát hành theo giấy phép mã nguồn mở MIT License.
