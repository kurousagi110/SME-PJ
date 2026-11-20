"use server";

import { http } from "@/lib/http";

export interface ContractMilestone {
  dot: number;
  ten_dot: string;
  ty_le: number;
  so_tien: number;
  han_thanh_toan?: string;
  trang_thai: "paid" | "pending";
  ma_phieu_thu?: string;
  paid_at?: string;
}

export interface ContractItem {
  _id: string;
  ma_hop_dong: string;
  ten_hop_dong: string;
  partner_name: string;
  gia_tri_hop_dong: number;
  ngay_ky: string;
  trang_thai: string;
  dot_thanh_toan: ContractMilestone[];
  created_at: string;
}

export async function fetchContractsAction(params: { q?: string; trang_thai?: string; page?: number; limit?: number } = {}): Promise<{
  success: boolean;
  items?: ContractItem[];
  total?: number;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.trang_thai) query.set("trang_thai", params.trang_thai);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const res: any = await http.get(`/contracts?${query.toString()}`);
    return {
      success: true,
      items: res?.data || [],
      total: res?.pagination?.total || 0,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể tải danh sách hợp đồng" };
  }
}

export async function createContractAction(payload: any): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res: any = await http.post("/contracts", payload);
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Tạo hợp đồng thất bại" };
  }
}

export async function payMilestoneAction(contractId: string, milestoneIndex: number): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res: any = await http.post(`/contracts/${contractId}/pay-milestone`, { milestoneIndex });
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Thanh toán đợt hợp đồng thất bại" };
  }
}
