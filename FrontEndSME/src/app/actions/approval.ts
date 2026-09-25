"use server";

import { http } from "@/lib/http";

export interface PendingApprovalsData {
  totalPending: number;
  purchases: any[];
  stockAdjustments: any[];
  sales: any[];
  payroll: {
    thang: number;
    nam: number;
    da_chi: boolean;
    ma_phieu?: string | null;
    ngay_chi_tra?: string | null;
  };
}

export async function fetchPendingApprovalsAction(): Promise<{
  success: boolean;
  data: PendingApprovalsData;
  error?: string;
}> {
  try {
    const res: any = await http.get("/approvals/pending");
    return {
      success: true,
      data: res.data as PendingApprovalsData,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Không thể tải danh sách trình ký",
      data: {
        totalPending: 0,
        purchases: [],
        stockAdjustments: [],
        sales: [],
        payroll: {
          thang: new Date().getMonth() + 1,
          nam: new Date().getFullYear(),
          da_chi: false,
          ma_phieu: null,
          ngay_chi_tra: null,
        },
      },
    };
  }
}

export async function processApprovalAction(payload: {
  loai: "purchase" | "stock_adjustment" | "sale" | "payroll";
  id: string;
  hanh_dong: "approve" | "reject";
  ghi_chu?: string;
  thang?: number;
  nam?: number;
  phuong_thuc?: string;
}) {
  try {
    const res: any = await http.post("/approvals/action", payload);
    return { success: true, message: res.message || "Xử lý thành công" };
  } catch (err: any) {
    return { success: false, error: err.message || "Xử lý phê duyệt thất bại" };
  }
}
