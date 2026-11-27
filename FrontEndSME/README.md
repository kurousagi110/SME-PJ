# SME Frontend — Modern Next.js ERP UI

Giao diện người dùng hiện đại, tinh gọn và tối ưu hóa cao cho hệ thống quản trị doanh nghiệp **SME ERP** — xây dựng trên nền tảng **Next.js 16 (App Router)**, **React 19**, **TypeScript** và **Tailwind CSS v4**.

---

## 🛠️ Tech Stack & Thư Viện Chính

| Lớp | Thư viện & Công nghệ | Mô tả & Vai trò |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server-Side Rendering (SSR), Server Actions, Turbopack |
| **Giao diện & UI** | React 19 + TypeScript | Kiểu dữ liệu chặt chẽ, tối ưu lazy-loading & bundle |
| **Thiết kế & Styling** | Tailwind CSS v4 + Shadcn/UI + `next-themes` | Giao diện Dark/Light Mode nhất quán, responsive |
| **Server State Management** | TanStack Query v5 | Cache thông minh, optimistic updates và auto refetch |
| **Bảng Dữ Liệu** | TanStack Table v8 | Pagination, sorting, lọc đa tiêu chí |
| **Biểu Đồ Thống Kê** | Recharts v2 | Biểu đồ doanh thu/chi phí, dự báo dòng tiền 12 tuần, YoY |
| **Biểu Tượng (Icons)** | Tabler Icons v3 + Lucide React | Bộ icon đồng bộ trên toàn bộ 5 khối nghiệp vụ |
| **Thông Báo & Realtime** | Sonner + Socket.io Client | Toast trạng thái, chuông thông báo realtime & âm thanh POS |
| **In Ấn & Xuất Dữ Liệu** | HTML5 Print API + CSV UTF-8 BOM | In Hóa đơn A4/A5/Nhiệt, Phiếu Thu/Chi, Phiếu Lương, Vận Đơn A6, Mã Vạch |

---

## 🏗️ Cấu Trúc Thư Mục Chuẩn Hóa

```
FrontEndSME/
├── public/
│   └── manifest.json               # Cấu hình PWA (Progressive Web App)
└── src/
    ├── app/
    │   ├── login/                  # Đăng nhập & xác thực TOTP 2FA + Recovery Code
    │   ├── portal/                 # Cổng Khách Hàng Tự Phục Vụ (/portal — VietQR, Bảo hành & Loyalty)
    │   ├── (modules)/              # Các phân hệ nghiệp vụ ERP:
    │   │   ├── account/            # Hồ sơ cá nhân & thiết lập bảo mật 2FA TOTP
    │   │   ├── approvals/          # Trung tâm phê duyệt việc thống nhất (PO, DCK, Sale, RMA, HR ESS, Lương)
    │   │   ├── audit-log/          # Nhật ký kiểm toán Visual Diff & xuất gói Audit Pack
    │   │   ├── automation/         # Cấu hình Cron Scheduler & Cảnh báo đa kênh (Telegram / Zalo)
    │   │   ├── barcode/            # Tạo & in tem nhãn mã vạch / QR
    │   │   ├── cashbook/           # Sổ quỹ Thu - Chi, công nợ & Khóa sổ kỳ kế toán
    │   │   ├── check-in/           # Bảng chấm công theo ngày/tháng
    │   │   ├── contracts/          # Hợp đồng kinh tế B2B, Milestone billing & Bảo hành điện tử
    │   │   ├── crm-pipeline/       # [Phase 4] Phễu cơ hội bán hàng Kanban, Forecast & 1-click sang Báo giá
    │   │   ├── dashboard/          # KPI tổng quan, so sánh YoY & cảnh báo bất thường
    │   │   ├── department/         # Cơ cấu tổ chức phòng ban & chức vụ
    │   │   ├── ecommerce-sync/     # [Phase 6] Đồng bộ tồn kho đệm, kéo đơn & quyết toán sàn Shopee/TikTok/Lazada
    │   │   ├── financial-reports/  # P&L, Tuổi nợ, Cashflow 12 tuần, Đối soát sao kê & What-If Simulator
    │   │   ├── fixed-assets/       # [Phase 5] Tài sản cố định & Khấu hao, Bảng kê Thuế GTGT (VAT) & Dự toán Ngân sách
    │   │   ├── hr-requests/        # [Phase 2] Cổng Nhân sự ESS (Nghỉ phép, OT, Đi muộn) & Chấm công QR/GPS
    │   │   ├── import/             # Nhập dữ liệu hàng loạt từ Excel
    │   │   ├── material/           # Danh mục vật tư & đơn mua hàng nhập kho
    │   │   ├── partners/           # Mini CRM 360°, phân khúc RFM & dự đoán Churn
    │   │   ├── payroll/            # Bảng lương KPI + OT + BHXH/BHYT/BHTN & Thuế TNCN 7 bậc
    │   │   ├── planning/           # Dự báo v2, MRP, ABC, ATP, Supplier Scorecard & Máy tính TMĐT
    │   │   ├── pos/                # Quầy POS Multi-cart, Ca Thu Ngân, Voucher động, Loyalty, Cross-sell & Margin Guard
    │   │   ├── procurement/        # [Phase 4] Mua hàng nâng cao PR → RFQ Matrix → Vendor Scorecard & 3-Way Match
    │   │   ├── product/            # Danh mục thành phẩm, BOM & Lệnh SX (kèm Kanban 6 công đoạn)
    │   │   ├── promotions/         # [Phase 1] Chiến dịch Khuyến mãi động & Hạng thành viên Loyalty
    │   │   ├── quotations/         # Báo giá B2B & chuyển đổi Quote-to-Order
    │   │   ├── returns/            # Đổi trả hàng RMA & kiểm định QC
    │   │   ├── sales/              # Đơn bán hàng B2B, bảng giá theo hạng & bàn giao 1-click
    │   │   ├── settings/           # [Phase 1+6] Cấu hình doanh nghiệp, VietQR, Lương/Thuế, Loyalty, Chấm công & Cổng Tích Hợp
    │   │   ├── shipping/           # Vận đơn logistics, theo dõi trạng thái & COD
    │   │   ├── staff/              # Hồ sơ nhân sự
    │   │   ├── stock-adjustments/  # Phiếu kiểm kê cân bằng kho (hỗ trợ Camera QR/Barcode)
    │   │   ├── stock-ledger/       # Thẻ kho chi tiết & Báo cáo Xuất - Nhập - Tồn
    │   │   ├── traceability/       # Truy xuất lô sản xuất & hạn dùng FEFO
    │   │   ├── warehouse/          # Tồn kho tổng hợp thành phẩm & nguyên vật liệu
    │   │   └── warehouses/         # [Phase 3] Quản lý Đa Kho, Vị trí kệ (Bin) & Điều chuyển kho nội bộ
    │   └── actions/                # Next.js Server Actions chuẩn hóa tiếng Anh:
    │       ├── settings.ts, promotions.ts, pos-shift.ts, hr-requests.ts, warehouses.ts,
    │       ├── crm-pipeline.ts, procurement.ts, accounting-expansion.ts, ecommerce-sync.ts,
    │       └── approval.ts, ai-copilot.ts, automation.ts, cashbook.ts, contract.ts,
    │           dashboard.ts, financial.ts, order-sale.ts, partner.ts, payroll.ts,
    │           planning.ts, portal.ts, pos.ts, production.ts, quotation.ts, rma.ts, ...
    ├── components/                 # Các UI Components tái sử dụng:
    │   ├── app-sidebar.tsx         # Điều hướng phân tầng 5 khối nghiệp vụ theo RBAC
    │   ├── pos/pos-shift-bar.tsx   # [Mới] Thanh quản lý Ca Thu Ngân POS (Mở/Kết ca/Kiểm quỹ/Lịch sử)
    │   ├── command-palette.tsx     # Omni-Search & hộp lệnh nhanh Ctrl + K
    │   ├── notifications.tsx       # Chuông thông báo realtime Socket.io
    │   ├── ai-copilot-widget.tsx   # Trợ lý Agentic AI Copilot v2 & OCR hóa đơn
    │   ├── camera-barcode-scanner.tsx # Quét mã vạch/QR trực tiếp qua Camera
    │   └── ui/                     # Bộ component Shadcn UI
    ├── hooks/                      # Custom React Hooks & TanStack Query Hooks
    └── lib/                        # http.ts, permissions.ts, export.ts, barcode.ts, audio-feedback.ts, utils.ts
```

---

## 🔄 Kiến Trúc Luồng Dữ Liệu (Data Flow)

```
[React Client Component]
       │
       ▼ (TanStack Query / React state)
[Next.js Server Action: src/app/actions/*.ts]
       │
       ▼ (HTTP Request kèm JWT HttpOnly Cookie qua src/lib/http.ts + auto refresh dedupe)
[Backend REST API: /api/v1/*]
```

- **An toàn bảo mật**: JWT access/refresh token được xử lý ở tầng Server Action (`http.ts`) có cơ chế chống gọi trùng refresh (`refreshInFlight` dedupe), không lộ token sang client JS.
- **Tối ưu hiệu năng**: Loại bỏ thư viện dư thừa, bật `optimizePackageImports` và lazy-load các thành phần biểu đồ/AI nặng.

---

## 🚀 Hướng Dẫn Khởi Chạy

```bash
# 1. Chạy trọn gói qua Docker Compose (Khuyến nghị)
docker compose up -d
# Truy cập: http://localhost

# 2. Chạy Development trên máy host (Node.js >= 20)
cd FrontEndSME
npm install
npm run dev
# Truy cập: http://localhost:3000
```

File `.env.local` mẫu khi chạy local:
```env
NEXT_PUBLIC_API_URL=http://localhost/api/v1
```

---

## ⌨️ Phím Tắt & Thao Tác Nhanh

- **`Ctrl + K` (hoặc `Cmd + K`)**: Mở **Omni-Search / Command Palette** tìm kiếm đơn hàng, sản phẩm, khách hàng, điều hướng trang và tạo nhanh chứng từ.
- **Phím tắt tại Quầy POS (`/pos`)**: **`F2`** focus ô quét mã vạch, **`F8`** mở VietQR chuyển khoản, **`F9`** thanh toán nhanh.
