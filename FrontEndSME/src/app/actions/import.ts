"use server";

import { http } from "@/lib/http";

export interface BulkImportParams {
  type: "san_pham" | "nguyen_lieu" | "doi_tac";
  items: Record<string, any>[];
  mode?: "upsert" | "insert_only";
}

export interface BulkImportResponse {
  success: boolean;
  message?: string;
  data?: {
    total: number;
    successCount: number;
    errorCount: number;
    errors: { row: number; ma: string; error: string }[];
    inserted: { row: number; ma: string; ten: string }[];
    updated: { row: number; ma: string; ten: string }[];
  };
  error?: string;
}

export async function bulkImportAction(params: BulkImportParams): Promise<BulkImportResponse> {
  try {
    const res: any = await http.post("/import/bulk", params);
    if (res?.success) {
      return {
        success: true,
        message: res.message || "Nhập dữ liệu thành công",
        data: res.data,
      };
    }
    return {
      success: false,
      error: res?.message || "Lỗi khi nhập dữ liệu hàng loạt",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Lỗi máy chủ khi xử lý dữ liệu nhập",
    };
  }
}
