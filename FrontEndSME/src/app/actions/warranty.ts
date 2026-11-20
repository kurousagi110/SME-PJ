"use server";

import { http } from "@/lib/http";

export interface WarrantyItem {
  _id: string;
  ma_bao_hanh: string;
  ma_dh?: string;
  ten_sp: string;
  serial_number: string;
  khach_hang_ten: string;
  so_dien_thoai: string;
  ngay_kich_hoat: string;
  thoi_han_thang: number;
  ngay_het_han: string;
  trang_thai: "active" | "expired" | "servicing";
  lich_su_bao_tri: Array<{
    ticket_id: string;
    ngay: string;
    noi_dung: string;
    ky_thuat_vien: string;
    chi_phi: number;
  }>;
}

export async function fetchWarrantiesAction(params: { q?: string; trang_thai?: string; page?: number; limit?: number } = {}): Promise<{
  success: boolean;
  items?: WarrantyItem[];
  total?: number;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.trang_thai) query.set("trang_thai", params.trang_thai);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const res: any = await http.get(`/warranty?${query.toString()}`);
    return {
      success: true,
      items: res?.data || [],
      total: res?.pagination?.total || 0,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể tải danh sách bảo hành" };
  }
}

export async function lookupWarrantyAction(keyword: string): Promise<{
  success: boolean;
  items?: WarrantyItem[];
  error?: string;
}> {
  try {
    const res: any = await http.get(`/warranty/lookup?keyword=${encodeURIComponent(keyword)}`);
    return {
      success: true,
      items: res?.data || [],
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Tra cứu bảo hành thất bại" };
  }
}

export async function createWarrantyAction(payload: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res: any = await http.post("/warranty", payload);
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Tạo phiếu bảo hành thất bại" };
  }
}

export async function addMaintenanceTicketAction(
  warrantyId: string,
  payload: { noi_dung: string; ky_thuat_vien?: string; chi_phi?: number }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res: any = await http.post(`/warranty/${warrantyId}/maintenance`, payload);
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Ghi nhận bảo dưỡng thất bại" };
  }
}
