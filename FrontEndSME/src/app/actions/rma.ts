"use server";

import { http } from "@/lib/http";

export interface RmaItem {
  san_pham_id?: string;
  ma_sp: string;
  ten_sp: string;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  qc_result?: "nhap_lai_kho" | "phe_pham" | "can_sua_chua" | null;
}

export interface ReturnOrder {
  _id: string;
  ma_rma: string;
  ma_dh: string;
  order_id?: string;
  khach_hang: {
    ten: string;
    so_dien_thoai: string;
  };
  ly_do: string;
  san_pham: RmaItem[];
  tong_tien_hoan: number;
  phuong_an_hoan_tien: "debt_offset" | "cash_refund" | "bank_refund" | "store_credit";
  trang_thai: "pending" | "qc_processing" | "completed" | "rejected";
  ma_phieu_chi?: string | null;
  ghi_chu?: string;
  ghi_chu_qc?: string;
  created_by?: {
    user_id?: string;
    ho_ten?: string;
  };
  processed_by?: {
    user_id?: string;
    ho_ten?: string;
  };
  created_at: string;
  updated_at: string;
}

export async function fetchRmaListAction(params?: {
  trang_thai?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const searchParams = new URLSearchParams();
    if (params?.trang_thai) searchParams.set("trang_thai", params.trang_thai);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const q = searchParams.toString();
    const res: any = await http.get(`/doi-tra${q ? `?${q}` : ""}`);
    return {
      success: true,
      data: res?.data?.items || [],
      pagination: {
        page: res?.data?.page || 1,
        limit: res?.data?.limit || 20,
        total: res?.data?.total || 0,
        totalPages: res?.data?.totalPages || 1,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: err.message || "Không thể tải danh sách phiếu đổi trả",
    };
  }
}

export async function fetchRmaDetailAction(ma_rma: string) {
  try {
    const res: any = await http.get(`/doi-tra/${ma_rma}`);
    return {
      success: true,
      data: res?.data as ReturnOrder,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Không thể tải chi tiết phiếu đổi trả",
    };
  }
}

export async function createRmaAction(payload: {
  ma_dh: string;
  ly_do: string;
  san_pham: Array<{
    san_pham_id?: string;
    ma_sp: string;
    ten_sp: string;
    so_luong: number;
    don_gia: number;
  }>;
  phuong_an_hoan_tien?: string;
  ghi_chu?: string;
}) {
  try {
    const res: any = await http.post("/doi-tra", payload);
    return {
      success: true,
      data: res?.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Tạo yêu cầu đổi trả thất bại",
    };
  }
}

export async function processRmaQcAction(
  ma_rma: string,
  payload: {
    qc_details: Array<{
      ma_sp: string;
      qc_result: "nhap_lai_kho" | "phe_pham" | "can_sua_chua";
    }>;
    ghi_chu_qc?: string;
  }
) {
  try {
    const res: any = await http.post(`/doi-tra/${ma_rma}/qc-complete`, payload);
    return {
      success: true,
      data: res?.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Xử lý kiểm định QC thất bại",
    };
  }
}
