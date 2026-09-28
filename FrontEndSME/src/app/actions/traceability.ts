"use server";

import { http } from "@/lib/http";

export interface ProductionLot {
  _id: string;
  ma_lo: string;
  san_pham_id: string;
  ten_sp: string;
  ma_sp: string;
  so_luong_sx: number;
  bom_snapshot?: Array<{
    nguyen_lieu_id: string;
    so_luong: number;
    ty_le_hao_hut?: number;
    don_gia?: number;
  }>;
  nguyen_lieu_used?: Array<{
    nguyen_lieu_id: string;
    qty_need: number;
    don_gia: number;
  }>;
  unit_cost: number;
  total_cost: number;
  qc_status: "passed" | "failed" | "pending";
  ghi_chu?: string;
  created_at: string;
}

export async function fetchLotsAction(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const q = searchParams.toString();
    const res: any = await http.get(`/san-xuat/lots${q ? `?${q}` : ""}`);
    return {
      success: true,
      data: (res?.data || []) as ProductionLot[],
      pagination: res?.pagination || {
        page: 1,
        limit: 20,
        total: (res?.data || []).length,
        totalPages: 1,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: err.message || "Không thể tải danh sách lô sản xuất",
    };
  }
}

export async function fetchLotDetailAction(ma_lo: string) {
  try {
    const res: any = await http.get(`/san-xuat/lots/${ma_lo}`);
    return {
      success: true,
      data: res?.data as ProductionLot,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Không tìm thấy thông tin lô hàng",
    };
  }
}
