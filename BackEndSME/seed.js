/**
 * seed.js — SME Database Seed Script
 *
 * Populates: phongban_chucvu, users, nguyen_lieu, san_pham, bom_san_pham, don_hang
 *
 * Usage:
 *   npm run seed
 *   (or) node seed.js
 *
 * Requires .env with SME_DB_URI (or MONGO_URI) and SME_DB_NAME.
 */

import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();


/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function genOrderCode(prefix = "DH") {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

function now() { return new Date(); }

/* ─────────────────────────────────────────────
   PHASE 2.3 — Departments + Roles Data
   Schema: phongban_chucvu collection
   Each document = 1 department with embedded chuc_vu array
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
   PHASE 2.5 — Users (one per every role)
   - tai_khoan: username
   - mat_khau: bcrypt(password, SALT_ROUNDS=12)
   - chuc_vu embedded: { ten, mo_ta, heSoluong }
   - phong_ban embedded: { ten, mo_ta }
───────────────────────────────────────────── */
async function buildUserDocs(hashedPw) {
  const t = now();
  // hashedPw: bcrypt hash of "123456"

  return [
    /* 1 — Giám đốc */
    {
      ho_ten: "Nguyễn Văn Admin",
      ngay_sinh: new Date("1975-03-15"),
      tai_khoan: "admin",
      mat_khau: hashedPw,
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
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng kinh doanh",      mo_ta: "Quản lý bán hàng, chăm sóc khách hàng" },
      chuc_vu:   { ten: "Nhân viên kinh doanh",  mo_ta: "Xử lý đơn hàng, tư vấn bán hàng", heSoluong: 2.0 },
      createAt: t, updateAt: t,
    },
    /* 4 — Kế toán trưởng */
    {
      ho_ten: "Phạm Thị Kế Toán",
      ngay_sinh: new Date("1982-04-10"),
      tai_khoan: "ketoantr",
      mat_khau: hashedPw,
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng kế toán",  mo_ta: "Quản lý tài chính, kế toán doanh nghiệp" },
      chuc_vu:   { ten: "Kế toán trưởng", mo_ta: "Phụ trách tổng hợp kế toán", heSoluong: 3.0 },
      createAt: t, updateAt: t,
    },
    /* 5 — Nhân viên kế toán */
    {
      ho_ten: "Hoàng Văn Kế Toán",
      ngay_sinh: new Date("1997-02-14"),
      tai_khoan: "ketoan",
      mat_khau: hashedPw,
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
      trang_thai: 1,
      tokens: [],
      phong_ban: { ten: "Phòng sản xuất",      mo_ta: "Quản lý dây chuyền sản xuất, chế biến sản phẩm" },
      chuc_vu:   { ten: "Công nhân sản xuất",  mo_ta: "Trực tiếp sản xuất sản phẩm", heSoluong: 1.5 },
      createAt: t, updateAt: t,
    },
  ];
}

/* ─────────────────────────────────────────────
   PHASE 2.6 — Materials (nguyen_lieu)
   10 realistic Vietnamese wood/furniture factory materials
───────────────────────────────────────────── */
function buildNguyenLieuDocs() {
  const active = "active";
  const t = now();
  return [
    { ma_nl: "NL001", ten_nl: "Gỗ MDF 18mm",             don_vi: "tấm",   gia_nhap: 350000, so_luong: 200, ton_toi_thieu: 20, mo_ta: "Tấm gỗ MDF dày 18mm, kích thước 1220x2440mm",  thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL002", ten_nl: "Gỗ MDF 12mm",             don_vi: "tấm",   gia_nhap: 280000, so_luong: 150, ton_toi_thieu: 15, mo_ta: "Tấm gỗ MDF dày 12mm, kích thước 1220x2440mm",  thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL003", ten_nl: "Ván HDF 6mm",              don_vi: "tấm",   gia_nhap: 180000, so_luong: 120, ton_toi_thieu: 15, mo_ta: "Tấm ván HDF dày 6mm dùng làm đáy/lưng tủ",     thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL004", ten_nl: "Sơn nước trắng",           don_vi: "lít",   gia_nhap:  85000, so_luong:  80, ton_toi_thieu: 10, mo_ta: "Sơn nước nội thất màu trắng, bóng mờ",          thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL005", ten_nl: "Keo dán gỗ PVA",           don_vi: "kg",    gia_nhap:  45000, so_luong: 100, ton_toi_thieu: 10, mo_ta: "Keo dán gỗ PVA D3 chịu nước trung bình",        thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL006", ten_nl: "Bản lề inox 4 tấc",        don_vi: "cái",   gia_nhap:  12000, so_luong: 500, ton_toi_thieu: 50, mo_ta: "Bản lề inox SUS304 kích thước 4 tấc",           thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL007", ten_nl: "Tay nắm tủ D-36",          don_vi: "cái",   gia_nhap:  25000, so_luong: 300, ton_toi_thieu: 30, mo_ta: "Tay nắm tủ hợp kim nhôm D-36, lỗ 128mm",       thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL008", ten_nl: "Đinh vít gỗ 3.5x40mm",     don_vi: "hộp",   gia_nhap:  35000, so_luong: 150, ton_toi_thieu: 20, mo_ta: "Đinh vít mũi khoan gỗ 3.5x40mm, hộp 200 cái",  thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL009", ten_nl: "Giấy nhám hạt P180",       don_vi: "tờ",    gia_nhap:   5000, so_luong: 400, ton_toi_thieu: 50, mo_ta: "Giấy nhám hạt P180 dùng cho bề mặt gỗ mịn",    thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
    { ma_nl: "NL010", ten_nl: "Kính cường lực 5mm",        don_vi: "m²",    gia_nhap: 450000, so_luong:  30, ton_toi_thieu:  5, mo_ta: "Kính cường lực trong suốt dày 5mm",              thuoc_tinh: {}, trang_thai: active, createAt: t, updateAt: t },
  ];
}

/* ─────────────────────────────────────────────
   PHASE 2.7 — Products (san_pham)
   10 realistic furniture products with embedded BOM preview
───────────────────────────────────────────── */
function buildSanPhamDocs() {
  const active = "active";
  const t = now();
  return [
    {
      ma_sp: "SP001", ten_sp: "Bàn làm việc MDF",       don_gia: 2500000, so_luong: 25, mo_ta: "Bàn làm việc MDF phủ melamine trắng, kích thước 120x60x75cm",
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
      ma_sp: "SP002", ten_sp: "Tủ quần áo 3 cánh",     don_gia: 4800000, so_luong: 12, mo_ta: "Tủ quần áo 3 cánh MDF phủ melamine, kích thước 180x55x210cm",
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
      ma_sp: "SP003", ten_sp: "Kệ sách 5 tầng",        don_gia: 1800000, so_luong: 30, mo_ta: "Kệ sách 5 tầng MDF trắng, kích thước 80x30x175cm",
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
      ma_sp: "SP004", ten_sp: "Ghế văn phòng",          don_gia: 1200000, so_luong: 40, mo_ta: "Ghế văn phòng khung MDF, đệm vải, có bánh xe",
      nguyen_lieu: [
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 1,   don_vi: "tấm" },
        { ma_nl: "NL008", ten: "Đinh vít gỗ 3.5x40mm",so_luong: 1,   don_vi: "hộp" },
        { ma_nl: "NL009", ten: "Giấy nhám hạt P180",  so_luong: 1,   don_vi: "tờ"  },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP005", ten_sp: "Tủ bếp dưới",            don_gia: 3500000, so_luong: 8, mo_ta: "Tủ bếp phần dưới MDF chống ẩm, kích thước 100x55x80cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 4,   don_vi: "tấm" },
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 1.5, don_vi: "lít" },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",      so_luong: 0.8, don_vi: "kg"  },
        { ma_nl: "NL006", ten: "Bản lề inox 4 tấc",   so_luong: 4,   don_vi: "cái" },
        { ma_nl: "NL007", ten: "Tay nắm tủ D-36",     so_luong: 4,   don_vi: "cái" },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP006", ten_sp: "Bàn ăn 6 chỗ",           don_gia: 3200000, so_luong: 10, mo_ta: "Bàn ăn 6 chỗ ngồi MDF, mặt kính cường lực 5mm, 140x80x75cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",          so_luong: 4,   don_vi: "tấm" },
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",          so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",        so_luong: 1.5, don_vi: "lít" },
        { ma_nl: "NL010", ten: "Kính cường lực 5mm",    so_luong: 0.5, don_vi: "m²"  },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",        so_luong: 0.8, don_vi: "kg"  },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP007", ten_sp: "Giường ngủ 1m6",          don_gia: 4200000, so_luong: 6, mo_ta: "Giường ngủ đôi 1600x2000mm MDF phủ melamine vân gỗ",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 6,   don_vi: "tấm" },
        { ma_nl: "NL003", ten: "Ván HDF 6mm",         so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 2,   don_vi: "lít" },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",      so_luong: 1.2, don_vi: "kg"  },
        { ma_nl: "NL008", ten: "Đinh vít gỗ 3.5x40mm",so_luong: 2,   don_vi: "hộp" },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP008", ten_sp: "Kệ TV treo tường",        don_gia: 2100000, so_luong: 18, mo_ta: "Kệ TV treo tường MDF trắng, kích thước 160x30x50cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 2,   don_vi: "tấm" },
        { ma_nl: "NL002", ten: "Gỗ MDF 12mm",        so_luong: 1,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 0.8, don_vi: "lít" },
        { ma_nl: "NL005", ten: "Keo dán gỗ PVA",      so_luong: 0.3, don_vi: "kg"  },
        { ma_nl: "NL009", ten: "Giấy nhám hạt P180",  so_luong: 2,   don_vi: "tờ"  },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP009", ten_sp: "Tủ đầu giường",           don_gia: 1500000, so_luong: 22, mo_ta: "Tủ đầu giường 1 ngăn kéo MDF, kích thước 45x38x55cm",
      nguyen_lieu: [
        { ma_nl: "NL001", ten: "Gỗ MDF 18mm",        so_luong: 1,   don_vi: "tấm" },
        { ma_nl: "NL003", ten: "Ván HDF 6mm",         so_luong: 1,   don_vi: "tấm" },
        { ma_nl: "NL004", ten: "Sơn nước trắng",      so_luong: 0.4, don_vi: "lít" },
        { ma_nl: "NL006", ten: "Bản lề inox 4 tấc",   so_luong: 2,   don_vi: "cái" },
        { ma_nl: "NL007", ten: "Tay nắm tủ D-36",     so_luong: 2,   don_vi: "cái" },
      ],
      trang_thai: active, createAt: t, updateAt: t,
    },
    {
      ma_sp: "SP010", ten_sp: "Bàn trang điểm",          don_gia: 2800000, so_luong: 14, mo_ta: "Bàn trang điểm MDF gương tích hợp, 90x45x145cm",
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
   EXPORTED SEED FUNCTION (accepts existing client)
───────────────────────────────────────────── */
export async function seedIfEmpty(client) {
  const dbName = process.env.SME_DB_NAME;
  if (!dbName) throw new Error("Missing env: SME_DB_NAME");

  const db = client.db(dbName);

  /* Skip if data already exists */
  const userCount = await db.collection("users").countDocuments();
  if (userCount > 0) {
    console.log(`⏭️   Seed skipped — users collection already has ${userCount} documents`);
    return;
  }

  console.log(`🌱  Seeding database: ${dbName}`);

  try {
    /* ── Clear collections ──────────────────────────────────── */
    const COLLECTIONS = ["phongban_chucvu", "users", "nguyen_lieu", "san_pham", "bom_san_pham", "don_hang", "dieu_chinh_kho"];
    for (const col of COLLECTIONS) {
      const result = await db.collection(col).deleteMany({});
      console.log(`🗑️   Cleared [${col}] — ${result.deletedCount} documents removed`);
    }

    /* ── 2.3  Departments + Roles ────────────────────────────────── */
    const phongBanDocs = buildPhongBanDocs();
    const pbResult = await db.collection("phongban_chucvu").insertMany(phongBanDocs);
    console.log(`✅  Inserted ${Object.keys(pbResult.insertedIds).length} departments into [phongban_chucvu]`);

    /* ── 2.5  Users ──────────────────────────────────────────────── */
    console.log("🔐  Hashing password '123456' with bcrypt (saltRounds=10) …");
    const hashedPassword = await bcrypt.hash('123456', 10);
    const hashedPw = hashedPassword;

    const userDocs = await buildUserDocs(hashedPw);
    const usersResult = await db.collection("users").insertMany(userDocs);
    const insertedUserIds = usersResult.insertedIds; // { 0: ObjectId, 1: ObjectId, … }
    console.log(`✅  Inserted ${Object.keys(insertedUserIds).length} users into [users]`);
    console.log("    Users created:");
    userDocs.forEach((u) => console.log(`      • ${u.tai_khoan.padEnd(14)} → ${u.phong_ban.ten} / ${u.chuc_vu.ten}`));

    /* ── 2.6  Materials ──────────────────────────────────────────── */
    const nlDocs = buildNguyenLieuDocs();
    const nlResult = await db.collection("nguyen_lieu").insertMany(nlDocs);
    const nlIds = nlResult.insertedIds; // index → ObjectId
    // Build lookup: ma_nl → ObjectId
    const nlById = {};
    nlDocs.forEach((nl, i) => { nlById[nl.ma_nl] = nlIds[i]; });
    console.log(`✅  Inserted ${nlDocs.length} materials into [nguyen_lieu]`);

    /* ── 2.7  Products ───────────────────────────────────────────── */
    const spDocs = buildSanPhamDocs();
    const spResult = await db.collection("san_pham").insertMany(spDocs);
    const spIds = spResult.insertedIds;
    // Build lookup: ma_sp → ObjectId
    const spById = {};
    spDocs.forEach((sp, i) => { spById[sp.ma_sp] = spIds[i]; });
    console.log(`✅  Inserted ${spDocs.length} products into [san_pham]`);

    /* ── 2.8  BOM (bom_san_pham) ─────────────────────────────────── */
    // Link 4 products → their materials using real ObjectIds
    // Schema: { san_pham_id: ObjectId, items: [{ nguyen_lieu_id, qty, unit, waste_rate }], ghi_chu, createAt, updateAt }
    const t = now();
    const bomDocs = [
      /* BOM 1: Bàn làm việc MDF */
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
      /* BOM 2: Tủ quần áo 3 cánh */
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
      /* BOM 3: Kệ sách 5 tầng */
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
      /* BOM 4: Bàn ăn 6 chỗ */
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
    console.log(`✅  Inserted ${bomDocs.length} BOMs into [bom_san_pham]`);
    bomDocs.forEach((b, i) => {
      const spCode = ["SP001","SP002","SP003","SP006"][i];
      console.log(`      • BOM for ${spCode} — ${b.items.length} ingredients`);
    });

    /* ── 2.9  Orders (don_hang) ──────────────────────────────────── */
    // nguoi_lap_id: use admin user (index 0) and sale user (index 2)
    const adminId = insertedUserIds[0];
    const saleId  = insertedUserIds[2]; // "sale" user

    const orders = [
      /* Order 1: SALE — draft */
      {
        ma_dh: genOrderCode("DH"),
        loai_don: "sale",
        trang_thai: "draft",
        khach_hang_ten: "Công ty TNHH Nội Thất Bình An",
        nguoi_lap_id: saleId,
        ngay_dat: new Date("2026-03-10"),
        san_pham: [
          { loai_hang: "san_pham", san_pham_id: spById["SP001"], ma_sp: "SP001", ten_sp: "Bàn làm việc MDF",   don_vi: "cái", don_gia: 2500000, so_luong: 5,  thuoc_tinh: {}, thanh_tien: 12500000 },
          { loai_hang: "san_pham", san_pham_id: spById["SP003"], ma_sp: "SP003", ten_sp: "Kệ sách 5 tầng",     don_vi: "cái", don_gia: 1800000, so_luong: 3,  thuoc_tinh: {}, thanh_tien:  5400000 },
        ],
        tam_tinh: 17900000, giam_gia: 0, thue_rate: 0, thue_tien: 0, phi_vc: 200000, tong_tien: 18100000,
        ghi_chu: "Khách hàng doanh nghiệp, giao hàng thứ Sáu",
        createAt: new Date("2026-03-10"), updateAt: new Date("2026-03-10"),
      },
      /* Order 2: SALE — confirmed */
      {
        ma_dh: genOrderCode("DH"),
        loai_don: "sale",
        trang_thai: "confirmed",
        khach_hang_ten: "Anh Trần Minh Tú",
        nguoi_lap_id: saleId,
        ngay_dat: new Date("2026-03-15"),
        san_pham: [
          { loai_hang: "san_pham", san_pham_id: spById["SP007"], ma_sp: "SP007", ten_sp: "Giường ngủ 1m6",     don_vi: "cái", don_gia: 4200000, so_luong: 1,  thuoc_tinh: {}, thanh_tien:  4200000 },
          { loai_hang: "san_pham", san_pham_id: spById["SP009"], ma_sp: "SP009", ten_sp: "Tủ đầu giường",      don_vi: "cái", don_gia: 1500000, so_luong: 2,  thuoc_tinh: {}, thanh_tien:  3000000 },
        ],
        tam_tinh: 7200000, giam_gia: 200000, thue_rate: 0, thue_tien: 0, phi_vc: 150000, tong_tien: 7150000,
        ghi_chu: "Đặt phòng ngủ hoàn chỉnh, giảm 200k phí ship",
        createAt: new Date("2026-03-15"), updateAt: new Date("2026-03-16"),
      },
      /* Order 3: SALE — completed */
      {
        ma_dh: genOrderCode("DH"),
        loai_don: "sale",
        trang_thai: "completed",
        khach_hang_ten: "Chị Lê Ngọc Hân",
        nguoi_lap_id: saleId,
        ngay_dat: new Date("2026-03-01"),
        san_pham: [
          { loai_hang: "san_pham", san_pham_id: spById["SP010"], ma_sp: "SP010", ten_sp: "Bàn trang điểm",     don_vi: "cái", don_gia: 2800000, so_luong: 1,  thuoc_tinh: {}, thanh_tien:  2800000 },
          { loai_hang: "san_pham", san_pham_id: spById["SP004"], ma_sp: "SP004", ten_sp: "Ghế văn phòng",      don_vi: "cái", don_gia: 1200000, so_luong: 2,  thuoc_tinh: {}, thanh_tien:  2400000 },
        ],
        tam_tinh: 5200000, giam_gia: 0, thue_rate: 0.08, thue_tien: 416000, phi_vc: 0, tong_tien: 5616000,
        ghi_chu: "Đã giao hàng và thanh toán đủ",
        createAt: new Date("2026-03-01"), updateAt: new Date("2026-03-05"),
      },
      /* Order 4: PURCHASE_RECEIPT — confirmed */
      {
        ma_dh: genOrderCode("PN"),
        loai_don: "purchase_receipt",
        trang_thai: "confirmed",
        nha_cung_cap_ten: "Công ty Gỗ Miền Nam",
        nguoi_lap_id: adminId,
        ngay_dat: new Date("2026-03-18"),
        san_pham: [
          { loai_hang: "nguyen_lieu", nguyen_lieu_id: nlById["NL001"], ma_nl: "NL001", ten_nl: "Gỗ MDF 18mm",   don_vi: "tấm",  don_gia: 350000, so_luong: 50, thuoc_tinh: {}, thanh_tien: 17500000 },
          { loai_hang: "nguyen_lieu", nguyen_lieu_id: nlById["NL002"], ma_nl: "NL002", ten_nl: "Gỗ MDF 12mm",   don_vi: "tấm",  don_gia: 280000, so_luong: 30, thuoc_tinh: {}, thanh_tien:  8400000 },
          { loai_hang: "nguyen_lieu", nguyen_lieu_id: nlById["NL005"], ma_nl: "NL005", ten_nl: "Keo dán gỗ PVA",don_vi: "kg",   don_gia:  45000, so_luong: 20, thuoc_tinh: {}, thanh_tien:   900000 },
        ],
        tam_tinh: 26800000, giam_gia: 0, thue_rate: 0, thue_tien: 0, phi_vc: 500000, tong_tien: 27300000,
        ghi_chu: "Nhập kho tháng 3/2026 - lô đầu tiên",
        createAt: new Date("2026-03-18"), updateAt: new Date("2026-03-18"),
      },
      /* Order 5: SALE — cancelled */
      {
        ma_dh: genOrderCode("DH"),
        loai_don: "sale",
        trang_thai: "cancelled",
        khach_hang_ten: "Anh Phạm Quốc Bảo",
        nguoi_lap_id: saleId,
        ngay_dat: new Date("2026-03-20"),
        san_pham: [
          { loai_hang: "san_pham", san_pham_id: spById["SP002"], ma_sp: "SP002", ten_sp: "Tủ quần áo 3 cánh",  don_vi: "cái", don_gia: 4800000, so_luong: 2,  thuoc_tinh: {}, thanh_tien:  9600000 },
        ],
        tam_tinh: 9600000, giam_gia: 0, thue_rate: 0, thue_tien: 0, phi_vc: 300000, tong_tien: 9900000,
        ghi_chu: "Khách huỷ đơn do thay đổi thiết kế",
        createAt: new Date("2026-03-20"), updateAt: new Date("2026-03-21"),
      },
    ];

    await db.collection("don_hang").insertMany(orders);
    console.log(`✅  Inserted ${orders.length} orders into [don_hang]`);
    orders.forEach((o) => console.log(`      • ${o.ma_dh.padEnd(22)} [${o.loai_don.padEnd(16)}] → ${o.trang_thai}`));

    /* ── Điều chỉnh kho (dieu_chinh_kho) ──────────────────────────── */
    // Use actual ObjectIds from the inserted materials and products
    const thuKhoUser = userDocs.find((u) => u.chuc_vu.ten === "Thủ kho");
    const nvKhoUser  = userDocs.find((u) => u.chuc_vu.ten === "Nhân viên kho");
    const adminUser  = userDocs.find((u) => u.chuc_vu.ten === "Giám đốc");

    const dckDocs = [
      /* 1 — Chờ duyệt: nhập thêm nguyên liệu NL001 */
      {
        loai:                 "nguyen_lieu",
        item_id:              nlIds[0],          // NL001 — Gỗ MDF 18mm
        ma_hang:              "NL001",
        ten_hang:             "Gỗ MDF 18mm",
        so_luong_dieu_chinh:  15,
        ton_kho_truoc:        100,
        ly_do:                "Kiểm kê thực tế phát hiện thừa 15 tấm so với sổ sách",
        trang_thai:           "cho_duyet",
        created_by:           { tai_khoan: nvKhoUser?.tai_khoan || "nhanvienkho", ho_ten: nvKhoUser?.ho_ten || "Ngô Thị Kho" },
        approved_by:          null,
        created_at:           new Date("2026-04-01T08:30:00Z"),
        updated_at:           new Date("2026-04-01T08:30:00Z"),
      },
      /* 2 — Đã duyệt: xuất bớt sản phẩm SP002 */
      {
        loai:                 "san_pham",
        item_id:              spIds[1],          // SP002 — Tủ quần áo 3 cánh
        ma_hang:              "SP002",
        ten_hang:             "Tủ quần áo 3 cánh",
        so_luong_dieu_chinh:  -2,
        ton_kho_truoc:        20,
        ly_do:                "Hàng mẫu xuất cho showroom không qua đơn hàng",
        trang_thai:           "da_duyet",
        created_by:           { tai_khoan: nvKhoUser?.tai_khoan || "nhanvienkho", ho_ten: nvKhoUser?.ho_ten || "Ngô Thị Kho" },
        approved_by:          { tai_khoan: thuKhoUser?.tai_khoan || "thukho", ho_ten: thuKhoUser?.ho_ten || "Bùi Văn Kho" },
        created_at:           new Date("2026-03-28T09:00:00Z"),
        updated_at:           new Date("2026-03-28T10:15:00Z"),
      },
      /* 3 — Từ chối: nhập thêm nguyên liệu NL005 */
      {
        loai:                 "nguyen_lieu",
        item_id:              nlIds[4],          // NL005 — Keo dán gỗ PVA
        ma_hang:              "NL005",
        ten_hang:             "Keo dán gỗ PVA",
        so_luong_dieu_chinh:  50,
        ton_kho_truoc:        80,
        ly_do:                "Muốn tăng tồn kho dự phòng cho mùa cao điểm",
        trang_thai:           "tu_choi",
        created_by:           { tai_khoan: nvKhoUser?.tai_khoan || "nhanvienkho", ho_ten: nvKhoUser?.ho_ten || "Ngô Thị Kho" },
        approved_by:          { tai_khoan: adminUser?.tai_khoan || "admin", ho_ten: adminUser?.ho_ten || "Nguyễn Văn Admin" },
        created_at:           new Date("2026-03-25T14:00:00Z"),
        updated_at:           new Date("2026-03-25T16:30:00Z"),
      },
    ];

    await db.collection("dieu_chinh_kho").insertMany(dckDocs);
    console.log(`✅  Inserted ${dckDocs.length} adjustment requests into [dieu_chinh_kho]`);

    /* ── Summary ─────────────────────────────────────────────────── */
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║           SEED COMPLETED SUCCESSFULLY         ║");
    console.log("╠══════════════════════════════════════════════╣");
    console.log(`║  phongban_chucvu : ${String(phongBanDocs.length).padEnd(3)} departments           ║`);
    console.log(`║  users           : ${String(userDocs.length).padEnd(3)} accounts (pw: 123456) ║`);
    console.log(`║  nguyen_lieu     : ${String(nlDocs.length).padEnd(3)} materials              ║`);
    console.log(`║  san_pham        : ${String(spDocs.length).padEnd(3)} products               ║`);
    console.log(`║  bom_san_pham    : ${String(bomDocs.length).padEnd(3)} BOMs                   ║`);
    console.log(`║  don_hang        : ${String(orders.length).padEnd(3)} orders                 ║`);
    console.log(`║  dieu_chinh_kho  : ${String(dckDocs.length).padEnd(3)} adjustment requests    ║`);
    console.log("╚══════════════════════════════════════════════╝\n");

  } catch (err) {
    console.error("❌  Seed failed:", err);
    throw err;
  }
}

/* ─────────────────────────────────────────────
   STANDALONE EXECUTION (node seed.js)
───────────────────────────────────────────── */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const uri    = process.env.SME_DB_URI   || process.env.MONGO_URI;
  const dbName = process.env.SME_DB_NAME;
  if (!uri) { console.error("❌  Missing DB URI (SME_DB_URI or MONGO_URI)"); process.exit(1); }

  const standaloneClient = new MongoClient(uri);
  try {
    await standaloneClient.connect();
    await seedIfEmpty(standaloneClient);
  } catch (err) {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  } finally {
    await standaloneClient.close();
    console.log("🔒  MongoDB connection closed.");
  }
}
