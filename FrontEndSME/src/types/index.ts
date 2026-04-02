// ─────────────────────────────────────────────────────────────────────────────
// SME — Shared TypeScript types
// Mirrors backend MongoDB document shapes (camelCase → Vietnamese field names)
// ─────────────────────────────────────────────────────────────────────────────

/* ── API envelope ─────────────────────────────────────────────────────────── */

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}

/* ── Lookup / reference ───────────────────────────────────────────────────── */

export interface Department {
  _id: string;
  ma_pb: string;
  ten: string;
}

export interface Position {
  _id: string;
  ma_cv: string;
  ten: string;
}

/* ── Product (san_pham) ───────────────────────────────────────────────────── */

export interface BOMLineItem {
  nguyen_lieu_id: string;
  ma_nl?: string;
  ten?: string;
  ten_nl?: string;
  don_vi?: string;
  so_luong?: number;
  dinh_muc?: number;
  qty: number;
  unit: string;
  waste_rate?: number;
}

export interface Product {
  _id: string;
  ma_sp: string;
  ten_sp: string;
  don_vi: string;
  gia_ban: number;
  gia_nhap?: number;
  ton_kho: number;
  trang_thai: "active" | "inactive" | "deleted";
  nguyen_lieu?: BOMLineItem[];
  ghi_chu?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductListParams {
  name?: string;
  status?: string;
  page: number;
  limit: number;
}

/* ── Material (nguyen_lieu) ───────────────────────────────────────────────── */

export interface Material {
  _id: string;
  ma_nl: string;
  ten_nl: string;
  don_vi: string;
  gia_nhap: number;
  ton_kho: number;
  trang_thai: "active" | "inactive" | "deleted";
  ghi_chu?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaterialListParams {
  name?: string;
  page: number;
  limit: number;
}

/* ── BOM (bom_san_pham) ───────────────────────────────────────────────────── */

export interface BOM {
  _id?: string;
  san_pham_id: string;
  items: BOMLineItem[];
  ghi_chu?: string;
  createAt?: string;
  updateAt?: string;
}

export interface BOMSetPayload {
  ghi_chu?: string;
  items: Array<{
    nguyen_lieu_id: string;
    qty: number;
    unit: string;
    waste_rate?: number;
  }>;
}

export interface UnitCost {
  unitCost: number;
}

/* ── Order (don_hang) ─────────────────────────────────────────────────────── */

export type OrderType = "SALE" | "PURCHASE" | "PRODUCTION" | "PURCHASE_RECEIPT" | "PROD_RECEIPT";
export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface OrderLineItem {
  san_pham_id?: string;
  nguyen_lieu_id?: string;
  ten_sp?: string;
  ten_nl?: string;
  so_luong: number;
  don_gia: number;
  thanh_tien?: number;
}

export interface Order {
  _id: string;
  ma_don: string;
  loai_don: OrderType;
  trang_thai: OrderStatus;
  khach_hang_ten?: string;
  nha_cung_cap_ten?: string;
  san_pham: OrderLineItem[];
  tong_tien: number;
  ghi_chu?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderListParams {
  customer_name?: string;
  status?: string;
  type?: string;
  page: number;
  limit: number;
}

export interface OrderCreatePayload {
  loai_don: OrderType;
  khach_hang_ten?: string;
  nha_cung_cap_ten?: string;
  san_pham: OrderLineItem[];
  ghi_chu?: string;
}

export interface OrderStatusPayload {
  trang_thai: OrderStatus;
  ghi_chu?: string;
}

/* ── Staff (nhan_vien) ────────────────────────────────────────────────────── */

export interface Staff {
  _id: string;
  ma_nv: string;
  ho_ten: string;
  email?: string;
  so_dien_thoai?: string;
  phong_ban?: Department;
  chuc_vu?: Position;
  he_so_luong?: number;
  trang_thai: "active" | "inactive";
  createdAt?: string;
}

export interface StaffListParams {
  name?: string;
  page: number;
  limit: number;
  department?: string;
  position?: string;
}

/* ── User / Auth ──────────────────────────────────────────────────────────── */

export interface User {
  _id: string;
  ma_nv?: string;
  ten_tai_khoan: string;
  quyen: string;
  phong_ban?: Department;
}

export interface LoginPayload {
  ten_tai_khoan: string;
  mat_khau: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

/* ── Attendance (cham_cong) ───────────────────────────────────────────────── */

export interface CheckIn {
  _id: string;
  ma_nv: string;
  ho_ten?: string;
  ngay: string;
  gio_vao?: string;
  gio_ra?: string;
  gio_lam?: number;
}

/* ── Payroll (luong) ──────────────────────────────────────────────────────── */

export interface PayrollRecord {
  ma_nv: string;
  ho_ten?: string;
  thang: number;
  nam: number;
  he_so_luong: number;
  gio_lam: number;
  luong: number;
}

/* ── Generic query helpers ────────────────────────────────────────────────── */

export interface PaginationParams {
  page: number;
  limit: number;
  q?: string;
}

export type SortDir = "asc" | "desc";

export interface SortParams {
  sortBy?: string;
  sortDir?: SortDir;
}
