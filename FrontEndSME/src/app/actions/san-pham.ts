"use server";

import { http } from "@/lib/http";

function pickData(res: any) {
  return res?.data ?? res;
}

function extractErrorMessage(err: any) {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.data?.message ||
    err?.message;

  if (typeof msg === "string" && msg.trim()) return msg;

  try {
    return JSON.stringify(err?.response?.data ?? err);
  } catch {
    return "API error";
  }
}

export async function fetchSanPhamList(params?: {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  try {
    const qs = new URLSearchParams();
    qs.set("page", String(params?.page ?? 1));
    qs.set("limit", String(params?.limit ?? 200));
    qs.set("q", params?.q ?? "");
    qs.set("sortBy", params?.sortBy ?? "createAt");
    qs.set("order", params?.order ?? "desc");

    const res: any = await http.get(`/san-pham?${qs.toString()}`);
    return pickData(res);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function fetchSanPhamById(id: string) {
  try {
    const res: any = await http.get(`/san-pham/${id}`);
    return pickData(res);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}
