"use server";
import { http } from "@/lib/http";

export async function fetchAuditLog(params?: {
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  query.set("page", String(params?.page || 1));
  query.set("limit", String(params?.limit || 50));
  try {
    const result = await http.get(`/audit-log?${query.toString()}`);
    return { success: true, data: result.data, pagination: result.pagination };
  } catch (err: any) {
    throw new Error(err.message || "Lấy audit log không thành công");
  }
}
