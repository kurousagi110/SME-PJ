"use server";

import { http } from "@/lib/http";

export interface QuotationItem {
  san_pham_id?: string;
  ma_sp: string;
  ten_sp: string;
  don_vi: string;
  so_luong: number;
  don_gia: number;
  chiet_khau_phan_tram?: number;
  thanh_tien: number;
}

export interface Quotation {
  _id: string;
  ma_bao_gia: string;
  khach_hang: {
    ten: string;
    so_dien_thoai: string;
    email?: string;
    dia_chi?: string;
    cong_ty?: string;
  };
  ngay_bao_gia: string;
  ngay_het_han: string;
  items: QuotationItem[];
  tong_tien_truoc_ck: number;
  tong_chiet_khau: number;
  thue_vat: number;
  tien_thue_vat: number;
  tong_thanh_toan: number;
  dieu_khoan?: string;
  ghi_chu?: string;
  trang_thai: "draft" | "sent" | "accepted" | "rejected" | "converted";
  ma_don_hang?: string | null;
  created_by?: {
    user_id?: string;
    ho_ten?: string;
  };
  created_at: string;
  updated_at: string;
}

export async function fetchQuotationsAction(params?: {
  trang_thai?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const q = new URLSearchParams();
    if (params?.trang_thai) q.set("trang_thai", params.trang_thai);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));

    const res: any = await http.get(`/quotations?${q.toString()}`);
    return {
      success: true,
      data: (res?.data?.items || []) as Quotation[],
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
      error: err.message || "Không thể tải danh sách báo giá",
    };
  }
}

export async function fetchQuotationDetailAction(ma_bao_gia: string) {
  try {
    const res: any = await http.get(`/quotations/${ma_bao_gia}`);
    return {
      success: true,
      data: res?.data as Quotation,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Không tìm thấy thông tin báo giá",
    };
  }
}

export async function createQuotationAction(payload: {
  khach_hang: {
    ten: string;
    so_dien_thoai: string;
    email?: string;
    dia_chi?: string;
    cong_ty?: string;
  };
  ngay_het_han?: string;
  items: Array<{
    san_pham_id?: string;
    ma_sp: string;
    ten_sp: string;
    don_vi?: string;
    so_luong: number;
    don_gia: number;
    chiet_khau_phan_tram?: number;
  }>;
  thue_vat?: number;
  dieu_khoan?: string;
  ghi_chu?: string;
}) {
  try {
    const res: any = await http.post("/quotations", payload);
    return {
      success: true,
      data: res?.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Tạo báo giá thất bại",
    };
  }
}

export async function updateQuotationStatusAction(ma_bao_gia: string, trang_thai: string) {
  try {
    const res: any = await http.put(`/quotations/${ma_bao_gia}/status`, { trang_thai });
    return {
      success: true,
      data: res?.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Cập nhật trạng thái báo giá thất bại",
    };
  }
}

export async function convertQuotationToOrderAction(ma_bao_gia: string) {
  try {
    const res: any = await http.post(`/quotations/${ma_bao_gia}/convert-to-order`, {});
    return {
      success: true,
      data: res?.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Chuyển đổi thành đơn hàng thất bại",
    };
  }
}

export async function deleteQuotationAction(ma_bao_gia: string) {
  try {
    const res: any = await http.delete(`/quotations/${ma_bao_gia}`);
    return {
      success: true,
      data: res?.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Xóa báo giá thất bại",
    };
  }
}
