# Hướng Dẫn Triển Khai Miễn Phí (PaaS Free Tier: Vercel + Koyeb + MongoDB Atlas)

Tài liệu này hướng dẫn chi tiết từng bước để đưa toàn bộ hệ thống **SME ERP** lên môi trường Production với **chi phí 0đ ($0/tháng)** và không cần nhập thẻ tín dụng (Credit Card).

---

## 🏛️ Kiến Trúc Hệ Thống Trên Cloud

```mermaid
flowchart LR
    Browser["🌐 Người Dùng (Trình duyệt / Điện thoại)"]

    subgraph Vercel["1. Vercel (Frontend - Miễn phí)"]
        FE["Next.js 16 (App Router)"]
        Rewrite["API Rewrites (/api/v1/*)"]
        FE --> Rewrite
    end

    subgraph Koyeb["2. Koyeb (Backend API - Miễn phí Nano)"]
        BE["Node.js Express 5 + Socket.io"]
    end

    subgraph Atlas["3. MongoDB Atlas (Database - Miễn phí M0)"]
        DB[(MongoDB 7 - Cluster M0)]
    end

    Browser -->|HTTPS| FE
    Rewrite -->|HTTPS Server-to-Server| BE
    BE -->|TLS / mongodb+srv| DB
```

---

## BƯỚC 1: Khởi Tạo Cơ Sở Dữ Liệu Trên MongoDB Atlas (Database)

1. **Đăng ký tài khoản**: Truy cập [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) và đăng ký miễn phí.
2. **Tạo Cluster Miễn Phí (M0)**:
   - Chọn gói **M0 Free (Shared)**.
   - Cloud Provider: **AWS**.
   - Region: **Singapore (`ap-southeast-1`)** (để có độ trễ thấp nhất về Việt Nam).
   - Nhấn **Create Deployment**.
3. **Tạo Database User**:
   - Username: ví dụ `sme_admin`.
   - Password: Tạo mật khẩu an toàn (ví dụ: `SmePassword2026!`). Lưu lại mật khẩu này.
4. **Cấu hình Network Access (IP Whitelist)**:
   - Vào mục **Network Access** $\to$ **Add IP Address**.
   - Chọn **Allow Access from Anywhere** (`0.0.0.0/0`) để Koyeb có thể kết nối từ các IP động của cloud.
   - Nhấn **Confirm**.
5. **Lấy Connection String**:
   - Tại trang tổng quan Database, nhấn **Connect** $\to$ **Drivers** (Node.js).
   - Chuỗi kết nối có dạng:
     ```text
     mongodb+srv://sme_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Thay `<password>` bằng mật khẩu đã tạo ở trên.
6. **Nạp dữ liệu mẫu ban đầu (Seed Data)**:
   - Tại máy tính của bạn, mở terminal tại thư mục `BackEndSME`:
     ```bash
     cd BackEndSME
     MONGO_URI="mongodb+srv://sme_admin:SmePassword2026!@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority" SME_DB_NAME="SME_db_mongo" node seed.js
     ```
   - Script sẽ khởi tạo 11 tài khoản nhân sự, bảng giá, kho gỗ, đơn hàng và đối tác mẫu lên MongoDB Atlas trong 5 giây.

---

## BƯỚC 2: Triển Khai Backend API Lên Koyeb (Backend)

1. **Đăng ký tài khoản**: Truy cập [koyeb.com](https://www.koyeb.com) và đăng nhập bằng tài khoản GitHub chứa repository `kurousagi110/SME-PJ`.
2. **Tạo dịch vụ mới (Create Service)**:
   - Chọn **GitHub**.
   - Chọn repository: `kurousagi110/SME-PJ`.
   - Branch: `main`.
   - **Work Directory**: Điền `BackEndSME`.
3. **Cấu hình Build & Run**:
   - Builder: **Dockerfile** (Koyeb sẽ tự động đọc `BackEndSME/Dockerfile`).
   - Instance Type: **Nano (Free)**.
   - Regions: **Singapore (sin)** hoặc **Frankfurt (fra)**.
4. **Cấu hình Cổng (Port)**:
   - Expose Port: `5000` (Giao thức HTTP).
   - Route path: `/`.
5. **Cấu hình Biến Môi Trường (Environment Variables)**:
   Thêm các biến sau vào mục **Environment variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGO_URI`: `mongodb+srv://sme_admin:SmePassword2026!@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority` (chuỗi từ Bước 1)
   - `SME_DB_NAME`: `SME_db_mongo`
   - `JWT_SECRET`: `dGhpc19pc19hX3NlY3VyZV9qd3Rfc2VjcmV0X2Zvcl9zbWVfc3lzdGVtXzIwMjZfYXBwbGljYXRpb24=`
   - `JWT_REFRESH_SECRET`: `dGhpc19pc19hX3NlY3VyZV9qd3RfcmVmcmVzaF9zZWNyZXRfZm9yX3NtZV9zeXN0ZW1fMjAyNg==`
   - `ALLOWED_ORIGINS`: `https://*.vercel.app,http://localhost:3000`
6. **Deploy**:
   - Nhấn **Deploy**. Koyeb sẽ tự động build image và cấp cho bạn 1 domain miễn phí có HTTPS:
     ```text
     https://<ten-dich-vu>.koyeb.app
     ```
7. **Kiểm tra**:
   - Mở trình duyệt truy cập: `https://<ten-dich-vu>.koyeb.app/api/v1/health`
   - Nếu thấy `{"success": true, "status": "OK", "database": {"status": "Connected"}}` là Backend đã hoàn tất 100%!

---

## BƯỚC 3: Triển Khai Frontend Lên Vercel (Frontend)

1. **Đăng ký tài khoản**: Truy cập [vercel.com](https://www.vercel.com) và đăng nhập bằng GitHub.
2. **Import Dự án**:
   - Nhấn **Add New...** $\to$ **Project**.
   - Chọn repository `kurousagi110/SME-PJ`.
3. **Cấu hình Thư Mục Gốc (Root Directory)**:
   - Tại mục **Root Directory**, nhấn **Edit** và chọn thư mục `FrontEndSME`.
   - Framework Preset: Tự động nhận diện là **Next.js**.
4. **Cấu hình Biến Môi Trường (Environment Variables)**:
   Thêm 2 biến sau:
   - `API_INTERNAL_URL`: `https://<ten-dich-vu>.koyeb.app/api/v1` (URL Koyeb ở Bước 2)
   - `NEXT_PUBLIC_SOCKET_URL`: `https://<ten-dich-vu>.koyeb.app`
5. **Deploy**:
   - Nhấn **Deploy**. Vercel sẽ tự động build Next.js trong ~1-2 phút và cấp cho bạn domain:
     ```text
     https://sme-erp-xxxx.vercel.app
     ```
6. **Hoàn tất**:
   - Truy cập domain Vercel. Bạn có thể đăng nhập ngay với tài khoản:
     - **Tài khoản**: `admin`
     - **Mật khẩu**: `123456`

---

## ⚡ Cơ Chế Tự Động Hóa CI/CD Của Kiến Trúc Này (Zero Configuration)

Khi triển khai theo bộ ba này:
- Mỗi khi bạn commit và `git push origin main`:
  - **Vercel** tự động bắt sự kiện và deploy lại Frontend trong 1 phút.
  - **Koyeb** tự động bắt sự kiện và build lại Backend Dockerfile trong 2 phút.
- Bạn **không cần phải duy trì server VPS**, không lo Nginx sập hay hết dung lượng ổ cứng, hoàn toàn 100% tự động và miễn phí.
