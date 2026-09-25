"use server";

import { http } from "@/lib/http";

export async function fetchNotificationsAction(params?: {
  da_doc?: boolean;
  page?: number;
  limit?: number;
}) {
  try {
    const qs = new URLSearchParams();
    if (params?.da_doc !== undefined) qs.set("da_doc", String(params.da_doc));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));

    const res: any = await http.get(`/thong-bao?${qs.toString()}`);
    return {
      success: true,
      data: res.data || [],
      unreadCount: res.unreadCount || 0,
      pagination: res.pagination,
    };
  } catch (err: any) {
    return { success: false, data: [], unreadCount: 0, error: err.message };
  }
}

export async function markNotificationReadAction(id: string) {
  try {
    const res: any = await http.patch(`/thong-bao/${id}/read`, {});
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const res: any = await http.post(`/thong-bao/read-all`, {});
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
