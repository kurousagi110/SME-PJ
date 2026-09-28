# SME Frontend — Modern Next.js ERP UI

Giao diện người dùng hiện đại, tinh gọn và tối ưu hóa cao cho hệ thống quản trị doanh nghiệp **SME ERP** — xây dựng trên nền tảng **Next.js 16 (App Router)**, **React 19**, **TypeScript** và **Tailwind CSS v4**.

---

## 🛠️ Tech Stack & Thư Viện Chính

| Lớp | Thư viện & Công nghệ | Mô tả & Vai trò |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server-Side Rendering (SSR), Server Actions, Turbopack |
| **Giao diện & UI** | React 19 + TypeScript | Kiểu dữ liệu chặt chẽ, hiệu năng rendering cao |
| **Thiết kế & Styling** | Tailwind CSS v4 + Shadcn/UI | Thiết kế nhất quán, responsive và tối ưu kích thước bundle |
| **Server State Management** | TanStack Query v5 | Quản lý cache dữ liệu, optimistic updates và auto refetch |
| **Bảng Dữ Liệu** | TanStack Table v8 | Server-side pagination, sorting, search filter đa tiêu chí |
| **Biểu Đồ Thống Kê** | Recharts v2 | Biểu đồ vùng, biểu đồ cột tương tác, so sánh cùng kỳ (YoY) |
| **Biểu Tượng (Icons)** | Lucide React + Tabler Icons | Hệ thống icon phong phú, chuẩn hóa UI |
| **Thông Báo & Realtime** | Sonner + Socket.io Client | Toast thông báo trạng thái & kênh thông báo realtime |
| **In Ấn & Xuất Dữ Liệu** | HTML5 Print API + CSV UTF-8 BOM | In Hóa đơn A4/A5, Phiếu Thu/Chi, Phiếu Lương, Vận Đơn A6 |

---

## 🏗️ Cấu Trúc Thư Mục Chuẩn Hóa

```
FrontEndSME/src/
├── app/
│   ├── (auth)/                 # Màn hình đăng nhập & bảo vệ phiên làm việc
│   ├── (modules)/              # Các phân hệ nghiệp vụ ERP:
│   │   ├── dashboard/          # Bảng điều khiển KPI & so sánh cùng kỳ YoY
│   │   ├── quotations/         # Báo giá B2B & Chuyển đổi Đơn hàng (Quote-to-Order)
│   │   ├── sales/              # Đơn bán hàng, xuất hóa đơn & bàn giao 1-click
│   │   ├── pos/                # Quầy bán lẻ thu ngân cảm ứng, in hóa đơn nhiệt
│   │   ├── rma/                # Đổi trả hàng, bảo hành & kiểm định QC
│   │   ├── stock-ledger/       # Thẻ kho chi tiết & Báo cáo Xuất - Nhập - Tồn (XNT)
│   │   ├── stock-adjustments/  # Phiếu kiểm kê điều chỉnh cân bằng kho
│   │   ├── product/            # Danh mục sản phẩm, cấu hình định mức BOM, lệnh SX
│   │   ├── material/           # Danh mục vật tư, đơn mua hàng nhập kho
│   │   ├── cashbook/           # Sổ quỹ Thu - Chi, quản lý công nợ & Chốt sổ kỳ kế toán
│   │   ├── approvals/          # Trung tâm phê duyệt việc thống nhất (Unified Approval Hub)
│   │   ├── partners/           # Mini CRM quản lý khách hàng & nhà cung cấp 360°
│   │   ├── shipping/           # Vận đơn logistics, theo dõi trạng thái & COD
│   │   ├── payroll/            # Bảng lương nhân viên & chi trả lương khép kín
│   │   ├── check-in/           # Chấm công ca làm & theo dõi giờ làm việc
│   │   ├── staff/              # Hồ sơ nhân sự & hợp đồng lao động
│   │   ├── department/         # Sơ đồ cơ cấu tổ chức phòng ban & chức vụ
│   │   ├── planning/           # Dự báo nhu cầu, MRP, ma trận ABC, máy tính TMĐT
│   │   ├── barcode/            # Trình tạo & in mã vạch hàng hóa
│   │   ├── import/             # Nhập dữ liệu hàng loạt từ file Excel
│   │   └── audit-log/          # Nhật ký kiểm toán thao tác hệ thống (Admin)
│   └── actions/                # Next.js Server Actions (Standard English Naming):
│       ├── dashboard.ts        # Lấy số liệu KPI, biểu đồ & YoY compare
│       ├── quotation.ts        # Nghiệp vụ báo giá B2B & convert-to-order
│       ├── stock-ledger.ts     # Thẻ kho chi tiết & Báo cáo tổng hợp XNT
│       ├── stock-adjustment.ts # Phiếu kiểm kê điều chỉnh kho
│       ├── cashbook.ts         # Sổ quỹ, công nợ & khóa sổ kỳ kế toán
│       ├── approval.ts         # Danh sách chờ duyệt & hành động phê duyệt
│       ├── partner.ts          # Thao tác đối tác CRM
│       ├── product.ts          # Thao tác sản phẩm & danh mục BOM
│       ├── material.ts         # Thao tác nguyên vật liệu & đơn mua
│       ├── order-sale.ts       # Đơn bán hàng & chiết khấu
│       ├── handover.ts         # Bàn giao liên ban bộ 1-click & comments
│       ├── rma.ts              # Quản lý đổi trả hàng & nghiệm thu QC
│       ├── shipping.ts         # Vận chuyển logistics & cập nhật trạng thái
│       └── payroll.ts          # Tính lương, chi trả & trạng thái lương
├── components/                 # Các UI Components tái sử dụng:
│   ├── app-sidebar.tsx         # Thanh điều hướng phân tầng 5 khối nghiệp vụ
│   ├── command-palette.tsx     # Hộp lệnh nhanh Ctrl + K
│   ├── notifications.tsx       # Chuông thông báo realtime & badge chưa đọc
│   ├── ai-copilot-widget.tsx   # Trợ lý AI SME Copilot toàn cục
│   └── ui/                     # Bộ component Shadcn UI (Button, Dialog, Table...)
├── hooks/                      # Custom React Hooks & TanStack Query Hooks:
│   ├── use-product-bom.ts      # Hook lấy danh sách sản phẩm kèm cấu hình BOM
│   ├── use-stock-adjustment.ts # Hook quản lý phiếu điều chỉnh kho
│   ├── use-product.ts          # Hook quản lý sản phẩm & tồn kho thành phẩm
│   ├── use-material.ts         # Hook quản lý vật tư & tồn kho NVL
│   ├── use-order-sale.ts       # Hook quản lý đơn hàng bán
│   ├── use-account.ts          # Hook hồ sơ người dùng & phân quyền
│   └── useSocket.tsx           # Hook kết nối Socket.io realtime
└── lib/                        # Thư viện tiện ích:
    ├── http.ts                 # HTTP client cấu hình token an toàn
    ├── utils.ts                # Định dạng tiền tệ VNĐ, ngày tháng tiếng Việt
    ├── export.ts               # Xuất file CSV UTF-8 BOM chuẩn Excel tiếng Việt
    └── barcode.ts              # Tiện ích in ấn hóa đơn nhiệt, tem mã vạch & vận đơn
```

---

## 🔄 Kiến Trúc Luồng Dữ Liệu (Data Flow)

```
[React Client Component]
       │
       ▼ (gọi hook TanStack Query)
[Custom Hook: useProduct / useStockAdjustment / useProductBOM]
       │
       ▼ (gọi Server Action an toàn)
[Next.js Server Action: src/app/actions/*.ts]
       │
       ▼ (HTTP Request kèm JWT Token an toàn qua Nginx)
[Backend API: /api/v1/*]
```

- **An toàn bảo mật**: JWT token được đọc và gửi an toàn từ Server Action phía server, hạn chế tối đa nguy cơ lộ token trên client.
- **Tự động làm mới cache (Optimistic UI & Cache Invalidation)**: Sau khi thêm/sửa/xóa thành công qua mutation, TanStack Query tự động vô hiệu hóa cache tương ứng (`invalidateQueries`) để giao diện cập nhật ngay lập tức mà không cần reload trang.

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Chạy với Docker Compose (Khuyến nghị)
Frontend được đóng gói qua Multi-stage build và tự động phục vụ qua Nginx port 80:
```bash
docker compose up -d
```
Truy cập: **[http://localhost](http://localhost)**

### 2. Chạy môi trường Development trên máy host
Yêu cầu: Node.js ≥ 20 và Backend API đang hoạt động tại cổng 5000 (hoặc qua Docker port 80).
```bash
cd FrontEndSME
npm install
npm run dev
```
Truy cập: **http://localhost:3000**
File `.env.local` mẫu:
```env
NEXT_PUBLIC_API_URL=http://localhost/api/v1
```

---

## ⌨️ Phím Tắt & Thao Tác Nhanh

- **`Ctrl + K` (hoặc `Cmd + K`)**: Mở Command Palette để tìm kiếm trang, truy cập nhanh tính năng và mở hộp thoại tạo đơn hàng / phiếu thu / phiếu chi.
- **Huy hiệu thông báo (Realtime Badges)**: Tự động cập nhật số lượng thông báo chưa đọc và số lượng tồn kho chạm ngưỡng cảnh báo an toàn.
