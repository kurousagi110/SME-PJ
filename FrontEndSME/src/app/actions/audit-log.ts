"use server";
import { http } from "@/lib/http";

export async function fetchAuditLog(params?: {
  page?: number;
  limit?: number;
  q?: string;
  severity?: string;
  action?: string;
  module?: string;
}) {
  const query = new URLSearchParams();
  query.set("page", String(params?.page || 1));
  query.set("limit", String(params?.limit || 50));
  if (params?.q) query.set("q", params.q);
  if (params?.severity && params.severity !== "ALL") query.set("severity", params.severity);
  if (params?.action) query.set("action", params.action);
  if (params?.module) query.set("module", params.module);
  try {
    const result = await http.get(`/audit-log?${query.toString()}`);
    return { success: true, data: result.data, pagination: result.pagination };
  } catch (err: any) {
    throw new Error(err.message || "Lấy audit log không thành công");
  }
}
