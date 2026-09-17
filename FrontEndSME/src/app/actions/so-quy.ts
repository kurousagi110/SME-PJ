"use server";

import { http } from "@/lib/http";

export interface SoQuyItem {
  _id: string;
  ma_phieu: string;
  loai_phieu: "thu" | "chi";
  hang_muc: string;
  so_tien: number;
  phuong_thuc: "tien_mat" | "chuyen_khoan";
  doi_tuong: {
    loai?: string;
    ten?: string;
    so_dien_thoai?: string;
    dia_chi?: string;
  };
  ma_chung_tu?: string;
  ngay_ghi_nhan: string;
  nguoi_tao?: {
    user_id?: string;
    ho_ten?: string;
  };
  ghi_chu?: string;
  trang_thai: "active" | "cancelled";
  ly_do_huy?: string;
  created_at?: string;
}

export interface TongQuanSoQuy {
  tong_thu: number;
  tong_chi: number;
  ton_quy: number;
  ton_tien_mat: number;
  ton_chuyen_khoan: number;
}

export interface CongNoItem {
  ma_dh: string;
  khach_hang?: string;
  nha_cung_cap?: string;
  so_dien_thoai?: string;
  ngay_dat: string;
  tong_tien: number;
  da_thanh_toan?: number;
  da_chi?: number;
  con_lai: number;
  trang_thai_cong_no: "da_thanh_toan" | "thanh_toan_mot_phan" | "chua_thanh_toan";
  trang_thai_don: string;
}

export interface CongNoResponse {
  khach_hang: {
    items: CongNoItem[];
    tong_phai_thu: number;
    tong_da_thu: number;
    tong_con_phai_thu: number;
  };
  nha_cung_cap: {
    items: CongNoItem[];
    tong_phai_tra: number;
    tong_da_tra: number;
    tong_con_phai_tra: number;
  };
}

export async function fetchSoQuyAction(params?: {
  loai_phieu?: string;
  hang_muc?: string;
  phuong_thuc?: string;
  tu_ngay?: string;
  den_ngay?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams({
    page: String(params?.page || 1),
    limit: String(params?.limit || 20),
    ...(params?.loai_phieu ? { loai_phieu: params.loai_phieu } : {}),
    ...(params?.hang_muc ? { hang_muc: params.hang_muc } : {}),
    ...(params?.phuong_thuc ? { phuong_thuc: params.phuong_thuc } : {}),
    ...(params?.tu_ngay ? { tu_ngay: params.tu_ngay } : {}),
    ...(params?.den_ngay ? { den_ngay: params.den_ngay } : {}),
    ...(params?.search ? { search: params.search } : {}),
  });

  try {
    const res: any = await http.get(`/so-quy?${q.toString()}`);
    return {
      success: true,
      items: (res?.data?.items || []) as SoQuyItem[],
      pagination: res?.data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  } catch (err: any) {
    throw new Error(err?.message || "Lấy danh sách sổ quỹ thất bại");
  }
}

export async function fetchTongQuanSoQuyAction() {
  try {
    const res: any = await http.get("/so-quy/tong-quan");
    return {
      success: true,
      data: (res?.data || {
        tong_thu: 0,
        tong_chi: 0,
        ton_quy: 0,
        ton_tien_mat: 0,
        ton_chuyen_khoan: 0,
      }) as TongQuanSoQuy,
    };
  } catch (err: any) {
    throw new Error(err?.message || "Lấy tổng quan sổ quỹ thất bại");
  }
}

export async function fetchCongNoAction() {
  try {
    const res: any = await http.get("/so-quy/cong-no");
    return {
      success: true,
      data: res?.data as CongNoResponse,
    };
  } catch (err: any) {
    throw new Error(err?.message || "Lấy danh sách công nợ thất bại");
  }
}

export async function taoPhieuAction(payload: {
  loai_phieu: "thu" | "chi";
  hang_muc?: string;
  so_tien: number;
  phuong_thuc?: "tien_mat" | "chuyen_khoan";
  doi_tuong?: {
    loai?: string;
    ten?: string;
    so_dien_thoai?: string;
    dia_chi?: string;
  };
  ma_chung_tu?: string;
  ngay_ghi_nhan?: string;
  ghi_chu?: string;
}) {
  try {
    const res: any = await http.post("/so-quy", payload);
    return { success: true, data: res?.data };
  } catch (err: any) {
    throw new Error(err?.message || "Tạo phiếu thu/chi thất bại");
  }
}

export async function huyPhieuAction(id: string, ly_do?: string) {
  try {
    const res: any = await http.put(`/so-quy/${id}/huy`, { ly_do });
    return { success: true, data: res?.data };
  } catch (err: any) {
    throw new Error(err?.message || "Hủy phiếu thất bại");
  }
}
