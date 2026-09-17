"use server";

import { http } from "@/lib/http";

export interface CalculatePayrollPayload {
  thang: number;
  nam: number;
  ma_nv?: string;
  don_gia_gio?: number;
  thuong?: number;
  phat?: number;
  ghi_chu?: string;
}

export async function calculatePayrollAction(payload: CalculatePayrollPayload) {
  try {
    const res = await http.post("/luong/tinh-luong", payload);
    return { success: true, data: res.data };
  } catch (err: any) {
    throw new Error(err?.message || "Tính lương tháng thất bại");
  }
}

export async function fetchAttendanceListAction(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  ma_nv?: string;
}) {
  const q = new URLSearchParams({
    page: String(params?.page || 1),
    limit: String(params?.limit || 50),
    ...(params?.from ? { from: params.from } : {}),
    ...(params?.to ? { to: params.to } : {}),
    ...(params?.ma_nv ? { ma_nv: params.ma_nv } : {}),
  });

  try {
    const res = await http.get(`/luong/cham-cong?${q.toString()}`);
    return { success: true, data: res.data, pagination: res.pagination };
  } catch (err: any) {
    throw new Error(err?.message || "Lấy danh sách chấm công thất bại");
  }
}
