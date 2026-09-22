/**
 * seed.js — SME Master Database Seed Script (Toàn diện & Nhất quán)
 *
 * Populates & Đồng bộ 100%:
 *   - phongban_chucvu: Phòng ban & Chức vụ
 *   - users: 11 tài khoản nhân sự chuẩn (mật khẩu mặc định: 123456)
 *   - nguyen_lieu: 10 nguyên vật liệu gỗ/nội thất chuẩn
 *   - san_pham: 10 sản phẩm thành phẩm nội thất chuẩn
 *   - bom_san_pham: 4 công thức định mức kỹ thuật sản xuất
 *   - doi_tac: 9 đối tác uy tín (khách hàng VIP, đại lý, nhà cung cấp)
 *   - don_hang: Chuỗi đơn hàng lịch sử 2025–2026 (Sales, Purchases, Production)
 *   - van_chuyen: Vận đơn logistics đa kênh (GHN, GHTK, ViettelPost, J&T, Đội xe) — đồng bộ 2 chiều với don_hang
 *   - so_quy: Sổ quỹ thu chi (Phiếu thu & Phiếu chi cân đối dòng tiền)
 *   - dieu_chinh_kho: Phiếu điều chỉnh kho chuẩn xác số lượng
 *   - ecommerce_policies: Chính sách sàn TMĐT (Shopee, TikTok Shop, Lazada)
 *   - ai_settings: Cấu hình mặc định trợ lý AI Copilot
 *   - luong: Chấm công & bảng lương 11 nhân sự
 *   - audit_log & san_xuat_logs: Làm sạch & khởi tạo nhật ký hệ thống
 *
 * Usage:
 *   node seed.js           # Seed nếu database đang trống
 *   node seed.js --clean   # Xóa sạch toàn bộ và nạp mới dữ liệu chuẩn chỉ (hoặc node seed.js --force)
 */

import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

/* ─────────────────────────────────────────────
   Helpers & Generators
───────────────────────────────────────────── */
function now() { return new Date(); }

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genOrderCode(prefix = "DH", year = 2026, month = 3, day = 15) {
  const ymd = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const randStr = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${randStr}`;
}

function genWaybillCode(carrier = "GHN", year = 2026, month = 3) {
  const prefix = carrier === "ViettelPost" ? "VTP" : (carrier === "J&T Express" ? "JT" : (carrier === "Đội xe nội bộ" ? "SME" : carrier));
  const ym = `${year}${String(month).padStart(2, "0")}`;
  const num = rand(1000, 9999);
  return `${prefix}-${ym}-${num}`;
}

function genPhieuCode(prefix = "PT", year = 2026, month = 3, day = 15) {
  const ymd = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const randStr = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${randStr}`;
}

/* ─────────────────────────────────────────────
   1. Phòng ban & Chức vụ (phongban_chucvu)
───────────────────────────────────────────── */
function buildPhongBanDocs() {
  const active = "active";
  const t = now();

  return [
    {
      ten_phong_ban: "Phòng giám đốc",
      mo_ta: "Ban lãnh đạo, toàn quyền quản lý hệ thống",
      trang_thai: active,
      createAt: t, updateAt: t,
      chuc_vu: [
        { _id: new ObjectId(), ten_chuc_vu: "Giám đốc", mo_ta: "Người đứng đầu doanh nghiệp", he_so_luong: 5.0, trang_thai: active, createAt: t, updateAt: t },
      ],
    },
    {
      ten_phong_ban: "Phòng kinh doanh",
      mo_ta: "Quản lý bán hàng, chăm sóc khách hàng",
      trang_thai: active,
      createAt: t, updateAt: t,
      chuc_vu: [
        { _id: new ObjectId(), ten_chuc_vu: "Trưởng phòng kinh doanh", mo_ta: "Quản lý phòng kinh doanh", he_so_luong: 3.0, trang_thai: active, createAt: t, updateAt: t },
        { _id: new ObjectId(), ten_chuc_vu: "Nhân viên kinh doanh",    mo_ta: "Xử lý đơn hàng, tư vấn bán hàng", he_so_luong: 2.0, trang_thai: active, createAt: t, updateAt: t },
      ],
    },
    {
      ten_phong_ban: "Phòng kế toán",
      mo_ta: "Quản lý tài chính, kế toán doanh nghiệp",
      trang_thai: active,
      createAt: t, updateAt: t,
      chuc_vu: [
        { _id: new ObjectId(), ten_chuc_vu: "Kế toán trưởng",   mo_ta: "Phụ trách tổng hợp kế toán", he_so_luong: 3.0, trang_thai: active, createAt: t, updateAt: t },
        { _id: new ObjectId(), ten_chuc_vu: "Nhân viên kế toán", mo_ta: "Xử lý chứng từ, báo cáo",   he_so_luong: 2.0, trang_thai: active, createAt: t, updateAt: t },
      ],
    },
    {
      ten_phong_ban: "Phòng nhân sự",
      mo_ta: "Tuyển dụng, quản lý nhân viên và tiền lương",
      trang_thai: active,
      createAt: t, updateAt: t,
      chuc_vu: [
        { _id: new ObjectId(), ten_chuc_vu: "Trưởng phòng nhân sự", mo_ta: "Quản lý phòng nhân sự", he_so_luong: 3.0, trang_thai: active, createAt: t, updateAt: t },
        { _id: new ObjectId(), ten_chuc_vu: "Nhân viên nhân sự",    mo_ta: "Quản lý hồ sơ, chấm công", he_so_luong: 2.0, trang_thai: active, createAt: t, updateAt: t },
      ],
    },
    {
      ten_phong_ban: "Phòng kho",
      mo_ta: "Quản lý xuất nhập kho, tồn kho nguyên vật liệu",
      trang_thai: active,
      createAt: t, updateAt: t,
      chuc_vu: [
        { _id: new ObjectId(), ten_chuc_vu: "Thủ kho",       mo_ta: "Phụ trách quản lý kho tổng", he_so_luong: 2.5, trang_thai: active, createAt: t, updateAt: t },
        { _id: new ObjectId(), ten_chuc_vu: "Nhân viên kho", mo_ta: "Xuất nhập kho hàng ngày",    he_so_luong: 1.5, trang_thai: active, createAt: t, updateAt: t },
      ],
    },
    {
      ten_phong_ban: "Phòng sản xuất",
      mo_ta: "Quản lý dây chuyền sản xuất, chế biến sản phẩm",
      trang_thai: active,
      createAt: t, updateAt: t,
      chuc_vu: [
        { _id: new ObjectId(), ten_chuc_vu: "Trưởng xưởng",       mo_ta: "Quản lý xưởng sản xuất",      he_so_luong: 3.0, trang_thai: active, createAt: t, updateAt: t },
        { _id: new ObjectId(), ten_chuc_vu: "Công nhân sản xuất",  mo_ta: "Trực tiếp sản xuất sản phẩm", he_so_luong: 1.5, trang_thai: active, createAt: t, updateAt: t },
      ],
    },
  ];
}

/* ─────────────────────────────────────────────
   2. Tài khoản nhân sự (users)
───────────────────────────────────────────── */
function buildUserDocs(hashedPw) {
  const t = now();
  return [
    /* 1 — Giám đốc / Admin */
    {
      ho_ten: "Nguyễn Văn Admin",
      ngay_sinh: new Date("1975-03-15"),
      tai_khoan: "admin",
      mat_khau: hashedPw,
      role: "admin",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng giám đốc",  mo_ta: "Ban lãnh đạo, toàn quyền quản lý hệ thống" },
      chuc_vu:   { ten: "Giám đốc",        mo_ta: "Người đứng đầu doanh nghiệp", heSoluong: 5.0 },
      createAt: t, updateAt: t,
    },
    /* 2 — Trưởng phòng kinh doanh */
    {
      ho_ten: "Trần Thị Kinh Doanh",
      ngay_sinh: new Date("1985-07-22"),
      tai_khoan: "truongkd",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng kinh doanh",         mo_ta: "Quản lý bán hàng, chăm sóc khách hàng" },
      chuc_vu:   { ten: "Trưởng phòng kinh doanh",  mo_ta: "Quản lý phòng kinh doanh", heSoluong: 3.0 },
      createAt: t, updateAt: t,
    },
    /* 3 — Nhân viên kinh doanh */
    {
      ho_ten: "Lê Văn Sale",
      ngay_sinh: new Date("1995-11-08"),
      tai_khoan: "sale",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng kinh doanh",      mo_ta: "Quản lý bán hàng, chăm sóc khách hàng" },
      chuc_vu:   { ten: "Nhân viên kinh doanh",  mo_ta: "Xử lý đơn hàng, tư vấn bán hàng", heSoluong: 2.0 },
      createAt: t, updateAt: t,
    },
    /* 4 — Kế toán trưởng */
    {
      ho_ten: "Phạm Văn Kế Toán",
      ngay_sinh: new Date("1978-04-12"),
      tai_khoan: "ketoantr",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng kế toán",   mo_ta: "Quản lý tài chính, kế toán doanh nghiệp" },
      chuc_vu:   { ten: "Kế toán trưởng",  mo_ta: "Phụ trách tổng hợp kế toán", heSoluong: 3.0 },
      createAt: t, updateAt: t,
    },
    /* 5 — Nhân viên kế toán */
    {
      ho_ten: "Hoàng Thị Kế Toán",
      ngay_sinh: new Date("1992-01-15"),
      tai_khoan: "ketoan",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng kế toán",      mo_ta: "Quản lý tài chính, kế toán doanh nghiệp" },
      chuc_vu:   { ten: "Nhân viên kế toán",  mo_ta: "Xử lý chứng từ, báo cáo", heSoluong: 2.0 },
      createAt: t, updateAt: t,
    },
    /* 6 — Trưởng phòng nhân sự */
    {
      ho_ten: "Vũ Thị Nhân Sự",
      ngay_sinh: new Date("1983-09-30"),
      tai_khoan: "nhansutr",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng nhân sự",         mo_ta: "Tuyển dụng, quản lý nhân viên và tiền lương" },
      chuc_vu:   { ten: "Trưởng phòng nhân sự",  mo_ta: "Quản lý phòng nhân sự", heSoluong: 3.0 },
      createAt: t, updateAt: t,
    },
    /* 7 — Nhân viên nhân sự */
    {
      ho_ten: "Đặng Văn Nhân Sự",
      ngay_sinh: new Date("1996-06-18"),
      tai_khoan: "nhansu",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng nhân sự",      mo_ta: "Tuyển dụng, quản lý nhân viên và tiền lương" },
      chuc_vu:   { ten: "Nhân viên nhân sự",  mo_ta: "Quản lý hồ sơ, chấm công", heSoluong: 2.0 },
      createAt: t, updateAt: t,
    },
    /* 8 — Thủ kho */
    {
      ho_ten: "Bùi Văn Kho",
      ngay_sinh: new Date("1988-12-05"),
      tai_khoan: "thukho",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng kho",  mo_ta: "Quản lý xuất nhập kho, tồn kho nguyên vật liệu" },
      chuc_vu:   { ten: "Thủ kho",   mo_ta: "Phụ trách quản lý kho tổng", heSoluong: 2.5 },
      createAt: t, updateAt: t,
    },
    /* 9 — Nhân viên kho */
    {
      ho_ten: "Ngô Thị Kho",
      ngay_sinh: new Date("1998-05-25"),
      tai_khoan: "nhanvienkho",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng kho",      mo_ta: "Quản lý xuất nhập kho, tồn kho nguyên vật liệu" },
      chuc_vu:   { ten: "Nhân viên kho",  mo_ta: "Xuất nhập kho hàng ngày", heSoluong: 1.5 },
      createAt: t, updateAt: t,
    },
    /* 10 — Trưởng xưởng */
    {
      ho_ten: "Trịnh Văn Xưởng",
      ngay_sinh: new Date("1980-08-12"),
      tai_khoan: "truongxuong",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng sản xuất",  mo_ta: "Quản lý dây chuyền sản xuất, chế biến sản phẩm" },
      chuc_vu:   { ten: "Trưởng xưởng",   mo_ta: "Quản lý xưởng sản xuất", heSoluong: 3.0 },
      createAt: t, updateAt: t,
    },
    /* 11 — Công nhân sản xuất */
    {
      ho_ten: "Lý Văn Sản Xuất",
      ngay_sinh: new Date("2000-01-20"),
      tai_khoan: "sanxuat",
      mat_khau: hashedPw,
      role: "user",
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng sản xuất",      mo_ta: "Quản lý dây chuyền sản xuất, chế biến sản phẩm" },
      chuc_vu:   { ten: "Công nhân sản xuất",  mo_ta: "Trực tiếp sản xuất sản phẩm", heSoluong: 1.5 },
      createAt: t, updateAt: t,
    },
  ];
}

/* ─────────────────────────────────────────────
   3. Nguyên vật liệu (nguyen_lieu)
───────────────────────────────────────────── */
function buildNguyenLieuDocs() {
  const active = "active";
  const t = now();
  return [
    { ma_nl: "NL001", ten_nl: "Gỗ MDF 18mm",             don_vi: "tấm",   gia_nhap: 350000, so_luong: 200, ton_toi_thieu: 30, mo_ta: "Tấm gỗ MDF dày 18mm, kích thước 1220x2440mm",  thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL002", ten_nl: "Gỗ MDF 12mm",             don_vi: "tấm",   gia_nhap: 280000, so_luong: 150, ton_toi_thieu: 25, mo_ta: "Tấm gỗ MDF dày 12mm, kích thước 1220x2440mm",  thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL003", ten_nl: "Ván HDF 6mm",              don_vi: "tấm",   gia_nhap: 180000, so_luong: 120, ton_toi_thieu: 20, mo_ta: "Tấm ván HDF dày 6mm dùng làm đáy/lưng tủ",     thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL004", ten_nl: "Sơn nước trắng",           don_vi: "lít",   gia_nhap:  85000, so_luong:  80, ton_toi_thieu: 20, mo_ta: "Sơn nước nội thất màu trắng, bóng mờ",          thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL005", ten_nl: "Keo dán gỗ PVA",           don_vi: "kg",    gia_nhap:  45000, so_luong: 100, ton_toi_thieu: 15, mo_ta: "Keo dán gỗ PVA D3 chịu nước trung bình",        thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL006", ten_nl: "Bản lề inox 4 tấc",        don_vi: "cái",   gia_nhap:  12000, so_luong: 500, ton_toi_thieu: 50, mo_ta: "Bản lề inox SUS304 kích thước 4 tấc",           thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL007", ten_nl: "Tay nắm tủ D-36",          don_vi: "cái",   gia_nhap:  25000, so_luong: 300, ton_toi_thieu: 40, mo_ta: "Tay nắm tủ hợp kim nhôm D-36, lỗ 128mm",       thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL008", ten_nl: "Đinh vít gỗ 3.5x40mm",     don_vi: "hộp",   gia_nhap:  35000, so_luong: 150, ton_toi_thieu: 25, mo_ta: "Đinh vít mũi khoan gỗ 3.5x40mm, hộp 200 cái",  thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL009", ten_nl: "Giấy nhám hạt P180",       don_vi: "tờ",    gia_nhap:   5000, so_luong: 400, ton_toi_thieu: 50, mo_ta: "Giấy nhám hạt P180 dùng cho bề mặt gỗ mịn",    thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL010", ten_nl: "Kính cường lực 5mm",        don_vi: "m²",    gia_nhap: 450000, so_luong:  30, ton_toi_thieu:  5, mo_ta: "Kính cường lực trong suốt dày 5mm",              thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
  ];
}

/* ─────────────────────────────────────────────
   4. Sản phẩm thành phẩm (san_pham)
───────────────────────────────────────────── */
function buildSanPhamDocs() {
  const active = "active";
  const t = now();
  return [
    {
      ma_sp: "SP001", ten_sp: "Bàn làm việc MDF",       don_gia: 2500000, so_luong: 35, ton_toi_thieu: 10, mo_ta: "Bàn làm việc MDF phủ melamine trắng, kích thước 120x60x75cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 1,   don_vi: "lít" },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",      so_luong: 0.5, don_vi: "kg"  },
        { ma_nl: "NL007", ten: "Tay nắm tủ D-36",     so_luong: 4,   don_vi: "cái" },
        { ma_nl: "NL008", ten: "Đinh vít gỗ 3.5x40mm",so_luong: 1,   don_vi: "hộp" },
        { ma_nl: "NL009", ten: "Giấy nhám hạt P180",  so_luong: 3,   don_vi: "tờ"  },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP002", ten_sp: "Tủ quần áo 3 cánh",     don_gia: 4800000, so_luong: 18, ton_toi_thieu: 5, mo_ta: "Tủ quần áo 3 cánh MDF phủ melamine, kích thước 180x55x210cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 5,   don_vi: "tấm" },
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 3,   don_vi: "tấm" },
        { ma_nl: "NL003", ten: "Ván HDF 6mm",         so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 2,   don_vi: "lít" },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",      so_luong: 1,   don_vi: "kg"  },
        { ma_nl: "NL006", ten: "Bản lề inox 4 tấc",   so_luong: 6,   don_vi: "cái" },
        { ma_nl: "NL007", ten: "Tay nắm tủ D-36",     so_luong: 6,   don_vi: "cái" },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP003", ten_sp: "Kệ sách 5 tầng",        don_gia: 1800000, so_luong: 40, ton_toi_thieu: 10, mo_ta: "Kệ sách 5 tầng MDF trắng, kích thước 80x30x175cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 3,   don_vi: "tấm" },
        { ma_nl: "NL003", ten: "Ván HDF 6mm",         so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 0.5, don_vi: "lít" },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",      so_luong: 0.3, don_vi: "kg"  },
        { ma_nl: "NL009", ten: "Giấy nhám hạt P180",  so_luong: 2,   don_vi: "tờ"  },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP004", ten_sp: "Ghế văn phòng",          don_gia: 1200000, so_luong: 50, ton_toi_thieu: 15, mo_ta: "Ghế văn phòng khung MDF, đệm vải, có bánh xe",
      nguyen_lieu: [
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 1,   don_vi: "tấm" },
        { ma_nl: "NL008", ten: "Đinh vít gỗ 3.5x40mm",so_luong: 1,   don_vi: "hộp" },
        { ma_nl: "NL009", ten: "Giấy nhám hạt P180",  so_luong: 1,   don_vi: "tờ"  },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP005", ten_sp: "Tủ bếp dưới",            don_gia: 3500000, so_luong: 15, ton_toi_thieu: 5, mo_ta: "Tủ bếp phần dưới MDF chống ẩm, kích thước 100x55x80cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 4,   don_vi: "tấm" },
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",      so_luong: 1,   don_vi: "kg"  },
        { ma_nl: "NL006", ten: "Bản lề inox 4 tấc",   so_luong: 4,   don_vi: "cái" },
        { ma_nl: "NL007", ten: "Tay nắm tủ D-36",     so_luong: 4,   don_vi: "cái" },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP006", ten_sp: "Bàn ăn 6 chỗ",           don_gia: 3200000, so_luong: 20, ton_toi_thieu: 5, mo_ta: "Bàn ăn 6 chỗ mặt kính 5mm, khung gỗ MDF, 160x80x75cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 4,   don_vi: "tấm" },
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 1.5, don_vi: "lít" },
        { ma_nl: "NL010", ten: "Kính cường lực 5mm",   so_luong: 0.5, don_vi: "m²"  },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",      so_luong: 0.8, don_vi: "kg"  },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP007", ten_sp: "Giường ngủ 1m6",         don_gia: 4200000, so_luong: 12, ton_toi_thieu: 4, mo_ta: "Giường ngủ gỗ MDF 160x200cm, vạt giường HDF",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 6,   don_vi: "tấm" },
        { ma_nl: "NL003", ten: "Ván HDF 6mm",         so_luong: 4,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 2,   don_vi: "lít" },
        { ma_nl: "NL008", ten: "Đinh vít gỗ 3.5x40mm",so_luong: 2,   don_vi: "hộp" },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP008", ten_sp: "Kệ tivi phòng khách",    don_gia: 2200000, so_luong: 25, ton_toi_thieu: 8, mo_ta: "Kệ tivi phòng khách 160x40x45cm, 2 ngăn kéo",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 3,   don_vi: "tấm" },
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 1.5, don_vi: "tấm" },
        { ma_nl: "NL006", ten: "Bản lề inox 4 tấc",   so_luong: 2,   don_vi: "cái" },
        { ma_nl: "NL007", ten: "Tay nắm tủ D-36",     so_luong: 2,   don_vi: "cái" },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP009", ten_sp: "Tủ đầu giường",          don_gia: 1500000, so_luong: 30, ton_toi_thieu: 10, mo_ta: "Tủ đầu giường 2 ngăn kéo, kích thước 45x40x50cm",
      nguyen_lieu: [
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 1.5, don_vi: "tấm" },
        { ma_nl: "NL003", ten: "Ván HDF 6mm",         so_luong: 0.5, don_vi: "tấm" },
        { ma_nl: "NL007", ten: "Tay nắm tủ D-36",     so_luong: 2,   don_vi: "cái" },
        { ma_nl: "NL008", ten: "Đinh vít gỗ 3.5x40mm",so_luong: 0.5, don_vi: "hộp" },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP010", ten_sp: "Bàn trang điểm",          don_gia: 2800000, so_luong: 18, ton_toi_thieu: 6, mo_ta: "Bàn trang điểm MDF gương tích hợp, 90x45x145cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 3,   don_vi: "tấm" },
        { ma_nl: "NL003", ten: "Ván HDF 6mm",         so_luong: 1,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 1,   don_vi: "lít" },
        { ma_nl: "NL006", ten: "Bản lề inox 4 tấc",   so_luong: 4,   don_vi: "cái" },
        { ma_nl: "NL007", ten: "Tay nắm tủ D-36",     so_luong: 4,   don_vi: "cái" },
        { ma_nl: "NL009", ten: "Giấy nhám hạt P180",  so_luong: 2,   don_vi: "tờ"  },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
  ];
}

/* ─────────────────────────────────────────────
   5. Đối tác & Khách hàng (doi_tac)
───────────────────────────────────────────── */
function buildDoiTacDocs() {
  const t = now();
  return [
    { ma_doi_tac: "KH-VINHOMES", ten: "Tập đoàn Vinhomes - Ban Quản Lý Dự Án", loai_doi_tac: "khach_hang", so_dien_thoai: "02439749999", email: "procurement@vinhomes.vn", dia_chi: "Tòa nhà Symphony, Chu Huy Mân, Long Biên, Hà Nội", nhom: "khach_vip", trang_thai: "active", createAt: t, updateAt: t },
    { ma_doi_tac: "KH-SUNGROUP", ten: "Tập đoàn Sun Group - Khối Nghỉ Dưỡng", loai_doi_tac: "khach_hang", so_dien_thoai: "02363891234", email: "purchasing@sungroup.com.vn", dia_chi: "Tầng 9, Sun City, 13 Hai Bà Trưng, Hoàn Kiếm, Hà Nội", nhom: "khach_vip", trang_thai: "active", createAt: t, updateAt: t },
    { ma_doi_tac: "KH-ANGCUONG", ten: "Nội Thất An Cường Showroom Phân Phối", loai_doi_tac: "khach_hang", so_dien_thoai: "02838625727", email: "contact@ancuong.com", dia_chi: "702/1F Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM", nhom: "dai_ly", trang_thai: "active", createAt: t, updateAt: t },
    { ma_doi_tac: "KH-HOAPHAT", ten: "Nội Thất Hòa Phát Miền Nam", loai_doi_tac: "khach_hang", so_dien_thoai: "02835111222", email: "banhang@hoaphat.com.vn", dia_chi: "392 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM", nhom: "dai_ly", trang_thai: "active", createAt: t, updateAt: t },
    { ma_doi_tac: "KH-XUANHOA", ten: "Công ty Cổ phần Xuân Hòa Việt Nam", loai_doi_tac: "khach_hang", so_dien_thoai: "02438866115", email: "sales@xuanhoa.vn", dia_chi: "Phường Xuân Hòa, Phúc Yên, Vĩnh Phúc", nhom: "dai_ly", trang_thai: "active", createAt: t, updateAt: t },
    { ma_doi_tac: "NCC-ANCLAMINATE", ten: "Công ty Cổ phần Gỗ An Cường", loai_doi_tac: "nha_cung_cap", so_dien_thoai: "02743626262", email: "supplies@ancuong.com", dia_chi: "KCN Đất Cuốc, Bắc Tân Uyên, Bình Dương", nhom: "nha_cung_cap", trang_thai: "active", createAt: t, updateAt: t },
    { ma_doi_tac: "NCC-DONGNAI", ten: "Tổng Công ty Gỗ Đồng Nai (Donagowood)", loai_doi_tac: "nha_cung_cap", so_dien_thoai: "02513836156", email: "info@donagowood.vn", dia_chi: "KCN Biên Hòa 1, Đồng Nai", nhom: "nha_cung_cap", trang_thai: "active", createAt: t, updateAt: t },
    { ma_doi_tac: "NCC-HAFELE", ten: "Công ty TNHH Hafele Việt Nam", loai_doi_tac: "nha_cung_cap", so_dien_thoai: "02839113113", email: "info@hafele.com.vn", dia_chi: "Tòa nhà REE Tower, 9 Đoàn Văn Bơ, Quận 4, TP.HCM", nhom: "nha_cung_cap", trang_thai: "active", createAt: t, updateAt: t },
    { ma_doi_tac: "NCC-NIPPON", ten: "Công ty Sơn Nippon Paint Việt Nam", loai_doi_tac: "nha_cung_cap", so_dien_thoai: "02513836579", email: "support@nipponpaint.com.vn", dia_chi: "KCN Biên Hòa 2, Đồng Nai", nhom: "nha_cung_cap", trang_thai: "active", createAt: t, updateAt: t },
  ];
}

/* ─────────────────────────────────────────────
   6. Chính sách sàn TMĐT (ecommerce_policies)
───────────────────────────────────────────── */
const DEFAULT_ECOMMERCE_POLICIES = {
  shopee: {
    code: "shopee",
    name: "Shopee Việt Nam",
    logo_color: "#ee4d2d",
    phi_thanh_toan_pct: 4.0,
    phi_co_dinh_pct: 5.0,
    phi_dich_vu_pct: 7.0,
    phi_dich_vu_cap: 40000,
    phi_dong_goi_co_dinh: 15000,
    ty_le_hoan_du_kien_pct: 4.0,
    chi_phi_van_chuyen_hoan: 25000,
    thue_vat_tncn_pct: 1.5,
    mo_ta: "Áp dụng cho shop thông thường tham gia gói Freeship Xtra",
  },
  tiktok: {
    code: "tiktok",
    name: "TikTok Shop",
    logo_color: "#000000",
    phi_thanh_toan_pct: 4.0,
    phi_co_dinh_pct: 5.0,
    phi_dich_vu_pct: 4.5,
    phi_dich_vu_cap: 35000,
    phi_affiliate_koc_pct: 10.0,
    phi_dong_goi_co_dinh: 15000,
    ty_le_hoan_du_kien_pct: 6.0,
    chi_phi_van_chuyen_hoan: 25000,
    thue_vat_tncn_pct: 1.5,
    mo_ta: "Áp dụng cho đơn hàng bán qua livestream / video Creator",
  },
  lazada: {
    code: "lazada",
    name: "Lazada Việt Nam",
    logo_color: "#0f146d",
    phi_thanh_toan_pct: 3.99,
    phi_co_dinh_pct: 4.5,
    phi_dich_vu_pct: 6.0,
    phi_dich_vu_cap: 35000,
    phi_dong_goi_co_dinh: 15000,
    ty_le_hoan_du_kien_pct: 4.0,
    chi_phi_van_chuyen_hoan: 25000,
    thue_vat_tncn_pct: 1.5,
    mo_ta: "Áp dụng cho nhà bán hàng tham gia gói Freeship Max",
  },
};

/* ─────────────────────────────────────────────
   MASTER SEED FUNCTION
───────────────────────────────────────────── */
export async function seedIfEmpty(client, forceClean = false) {
  const dbName = process.env.SME_DB_NAME || "SME_db_mongo";
  const db = client.db(dbName);

  const userCount = await db.collection("users").countDocuments();
  if (userCount > 0 && !forceClean) {
    console.log(`⏭️   Seed skipped — database already has ${userCount} users. (Use --clean to force reseed)`);
    return;
  }

  console.log(`\n🌱  ${forceClean ? "CLEAN & RESEED" : "SEEDING"} Database: [${dbName}]...`);

  try {
    /* ── A. Xóa sạch 15 collections ──────────────────────────────── */
    const ALL_COLLECTIONS = [
      "phongban_chucvu",
      "users",
      "nguyen_lieu",
      "san_pham",
      "bom_san_pham",
      "doi_tac",
      "don_hang",
      "van_chuyen",
      "so_quy",
      "dieu_chinh_kho",
      "ecommerce_policies",
      "ai_settings",
      "luong",
      "audit_log",
      "san_xuat_logs"
    ];

    for (const col of ALL_COLLECTIONS) {
      await db.collection(col).deleteMany({});
    }
    console.log(`🗑️   Đã dọn dẹp sạch sẽ ${ALL_COLLECTIONS.length} collections.`);

    /* ── B. Seed Phòng ban & Chức vụ ────────────────────────────── */
    const phongBanDocs = buildPhongBanDocs();
    await db.collection("phongban_chucvu").insertMany(phongBanDocs);
    console.log(`✅  1. Inserted ${phongBanDocs.length} phòng ban vào [phongban_chucvu]`);

    /* ── C. Seed Tài khoản nhân sự ──────────────────────────────── */
    const hashedPw = await bcrypt.hash("123456", 10);
    const userDocs = buildUserDocs(hashedPw);
    const usersResult = await db.collection("users").insertMany(userDocs);
    const userIds = usersResult.insertedIds;
    console.log(`✅  2. Inserted ${userDocs.length} tài khoản người dùng vào [users] (mật khẩu: 123456)`);

    const adminUser = userDocs[0];
    const saleUser  = userDocs[2];
    const thuKhoUser = userDocs[7];
    const nvKhoUser  = userDocs[8];

    /* ── D. Seed Nguyên vật liệu ────────────────────────────────── */
    const nlDocs = buildNguyenLieuDocs();
    const nlResult = await db.collection("nguyen_lieu").insertMany(nlDocs);
    const nlIds = nlResult.insertedIds;
    const nlById = {};
    nlDocs.forEach((nl, i) => { nlById[nl.ma_nl] = nlIds[i]; });
    console.log(`✅  3. Inserted ${nlDocs.length} nguyên vật liệu gỗ vào [nguyen_lieu]`);

    /* ── E. Seed Sản phẩm thành phẩm ────────────────────────────── */
    const spDocs = buildSanPhamDocs();
    const spResult = await db.collection("san_pham").insertMany(spDocs);
    const spIds = spResult.insertedIds;
    const spById = {};
    spDocs.forEach((sp, i) => { spById[sp.ma_sp] = spIds[i]; });
    console.log(`✅  4. Inserted ${spDocs.length} sản phẩm thành phẩm vào [san_pham]`);

    /* ── F. Seed BOM Công thức sản xuất ─────────────────────────── */
    const t = now();
    const bomDocs = [
      {
        san_pham_id: spById["SP001"],
        ghi_chu: "Công thức sản xuất bàn làm việc MDF tiêu chuẩn",
        items: [
          { nguyen_lieu_id: nlById["NL001"], qty: 2,   unit: "tấm", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL004"], qty: 1,   unit: "lít", waste_rate: 0.10 },
          { nguyen_lieu_id: nlById["NL005"], qty: 0.5, unit: "kg",  waste_rate: 0.08 },
          { nguyen_lieu_id: nlById["NL007"], qty: 4,   unit: "cái", waste_rate: 0.00 },
          { nguyen_lieu_id: nlById["NL008"], qty: 1,   unit: "hộp", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL009"], qty: 3,   unit: "tờ",  waste_rate: 0.20 },
        ],
        createAt: t, updateAt: t,
      },
      {
        san_pham_id: spById["SP002"],
        ghi_chu: "Công thức sản xuất tủ quần áo 3 cánh",
        items: [
          { nguyen_lieu_id: nlById["NL001"], qty: 5,   unit: "tấm", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL002"], qty: 3,   unit: "tấm", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL003"], qty: 2,   unit: "tấm", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL004"], qty: 2,   unit: "lít", waste_rate: 0.10 },
          { nguyen_lieu_id: nlById["NL005"], qty: 1,   unit: "kg",  waste_rate: 0.08 },
          { nguyen_lieu_id: nlById["NL006"], qty: 6,   unit: "cái", waste_rate: 0.00 },
          { nguyen_lieu_id: nlById["NL007"], qty: 6,   unit: "cái", waste_rate: 0.00 },
        ],
        createAt: t, updateAt: t,
      },
      {
        san_pham_id: spById["SP003"],
        ghi_chu: "Công thức sản xuất kệ sách 5 tầng",
        items: [
          { nguyen_lieu_id: nlById["NL001"], qty: 3,   unit: "tấm", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL003"], qty: 2,   unit: "tấm", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL004"], qty: 0.5, unit: "lít", waste_rate: 0.10 },
          { nguyen_lieu_id: nlById["NL005"], qty: 0.3, unit: "kg",  waste_rate: 0.08 },
          { nguyen_lieu_id: nlById["NL009"], qty: 2,   unit: "tờ",  waste_rate: 0.20 },
        ],
        createAt: t, updateAt: t,
      },
      {
        san_pham_id: spById["SP006"],
        ghi_chu: "Công thức sản xuất bàn ăn 6 chỗ có mặt kính",
        items: [
          { nguyen_lieu_id: nlById["NL001"], qty: 4,   unit: "tấm", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL002"], qty: 2,   unit: "tấm", waste_rate: 0.05 },
          { nguyen_lieu_id: nlById["NL004"], qty: 1.5, unit: "lít", waste_rate: 0.10 },
          { nguyen_lieu_id: nlById["NL010"], qty: 0.5, unit: "m²",  waste_rate: 0.10 },
          { nguyen_lieu_id: nlById["NL005"], qty: 0.8, unit: "kg",  waste_rate: 0.08 },
        ],
        createAt: t, updateAt: t,
      },
    ];
    await db.collection("bom_san_pham").insertMany(bomDocs);
    console.log(`✅  5. Inserted ${bomDocs.length} công thức định mức BOM vào [bom_san_pham]`);

    /* ── G. Seed Đối tác & Khách hàng ──────────────────────────── */
    const dtDocs = buildDoiTacDocs();
    await db.collection("doi_tac").insertMany(dtDocs);
    console.log(`✅  6. Inserted ${dtDocs.length} khách hàng & nhà cung cấp vào [doi_tac]`);

    /* ── H. Seed Đơn hàng 2025–2026, Vận đơn & Sổ quỹ ───────────── */
    console.log("📈  7. Đang tạo chuỗi đơn hàng lịch sử 2025 - 2026 kèm Vận đơn và Sổ quỹ...");
    const khachHangs = dtDocs.filter(d => d.loai_doi_tac === "khach_hang");
    const nhaCungCaps = dtDocs.filter(d => d.loai_doi_tac === "nha_cung_cap");

    const orderBatch = [];
    const waybillBatch = [];
    const cashbookBatch = [];

    const carriers = ["GHN", "GHTK", "ViettelPost", "J&T Express", "Đội xe nội bộ"];

    // 21 tháng: 12 tháng 2025 và 9 tháng 2026
    const monthsList = [];
    for (let m = 1; m <= 12; m++) monthsList.push({ year: 2025, month: m });
    for (let m = 1; m <= 9; m++)  monthsList.push({ year: 2026, month: m });

    for (const ym of monthsList) {
      const { year, month } = ym;
      const numSales     = rand(4, 7);
      const numPurchases = rand(2, 3);
      const numProds     = rand(2, 4);

      // H.1 Đơn bán hàng (Sale Orders)
      for (let i = 0; i < numSales; i++) {
        const day = rand(2, 27);
        const orderDate = new Date(Date.UTC(year, month - 1, day, rand(8, 17), rand(0, 59)));
        const kh = randItem(khachHangs);

        // Chọn 1-3 sản phẩm
        const picked = [randItem(spDocs), randItem(spDocs)].filter((v, idx, a) => a.indexOf(v) === idx);
        const items = picked.map(sp => {
          const qty = rand(2, 6);
          return {
            loai_hang: "san_pham",
            san_pham_id: spById[sp.ma_sp],
            ma_sp: sp.ma_sp,
            ten_sp: sp.ten_sp,
            don_vi: "cái",
            don_gia: sp.don_gia,
            so_luong: qty,
            thanh_tien: sp.don_gia * qty,
          };
        });

        const tongTien = items.reduce((s, it) => s + it.thanh_tien, 0);
        const maDh = genOrderCode("DH", year, month, day);

        // Đơn tháng gần nhất (9/2026) có cả confirmed và draft; các tháng cũ completed
        let trangThai = "completed";
        if (year === 2026 && month === 9) {
          if (i === 0) trangThai = "draft";
          else if (i === 1) trangThai = "confirmed";
          else if (i === 2) trangThai = "confirmed";
          else trangThai = "completed";
        }

        const carrier = randItem(carriers);
        const maVd = genWaybillCode(carrier, year, month);
        let ttVanChuyen = null;
        if (trangThai === "completed") ttVanChuyen = "giao_thanh_cong";
        else if (trangThai === "confirmed") ttVanChuyen = randItem(["cho_dong_goi", "da_ban_giao", "dang_giao"]);

        const orderDoc = {
          ma_dh: maDh,
          loai_don: "sale",
          trang_thai: trangThai,
          khach_hang_ten: kh.ten,
          khach_hang_sdt: kh.so_dien_thoai,
          khach_hang_dia_chi: kh.dia_chi,
          nguoi_lap_id: userIds[2], // sale
          ngay_dat: orderDate,
          created_at: orderDate,
          updated_at: orderDate,
          san_pham: items,
          tong_tien: tongTien,
          phi_vc: randItem([0, 30000, 50000]),
          giam_gia: 0,
          thue_tien: 0,
          tam_tinh: tongTien,
          ghi_chu: `Hợp đồng cung cấp nội thất ${maDh}`,
          // Linkage 2 chiều:
          ma_van_don: ttVanChuyen ? maVd : null,
          don_vi_van_chuyen: ttVanChuyen ? carrier : null,
          trang_thai_van_chuyen: ttVanChuyen,
        };
        orderBatch.push(orderDoc);

        // Tạo vận đơn logistics nếu đơn đã xác nhận / hoàn thành
        if (ttVanChuyen) {
          waybillBatch.push({
            ma_van_don: maVd,
            ma_don_hang: maDh,
            don_vi_van_chuyen: carrier,
            nguoi_gui: {
              ten: "Công Ty Cổ Phần Nội Thất & Thiết Bị SME",
              sdt: "1900 6868",
              dia_chi: "Kho Tổng A1, KCN Tân Bình, TP. Hồ Chí Minh"
            },
            nguoi_nhan: {
              ten: kh.ten,
              sdt: kh.so_dien_thoai,
              dia_chi: kh.dia_chi
            },
            tien_thu_ho_cod: trangThai === "completed" ? 0 : tongTien,
            phi_van_chuyen: randItem([35000, 45000, 60000]),
            nguoi_tra_phi: "shop",
            trong_luong_gram: rand(1500, 8000),
            san_pham: items,
            ghi_chu: "Hàng nội thất dễ trầy xước, cẩn thận khi bốc dỡ",
            trang_thai: ttVanChuyen,
            lich_su_trang_thai: [
              { trang_thai: "cho_dong_goi", thoi_gian: orderDate, ghi_chu: "Đã tạo vận đơn, đóng gói hàng hóa", nguoi_thuc_hien: "sale" },
              ...(ttVanChuyen !== "cho_dong_goi" ? [{ trang_thai: ttVanChuyen, thoi_gian: orderDate, ghi_chu: "Cập nhật hành trình vận chuyển", nguoi_thuc_hien: "thukho" }] : [])
            ],
            ngay_tao: orderDate,
            ngay_cap_nhat: orderDate
          });
        }

        // Tạo phiếu thu sổ quỹ khi đơn hoàn thành
        if (trangThai === "completed") {
          const maPt = genPhieuCode("PT", year, month, day);
          cashbookBatch.push({
            ma_phieu: maPt,
            loai_phieu: "thu",
            hang_muc: "Thu tiền bán hàng",
            so_tien: tongTien,
            phuong_thuc: randItem(["chuyen_khoan", "chuyen_khoan", "tien_mat"]),
            doi_tuong: { ten: kh.ten, loai: "khach_hang" },
            ma_chung_tu: maDh,
            ngay_ghi_nhan: orderDate,
            created_at: orderDate,
            updated_at: orderDate,
            trang_thai: "active",
            ghi_chu: `Thanh toán hợp đồng ${maDh}`
          });
        }
      }

      // H.2 Đơn nhập mua vật tư (Purchase Receipts)
      for (let i = 0; i < numPurchases; i++) {
        const day = rand(1, 22);
        const orderDate = new Date(Date.UTC(year, month - 1, day, rand(8, 16), rand(0, 59)));
        const ncc = randItem(nhaCungCaps);

        const pickedMats = [randItem(nlDocs), randItem(nlDocs)].filter((v, idx, a) => a.indexOf(v) === idx);
        const items = pickedMats.map(nl => {
          const qty = rand(20, 60);
          return {
            loai_hang: "nguyen_lieu",
            nguyen_lieu_id: nlById[nl.ma_nl],
            ma_nl: nl.ma_nl,
            ten_nl: nl.ten_nl,
            don_vi: nl.don_vi,
            don_gia: nl.gia_nhap,
            so_luong: qty,
            thanh_tien: nl.gia_nhap * qty
          };
        });

        const tongTien = items.reduce((s, it) => s + it.thanh_tien, 0);
        const maPn = genOrderCode("PN", year, month, day);

        orderBatch.push({
          ma_dh: maPn,
          loai_don: "purchase_receipt",
          trang_thai: "completed",
          nha_cung_cap_ten: ncc.ten,
          nguoi_lap_id: userIds[0], // admin
          ngay_dat: orderDate,
          created_at: orderDate,
          updated_at: orderDate,
          san_pham: items,
          tong_tien: tongTien,
          phi_vc: 200000,
          giam_gia: 0,
          thue_tien: 0,
          tam_tinh: tongTien,
          ghi_chu: `Nhập kho nguyên vật liệu xưởng ${maPn}`
        });

        // Tạo phiếu chi mua nguyên vật liệu
        const maPc = genPhieuCode("PC", year, month, day);
        cashbookBatch.push({
          ma_phieu: maPc,
          loai_phieu: "chi",
          hang_muc: "Chi mua nguyên vật liệu",
          so_tien: tongTien,
          phuong_thuc: "chuyen_khoan",
          doi_tuong: { ten: ncc.ten, loai: "nha_cung_cap" },
          ma_chung_tu: maPn,
          ngay_ghi_nhan: orderDate,
          created_at: orderDate,
          updated_at: orderDate,
          trang_thai: "active",
          ghi_chu: `Thanh toán hóa đơn nhập vật tư ${maPn}`
        });
      }

      // H.3 Đơn nhập sản xuất xưởng (Prod Receipts)
      for (let i = 0; i < numProds; i++) {
        const day = rand(5, 28);
        const orderDate = new Date(Date.UTC(year, month - 1, day, rand(9, 17), rand(0, 59)));
        const sp = randItem(spDocs);
        const qty = rand(5, 15);
        const maSx = genOrderCode("LSX", year, month, day);

        orderBatch.push({
          ma_dh: maSx,
          loai_don: "prod_receipt",
          trang_thai: "completed",
          nguoi_lap_id: userIds[0], // admin
          ngay_dat: orderDate,
          created_at: orderDate,
          updated_at: orderDate,
          san_pham: [{
            loai_hang: "san_pham",
            san_pham_id: spById[sp.ma_sp],
            ma_sp: sp.ma_sp,
            ten_sp: sp.ten_sp,
            don_vi: "cái",
            don_gia: sp.don_gia,
            so_luong: qty,
            thanh_tien: sp.don_gia * qty
          }],
          tong_tien: sp.don_gia * qty,
          tam_tinh: sp.don_gia * qty,
          ghi_chu: `Nhập kho thành phẩm theo lệnh sản xuất ${maSx}`
        });
      }

      // H.4 Chi phí vận hành cố định mỗi tháng (Điện nước, thuê xưởng)
      const opDate = new Date(Date.UTC(year, month - 1, 28, 10, 0));
      cashbookBatch.push({
        ma_phieu: genPhieuCode("PC", year, month, 28),
        loai_phieu: "chi",
        hang_muc: "Chi phí vận hành & mặt bằng xưởng",
        so_tien: rand(15000000, 25000000),
        phuong_thuc: "chuyen_khoan",
        doi_tuong: { ten: "Ban Quản Lý KCN Tân Bình", loai: "nha_cung_cap" },
        ma_chung_tu: `VH-${year}${String(month).padStart(2, "0")}`,
        ngay_ghi_nhan: opDate,
        created_at: opDate,
        updated_at: opDate,
        trang_thai: "active",
        ghi_chu: `Chi phí điện nước và thuê xưởng sản xuất tháng ${month}/${year}`
      });
    }

    await db.collection("don_hang").insertMany(orderBatch);
    console.log(`✅  Inserted ${orderBatch.length} đơn hàng (Sale, Purchase, Prod) vào [don_hang]`);

    await db.collection("van_chuyen").insertMany(waybillBatch);
    console.log(`✅  Inserted ${waybillBatch.length} vận đơn logistics vào [van_chuyen] (Đã đồng bộ 2 chiều với đơn hàng)`);

    await db.collection("so_quy").insertMany(cashbookBatch);
    console.log(`✅  Inserted ${cashbookBatch.length} phiếu thu chi sổ quỹ vào [so_quy]`);

    /* ── I. Seed Điều chỉnh kho (dieu_chinh_kho) ─────────────────── */
    const dckDocs = [
      /* 1 — Chờ duyệt: kiểm kê thừa 15 tấm gỗ MDF 18mm */
      {
        loai:                 "nguyen_lieu",
        item_id:              nlById["NL001"],
        ma_hang:              "NL001",
        ten_hang:             "Gỗ MDF 18mm",
        so_luong_dieu_chinh:  15,
        ton_kho_truoc:        200,
        ly_do:                "Kiểm kê thực tế phát hiện dôi dư 15 tấm so với sổ sách",
        trang_thai:           "cho_duyet",
        created_by:           { tai_khoan: nvKhoUser.tai_khoan, ho_ten: nvKhoUser.ho_ten },
        approved_by:          null,
        created_at:           new Date("2026-09-18T08:30:00Z"),
        updated_at:           new Date("2026-09-18T08:30:00Z"),
      },
      /* 2 — Đã duyệt: xuất bớt 2 tủ quần áo làm mẫu showroom */
      {
        loai:                 "san_pham",
        item_id:              spById["SP002"],
        ma_hang:              "SP002",
        ten_hang:             "Tủ quần áo 3 cánh",
        so_luong_dieu_chinh:  -2,
        ton_kho_truoc:        18,
        ly_do:                "Hàng mẫu xuất cho showroom không qua đơn hàng",
        trang_thai:           "da_duyet",
        created_by:           { tai_khoan: nvKhoUser.tai_khoan, ho_ten: nvKhoUser.ho_ten },
        approved_by:          { tai_khoan: thuKhoUser.tai_khoan, ho_ten: thuKhoUser.ho_ten },
        created_at:           new Date("2026-09-15T09:00:00Z"),
        updated_at:           new Date("2026-09-15T10:15:00Z"),
      },
      /* 3 — Từ chối: yêu cầu tăng tồn dự phòng không hợp lệ */
      {
        loai:                 "nguyen_lieu",
        item_id:              nlById["NL005"],
        ma_hang:              "NL005",
        ten_hang:             "Keo dán gỗ PVA",
        so_luong_dieu_chinh:  50,
        ton_kho_truoc:        100,
        ly_do:                "Muốn tăng tồn kho dự phòng cho mùa cao điểm",
        trang_thai:           "tu_choi",
        created_by:           { tai_khoan: nvKhoUser.tai_khoan, ho_ten: nvKhoUser.ho_ten },
        approved_by:          { tai_khoan: adminUser.tai_khoan, ho_ten: adminUser.ho_ten },
        created_at:           new Date("2026-09-10T14:00:00Z"),
        updated_at:           new Date("2026-09-10T16:30:00Z"),
      },
      /* 4 — Chờ duyệt (Admin tự tạo): test quyền tự duyệt của Admin */
      {
        loai:                 "nguyen_lieu",
        item_id:              nlById["NL006"],
        ma_hang:              "NL006",
        ten_hang:             "Bản lề inox 4 tấc",
        so_luong_dieu_chinh:  50,
        ton_kho_truoc:        500,
        ly_do:                "Điều chỉnh số liệu sau đợt kiểm toán quý 3",
        trang_thai:           "cho_duyet",
        created_by:           { tai_khoan: adminUser.tai_khoan, ho_ten: adminUser.ho_ten },
        approved_by:          null,
        created_at:           new Date("2026-09-21T08:00:00Z"),
        updated_at:           new Date("2026-09-21T08:00:00Z"),
      },
    ];
    await db.collection("dieu_chinh_kho").insertMany(dckDocs);
    console.log(`✅  8. Inserted ${dckDocs.length} phiếu điều chỉnh kho vào [dieu_chinh_kho]`);

    /* ── J. Seed Chính sách sàn TMĐT (ecommerce_policies) ───────── */
    await db.collection("ecommerce_policies").insertOne({
      _id: "default_policies",
      policies: DEFAULT_ECOMMERCE_POLICIES,
      updated_at: t,
    });
    console.log(`✅  9. Inserted chính sách đa sàn TMĐT vào [ecommerce_policies]`);

    /* ── K. Seed Cài đặt AI Copilot (ai_settings) ───────────────── */
    await db.collection("ai_settings").insertOne({
      _id: "global_ai_config",
      api_key: "",
      is_active: false,
      model: "gemini-1.5-flash",
      provider: "gemini",
      updated_at: t,
    });
    console.log(`✅  10. Inserted cài đặt AI Copilot vào [ai_settings]`);

    /* ── L. Seed Chấm công & Bảng lương (luong) ─────────────────── */
    console.log("⏱️  11. Đang tạo dữ liệu chấm công & tính lương cho 11 nhân viên...");
    const luongDocs = [];
    const workDays = 22; // 22 ngày làm việc trong tháng 9/2026
    for (let d = 1; d <= workDays; d++) {
      const dateStr = `2026-09-${String(d).padStart(2, "0")}`;
      const ngayDate = new Date(`${dateStr}T00:00:00Z`);

      for (let uIdx = 0; uIdx < userDocs.length; uIdx++) {
        const u = userDocs[uIdx];
        const diTre = Math.random() < 0.1; // 10% đi trễ
        const checkIn = diTre ? `08:${String(rand(5, 25)).padStart(2, "0")}` : `07:${rand(45, 59)}`;
        const checkOut = `17:${rand(30, 50)}`;

        luongDocs.push({
          ma_nv: u.tai_khoan,
          user_id: userIds[uIdx],
          ngay_thang: ngayDate,
          gio_check_in: checkIn,
          gio_check_out: checkOut,
          di_tre: diTre,
          so_gio_lam: 8,
          ghi_chu: diTre ? "Đi trễ do tắc đường" : "Đi làm đầy đủ",
          trang_thai: "active",
          created_at: ngayDate,
          updated_at: ngayDate
        });
      }
    }
    await db.collection("luong").insertMany(luongDocs);
    console.log(`✅  Inserted ${luongDocs.length} bản ghi chấm công vào [luong]`);

    /* ── M. Seed Nhật ký kiểm toán ban đầu (audit_log) ───────────── */
    await db.collection("audit_log").insertOne({
      action: "SYSTEM_INIT",
      module: "SYSTEM",
      target_id: "INIT",
      description: "Khởi tạo và chuẩn hóa toàn bộ dữ liệu mẫu hệ thống SME thành công",
      user: { tai_khoan: "system", ho_ten: "Hệ Thống SME" },
      ip_address: "127.0.0.1",
      created_at: t,
    });
    console.log(`✅  12. Inserted log khởi tạo vào [audit_log]`);

    /* ── N. Tổng kết thành công ─────────────────────────────────── */
    console.log("\n╔════════════════════════════════════════════════════════════════════╗");
    console.log("║         HỆ THỐNG ĐÃ ĐƯỢC LÀM SẠCH & SEED DỮ LIỆU THÀNH CÔNG        ║");
    console.log("╠════════════════════════════════════════════════════════════════════╣");
    console.log(`║  phongban_chucvu    : ${String(phongBanDocs.length).padEnd(4)} phòng ban, 11 chức vụ                  ║`);
    console.log(`║  users              : ${String(userDocs.length).padEnd(4)} tài khoản nhân viên (pass: 123456)   ║`);
    console.log(`║  nguyen_lieu        : ${String(nlDocs.length).padEnd(4)} nguyên vật liệu nội thất              ║`);
    console.log(`║  san_pham           : ${String(spDocs.length).padEnd(4)} sản phẩm thành phẩm                 ║`);
    console.log(`║  bom_san_pham       : ${String(bomDocs.length).padEnd(4)} công thức định mức BOM               ║`);
    console.log(`║  doi_tac            : ${String(dtDocs.length).padEnd(4)} khách hàng VIP & nhà cung cấp        ║`);
    console.log(`║  don_hang           : ${String(orderBatch.length).padEnd(4)} đơn hàng (2025–2026)               ║`);
    console.log(`║  van_chuyen         : ${String(waybillBatch.length).padEnd(4)} vận đơn logistics đồng bộ 2 chiều  ║`);
    console.log(`║  so_quy             : ${String(cashbookBatch.length).padEnd(4)} phiếu thu/chi sổ quỹ                 ║`);
    console.log(`║  dieu_chinh_kho     : ${String(dckDocs.length).padEnd(4)} phiếu điều chỉnh kho chuẩn          ║`);
    console.log(`║  ecommerce_policies : 1    chính sách đa sàn (Shopee, TikTok, Laz)  ║`);
    console.log(`║  ai_settings        : 1    cấu hình AI Copilot                      ║`);
    console.log(`║  luong              : ${String(luongDocs.length).padEnd(4)} bản ghi chấm công nhân sự           ║`);
    console.log("╚════════════════════════════════════════════════════════════════════╝\n");

  } catch (err) {
    console.error("❌  Seed failed:", err);
    throw err;
  }
}

/* ─────────────────────────────────────────────
   STANDALONE EXECUTION (node seed.js)
───────────────────────────────────────────── */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const uri    = process.env.SME_DB_URI || process.env.MONGO_URI || "mongodb://admin:password123@127.0.0.1:27017/?authSource=admin";
  const forceClean = process.argv.includes("--clean") || process.argv.includes("--force");

  const standaloneClient = new MongoClient(uri);
  try {
    await standaloneClient.connect();
    await seedIfEmpty(standaloneClient, forceClean);
  } catch (err) {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  } finally {
    await standaloneClient.close();
    console.log("🔒  MongoDB connection closed.");
  }
}
