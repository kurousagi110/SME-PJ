"use server";

import { http } from "@/lib/http";

export interface KanbanOrder {
  _id: string;
  ma_dh: string;
  san_pham: any[];
  tong_tien?: number;
  trang_thai: string;
  cong_doan_hien_tai: string;
  created_at: string;
  updated_at: string;
  ghi_chu?: string;
  lich_su_cong_doan?: any[];
  tong_phe_pham?: number;
}

export interface KanbanBoardResponse {
  columns: {
    pending: KanbanOrder[];
    raw_material_prep: KanbanOrder[];
    machining: KanbanOrder[];
    finishing: KanbanOrder[];
    assembly_qc: KanbanOrder[];
    completed: KanbanOrder[];
  };
  totalOrders: number;
}

export async function fetchKanbanAction(): Promise<{
  success: boolean;
  data?: KanbanBoardResponse;
  error?: string;
}> {
  try {
    const res: any = await http.get("/production/kanban");
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể tải bảng Kanban sản xuất" };
  }
}

export async function updateProductionStageAction(
  orderId: string,
  payload: { stage: string; scrap_qty?: number; scrap_reason?: string; notes?: string }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res: any = await http.patch(`/production/${orderId}/stage`, payload);
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể cập nhật công đoạn" };
  }
}

export async function fetchScrapReportAction(): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res: any = await http.get("/production/scrap-report");
    return { success: true, data: res?.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Không thể tải báo cáo hao hụt" };
  }
}
