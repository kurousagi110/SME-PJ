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
 * GET /api/luong/cham-cong?ngay_thang=YYYY-MM-DD
 */
export async function fetchChamCongByDate(params: { ngay_thang: string }) {
  try {
    const qs = new URLSearchParams();
    qs.set("ngay_thang", params.ngay_thang);

    const url = `/luong/cham-cong?${qs.toString()}`;
    const res: any = await http.get(url);
    return pickData(res);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 *  Backend đúng:
 * POST /api/luong/cham-cong
 * body: { ma_nv, ngay_thang, gio_check_in?, gio_check_out?, so_gio_lam?, ghi_chu? }
 */
export async function upsertChamCong(payload: {
  ma_nv: string;
  ngay_thang: string;
  gio_check_in?: string;
  gio_check_out?: string;
  so_gio_lam?: number;
  ghi_chu?: string;
}) {
  try {
    const body = {
      ma_nv: String(payload.ma_nv),
      ngay_thang: payload.ngay_thang,
      gio_check_in: payload.gio_check_in ?? null,
      gio_check_out: payload.gio_check_out ?? null,
      so_gio_lam:
        payload.so_gio_lam === undefined
          ? undefined
          : Number(payload.so_gio_lam),
      ghi_chu: payload.ghi_chu ?? "",
    };

    const res: any = await http.post(`/luong/cham-cong`, body);
    return pickData(res);
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}
