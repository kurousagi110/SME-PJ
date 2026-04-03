"use server";
import { http } from "@/lib/http";

export async function fetchDieuChinhKhoList(params?: {
  loai?: string;
  trang_thai?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.loai)       query.set("loai",       params.loai);
  if (params?.trang_thai) query.set("trang_thai", params.trang_thai);
  query.set("page",  String(params?.page  || 1));
  query.set("limit", String(params?.limit || 20));
  try {
    const result = await http.get(`/dieu-chinh-kho?${query.toString()}`);
    return { success: true, data: result.data, pagination: result.pagination };
  } catch (err: any) {
    throw new Error(err.message || "Lấy danh sách phiếu điều chỉnh kho không thành công");
  }
}

export async function createDieuChinhKho(data: {
  loai: string;
  item_id: string;
  ma_hang: string;
  ten_hang: string;
  so_luong_dieu_chinh: number;
  ton_kho_truoc: number;
  ly_do: string;
}) {
  try {
    const result = await http.post("/dieu-chinh-kho", data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Tạo phiếu điều chỉnh kho không thành công");
  }
}

export async function approveDieuChinhKho(id: string) {
  try {
    const result = await http.patch(`/dieu-chinh-kho/${id}/approve`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Duyệt phiếu điều chỉnh kho không thành công");
  }
}

export async function rejectDieuChinhKho(id: string) {
  try {
    const result = await http.patch(`/dieu-chinh-kho/${id}/reject`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Từ chối phiếu điều chỉnh kho không thành công");
  }
}
