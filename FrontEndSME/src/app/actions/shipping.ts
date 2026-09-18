"use server";

import { http } from "@/lib/http";

export interface ShipmentItem {
  _id: string;
  ma_van_don: string;
  ma_don_hang: string;
  don_vi_van_chuyen: string;
  nguoi_gui: {
    ten: string;
    sdt: string;
    dia_chi: string;
  };
  nguoi_nhan: {
    ten: string;
    sdt: string;
    dia_chi: string;
  };
  tien_thu_ho_cod: number;
  phi_van_chuyen: number;
  nguoi_tra_phi: "shop" | "khach";
  trong_luong_gram: number;
  san_pham: Array<{
    ten_sp?: string;
    so_luong?: number;
    don_vi?: string;
    don_gia?: number;
  }>;
  ghi_chu: string;
  trang_thai: "cho_dong_goi" | "da_ban_giao" | "dang_giao" | "giao_thanh_cong" | "chuyen_hoan";
  lich_su_trang_thai?: Array<{
    trang_thai: string;
    thoi_gian: string;
    ghi_chu?: string;
    vi_tri?: string;
    nguoi_thuc_hien?: string;
  }>;
  ngay_tao: string;
  ngay_cap_nhat?: string;
  ngay_giao_thanh_cong?: string;
}

export interface ShippingOverview {
  tong_so: number;
  cho_dong_goi: number;
  da_ban_giao: number;
  dang_giao: number;
  giao_thanh_cong: number;
  chuyen_hoan: number;
  tong_tien_cod: number;
  cod_da_thu: number;
  ty_le_thanh_cong: number;
}

export async function fetchShippingOverviewAction(): Promise<ShippingOverview | null> {
  try {
    const res = await http.get<{ success: boolean; data: ShippingOverview }>("/van-chuyen/tong-quan");
    return res?.data || null;
  } catch (err) {
    console.error("fetchShippingOverviewAction error", err);
    return null;
  }
}

export async function fetchShipmentsAction(params: {
  trang_thai?: string;
  don_vi?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: ShipmentItem[]; pagination: any } | null> {
  try {
    const query = new URLSearchParams();
    if (params.trang_thai && params.trang_thai !== "all") query.set("trang_thai", params.trang_thai);
    if (params.don_vi && params.don_vi !== "all") query.set("don_vi", params.don_vi);
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const res = await http.get<{ success: boolean; data: { data: ShipmentItem[]; pagination: any } }>(
      `/van-chuyen?${query.toString()}`
    );
    return res?.data || null;
  } catch (err) {
    console.error("fetchShipmentsAction error", err);
    return null;
  }
}

export async function createShipmentAction(payload: {
  ma_don_hang: string;
  don_vi_van_chuyen: string;
  nguoi_nhan: { ten: string; sdt: string; dia_chi: string };
  tien_thu_ho_cod?: number;
  phi_van_chuyen?: number;
  nguoi_tra_phi?: "shop" | "khach";
  trong_luong_gram?: number;
  san_pham?: any[];
  ghi_chu?: string;
}) {
  try {
    const res = await http.post<{ success: boolean; data: any }>("/van-chuyen", payload);
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, message: err?.response?.data?.message || err.message };
  }
}

export async function updateShipmentStatusAction(id: string, payload: {
  trang_thai: string;
  ghi_chu?: string;
  vi_tri?: string;
}) {
  try {
    const res = await http.put<{ success: boolean }>(`/van-chuyen/${id}/trang-thai`, payload);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.response?.data?.message || err.message };
  }
}
