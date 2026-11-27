"use server";

import { http } from "@/lib/http";

export interface HrRequestItem {
  _id: string;
  ma_don: string;
  loai_don: "leave" | "overtime" | "late_early" | "business_trip";
  user_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban?: string;
  chuc_vu?: string;
  tu_ngay: string;
  den_ngay: string;
  nua_ngay?: boolean;
  so_ngay: number;
  hinh_thuc_nghi?: string | null;
  so_gio_ot: number;
  he_so_ot: number;
  ly_do: string;
  trang_thai: "pending" | "approved" | "rejected" | "cancelled";
  approved_by?: { ho_ten?: string } | null;
  ghi_chu_duyet?: string;
  created_at: string;
}

export interface LeaveBalanceData {
  year: number;
  total_annual: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
}

export interface AttendanceQrToken {
  token: string;
  slot: number;
  rotationSeconds: number;
  expiresAt: string;
}

export async function fetchHrRequestsAction(params: { status?: string; type?: string; mine?: boolean } = {}): Promise<{
  success: boolean;
  items?: HrRequestItem[];
  total?: number;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.type) query.set("type", params.type);
    if (params.mine) query.set("mine", "true");
    const res = await http.get<{ data: { items: HrRequestItem[]; total: number } }>(`/hr-requests?${query.toString()}`);
    return { success: true, items: res?.data?.items || [], total: res?.data?.total || 0 };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải danh sách đơn từ" };
  }
}

export async function fetchLeaveBalanceAction(year?: number): Promise<{
  success: boolean;
  data?: LeaveBalanceData;
  error?: string;
}> {
  try {
    const q = year ? `?year=${year}` : "";
    const res = await http.get<{ data: LeaveBalanceData }>(`/hr-requests/leave-balance${q}`);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải số ngày phép năm" };
  }
}

export async function createHrRequestAction(payload: {
  loai_don: "leave" | "overtime" | "late_early" | "business_trip";
  tu_ngay: string;
  den_ngay: string;
  nua_ngay?: boolean;
  hinh_thuc_nghi?: string;
  so_gio_ot?: number;
  he_so_ot?: number;
  ly_do: string;
}): Promise<{ success: boolean; data?: HrRequestItem; error?: string }> {
  try {
    const res = await http.post<{ data: HrRequestItem }>("/hr-requests", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gửi đơn thất bại" };
  }
}

export async function decideHrRequestAction(
  id: string,
  hanh_dong: "approve" | "reject",
  ghi_chu = ""
): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post(`/hr-requests/${id}/decide`, { hanh_dong, ghi_chu });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Xử lý đơn từ thất bại" };
  }
}

export async function generateAttendanceQrAction(): Promise<{
  success: boolean;
  data?: AttendanceQrToken;
  error?: string;
}> {
  try {
    const res = await http.get<{ data: AttendanceQrToken }>("/hr-requests/attendance/qr-token");
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tạo mã QR chấm công" };
  }
}

export async function smartCheckInAction(payload: {
  mode: "check_in" | "check_out";
  qr_token?: string;
  lat?: number | null;
  lng?: number | null;
  ghi_chu?: string;
}): Promise<{ success: boolean; message?: string; data?: any; error?: string }> {
  try {
    const res = await http.post<{ data: any; message?: string }>("/hr-requests/attendance/smart-check-in", payload);
    return { success: true, data: res?.data, message: res?.message };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Chấm công thông minh thất bại" };
  }
}
