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

export type BomApiItem = {
  nguyen_lieu_id: string;
  qty: number; // định mức / 1 SP
  unit?: string;
  waste_rate?: number;

  // backend có thể join trả thêm tên:
  ten_nl?: string;
  don_vi?: string;
  nguyen_lieu?: any;
};

export type BomApi = {
  productId?: string;
  ghi_chu?: string;
  items: BomApiItem[];
};

export async function fetchBOM(productId: string) {
  try {
    const res: any = await http.get(`/bom/${productId}`);
    return pickData(res);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function fetchUnitCost(productId: string) {
  try {
    const res: any = await http.get(`/bom/${productId}/unit-cost`);
    return pickData(res);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function setBOM(
  productId: string,
  payload: { ghi_chu?: string; items: BomApiItem[] }
) {
  try {
    const res: any = await http.post(`/bom/${productId}`, payload);
    return pickData(res);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}
