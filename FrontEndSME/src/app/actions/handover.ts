"use server";

import { http } from "@/lib/http";

export async function chuyenDonSangSanXuatAction(id: string) {
  try {
    const res: any = await http.post(`/don-hang/${id}/chuyen-san-xuat`, {});
    return { success: true, data: res.data, message: res.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Chuyển sang sản xuất thất bại" };
  }
}

export async function banGiaoNhapKhoAction(id: string) {
  try {
    const res: any = await http.post(`/don-hang/${id}/ban-giao-kho`, {});
    return { success: true, data: res.data, message: res.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Bàn giao nhập kho thất bại" };
  }
}

export async function chuyenSangVanChuyenAction(
  id: string,
  payload?: {
    don_vi_van_chuyen?: string;
    phi_van_chuyen?: number;
    ghi_chu?: string;
  }
) {
  try {
    const res: any = await http.post(`/don-hang/${id}/chuyen-van-chuyen`, payload || {});
    return { success: true, data: res.data, message: res.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Chuyển giao vận chuyển thất bại" };
  }
}

export async function themBinhLuanDonHangAction(id: string, noi_dung: string) {
  try {
    const res: any = await http.post(`/don-hang/${id}/comments`, { noi_dung });
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message || "Gửi thảo luận thất bại" };
  }
}
