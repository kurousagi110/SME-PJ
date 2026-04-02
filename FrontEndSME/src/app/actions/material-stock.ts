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

/**
 * GET /nguyen-lieu/stock?q=&page=1&limit=20
 */
export async function fetchMaterialsStock(params?: {
  q?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const qs = new URLSearchParams();
    qs.set("q", String(params?.q ?? ""));
    qs.set("page", String(params?.page ?? 1));
    qs.set("limit", String(params?.limit ?? 20));

    const res: any = await http.get(`/nguyen-lieu/stock?${qs.toString()}`);
    return pickData(res);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}
