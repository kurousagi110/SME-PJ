"use server";

import { http } from "@/lib/http";

export interface DoiTacItem {
  _id: string;
  ma_doi_tac: string;
  loai_doi_tac: "khach_hang" | "nha_cung_cap" | "ca_hai";
  ten: string;
  so_dien_thoai: string;
  email: string;
  dia_chi: string;
  ma_so_thue: string;
  nhom: "vip" | "khach_buon" | "khach_le" | "chinh" | "phu";
  ghi_chu: string;
  trang_thai: "active" | "inactive";
  tong_don?: number;
  tong_gia_tri?: number;
  da_thanh_toan?: number;
  cong_no?: number;
  created_at?: string;
}

export interface TongQuanCRM {
  tong_khach_hang: number;
  khach_hang_vip: number;
  tong_nha_cung_cap: number;
  tong_doanh_so_ltv: number;
}

export interface ChiTietDoiTacResponse {
  partner: DoiTacItem;
  stats: {
    tong_don: number;
    tong_gia_tri: number;
  };
  orders: any[];
  receipts: any[];
}

export async function fetchDoiTacAction(params?: {
  loai_doi_tac?: string;
  nhom?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams({
    page: String(params?.page || 1),
    limit: String(params?.limit || 50),
    ...(params?.loai_doi_tac ? { loai_doi_tac: params.loai_doi_tac } : {}),
    ...(params?.nhom ? { nhom: params.nhom } : {}),
    ...(params?.search ? { search: params.search } : {}),
  });

  try {
    const res: any = await http.get(`/doi-tac?${q.toString()}`);
    return {
      success: true,
      items: (res?.data?.items || []) as DoiTacItem[],
      pagination: res?.data?.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 },
    };
  } catch (err: any) {
    throw new Error(err?.message || "Lấy danh sách đối tác thất bại");
  }
}

export async function fetchTongQuanCRMAction() {
  try {
    const res: any = await http.get("/doi-tac/tong-quan");
    return {
      success: true,
      data: (res?.data || {
        tong_khach_hang: 0,
        khach_hang_vip: 0,
        tong_nha_cung_cap: 0,
        tong_doanh_so_ltv: 0,
      }) as TongQuanCRM,
    };
  } catch (err: any) {
    throw new Error(err?.message || "Lấy tổng quan CRM thất bại");
  }
}

export async function fetchChiTietDoiTacAction(id: string) {
  try {
    const res: any = await http.get(`/doi-tac/${id}`);
    return {
      success: true,
      data: res?.data as ChiTietDoiTacResponse,
    };
  } catch (err: any) {
    throw new Error(err?.message || "Lấy chi tiết đối tác thất bại");
  }
}

export async function taoDoiTacAction(payload: {
  ma_doi_tac?: string;
  loai_doi_tac: "khach_hang" | "nha_cung_cap" | "ca_hai";
  ten: string;
  so_dien_thoai?: string;
  email?: string;
  dia_chi?: string;
  ma_so_thue?: string;
  nhom?: string;
  ghi_chu?: string;
}) {
  try {
    const res: any = await http.post("/doi-tac", payload);
    return { success: true, data: res?.data };
  } catch (err: any) {
    throw new Error(err?.message || "Tạo đối tác thất bại");
  }
}

export async function capNhatDoiTacAction(
  id: string,
  payload: Record<string, any>
) {
  try {
    const res: any = await http.put(`/doi-tac/${id}`, payload);
    return { success: true, data: res?.data };
  } catch (err: any) {
    throw new Error(err?.message || "Cập nhật đối tác thất bại");
  }
}

export async function xoaDoiTacAction(id: string) {
  try {
    const res: any = await http.delete(`/doi-tac/${id}`);
    return { success: true, data: res?.data };
  } catch (err: any) {
    throw new Error(err?.message || "Xóa đối tác thất bại");
  }
}
