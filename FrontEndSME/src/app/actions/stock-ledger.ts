"use server";

import { http } from "@/lib/http";

export interface StockMovement {
  date: string;
  ma_chung_tu: string;
  loai_giao_dich: string;
  mo_ta: string;
  so_luong_nhap: number;
  so_luong_xuat: number;
  don_gia: number;
  ton_luy_ke?: number;
}

export interface StockCardData {
  item: {
    id: string;
    ma_hang: string;
    ten_hang: string;
    don_vi: string;
    don_gia: number;
    ton_hien_tai: number;
  };
  tu_ngay: string;
  den_ngay: string;
  ton_dau_ky: number;
  tong_nhap_trong_ky: number;
  tong_xuat_trong_ky: number;
  ton_cuoi_ky: number;
  movements: StockMovement[];
}

export interface InOutBalanceRow {
  id: string;
  loai: string;
  ma_hang: string;
  ten_hang: string;
  don_vi: string;
  don_gia: number;
  ton_dau_ky: number;
  gia_tri_dau: number;
  nhap_trong_ky: number;
  gia_tri_nhap: number;
  xuat_trong_ky: number;
  gia_tri_xuat: number;
  ton_cuoi_ky: number;
  gia_tri_cuoi: number;
}

export interface InOutBalanceReportData {
  tu_ngay: string;
  den_ngay: string;
  tong_so_mat_hang: number;
  summary: {
    tong_gia_tri_ton_dau: number;
    tong_gia_tri_nhap: number;
    tong_gia_tri_xuat: number;
    tong_gia_tri_ton_cuoi: number;
  };
  items: InOutBalanceRow[];
}

export async function fetchStockCardAction(params: {
  itemId: string;
  itemType?: "product" | "material";
  tu_ngay?: string;
  den_ngay?: string;
}) {
  try {
    const q = new URLSearchParams();
    q.set("itemId", params.itemId);
    if (params.itemType) q.set("itemType", params.itemType);
    if (params.tu_ngay) q.set("tu_ngay", params.tu_ngay);
    if (params.den_ngay) q.set("den_ngay", params.den_ngay);

    const res: any = await http.get(`/stock-ledger/card?${q.toString()}`);
    return {
      success: true,
      data: res?.data as StockCardData,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Không thể tải dữ liệu thẻ kho",
    };
  }
}

export async function fetchInOutBalanceReportAction(params?: {
  itemType?: "product" | "material" | "all";
  tu_ngay?: string;
  den_ngay?: string;
  search?: string;
}) {
  try {
    const q = new URLSearchParams();
    if (params?.itemType) q.set("itemType", params.itemType);
    if (params?.tu_ngay) q.set("tu_ngay", params.tu_ngay);
    if (params?.den_ngay) q.set("den_ngay", params.den_ngay);
    if (params?.search) q.set("search", params.search);

    const res: any = await http.get(`/stock-ledger/in-out-balance?${q.toString()}`);
    return {
      success: true,
      data: res?.data as InOutBalanceReportData,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Không thể tải báo cáo xuất - nhập - tồn",
    };
  }
}
