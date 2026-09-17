"use server";

import { http } from "@/lib/http";

export interface PosProductItem {
  _id: string;
  ma_sp: string;
  ten_sp: string;
  don_vi?: string;
  don_gia?: number;
  gia_ban?: number;
  so_luong?: number;
  hinh_anh?: string;
  mo_ta?: string;
}

export interface PosOrderItemPayload {
  san_pham_id: string;
  ma_sp: string;
  ten_sp: string;
  don_gia: number;
  so_luong: number;
  thanh_tien: number;
  don_vi?: string;
  loai_hang?: "san_pham";
}

export interface PosCheckoutPayload {
  khach_hang_ten: string;
  so_dien_thoai?: string;
  san_pham: PosOrderItemPayload[];
  giam_gia?: number;
  thue_rate?: number;
  phi_vc?: number;
  phuong_thuc_tt?: "tien_mat" | "chuyen_khoan";
  tien_khach_dua?: number;
  ghi_chu?: string;
}

export interface PosCheckoutResponse {
  order: any;
  ma_dh: string;
  tien_khach_dua: number;
  tien_thoi: number;
}

/**
 * Get products for POS grid
 */
export async function fetchPosProductsAction(): Promise<{ success: boolean; data?: PosProductItem[]; message?: string }> {
  try {
    const res: any = await http.get("/san-pham?limit=100");
    const items = res?.data?.san_pham || res?.data?.items || res?.data || [];
    return { success: true, data: Array.isArray(items) ? items : [] };
  } catch (err: any) {
    return { success: false, message: err?.message || "Không thể tải danh sách sản phẩm POS" };
  }
}

/**
 * Execute POS Cashier Checkout
 */
export async function checkoutPosAction(
  payload: PosCheckoutPayload
): Promise<{ success: boolean; data?: PosCheckoutResponse; message?: string }> {
  try {
    const res: any = await http.post("/don-hang/pos", payload);
    return {
      success: true,
      data: res.data,
      message: res.message || "Thanh toán đơn hàng thành công",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Thanh toán đơn hàng POS thất bại",
    };
  }
}
