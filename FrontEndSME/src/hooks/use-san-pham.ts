"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSanPhamById, fetchSanPhamList } from "@/app/actions/san-pham";

export type NguyenLieuInSanPham = {
  ma_nl: string;
  ten_nl: string;
  so_luong: number;
  don_vi: string;
};

export type SanPham = {
  _id: string;
  ma_sp: string;
  ten_sp: string;
  don_gia?: number;
  so_luong?: number;
  don_vi?: string;
  mo_ta?: string;
  trang_thai?: string;
  nguyen_lieu: NguyenLieuInSanPham[];
  ton_toi_thieu?: number;
};

const s = (v: any) => String(v ?? "").trim();
const n = (v: any, def = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
};

function normalizeNguyenLieu(arr: any): NguyenLieuInSanPham[] {
  const list = Array.isArray(arr) ? arr : [];
  return list
    .map((x) => ({
      ma_nl: s(x?.ma_nl || x?.maNl || x?.code || x?._id),
      ten_nl: s(x?.ten_nl || x?.ten || x?.name),
      so_luong: n(x?.so_luong ?? x?.qty ?? 0, 0),
      don_vi: s(x?.don_vi || x?.unit || "-"),
    }))
    .filter((x) => x.ma_nl && x.ten_nl);
}

function normalizeSanPham(raw: any): SanPham | null {
  const p = raw?.data ?? raw; // nhiều backend bọc data
  const x = p?.data ?? p; // thêm 1 lớp nếu có

  const _id = s(x?._id);
  if (!_id) return null;

  return {
    _id,
    ma_sp: s(x?.ma_sp),
    ten_sp: s(x?.ten_sp),
    don_gia: x?.don_gia != null ? n(x.don_gia, 0) : undefined,
    so_luong: x?.so_luong != null ? n(x.so_luong, 0) : undefined,
    don_vi: s(x?.don_vi) || undefined,
    mo_ta: s(x?.mo_ta) || undefined,
    trang_thai: s(x?.trang_thai) || undefined,
    nguyen_lieu: normalizeNguyenLieu(x?.nguyen_lieu),
    ton_toi_thieu: x?.ton_toi_thieu != null ? n(x.ton_toi_thieu, 0) : undefined,
  };
}

function normalizeList(raw: any): SanPham[] {
  const root = raw?.data ?? raw;

  const items =
    root?.items ??
    root?.data?.items ??
    root?.data ??
    (Array.isArray(root) ? root : []);

  const arr = Array.isArray(items) ? items : [];
  return arr.map((x) => normalizeSanPham(x)).filter(Boolean) as SanPham[];
}

export function useSanPhamList(params?: {
  page?: number;
  limit?: number;
  q?: string;
}) {
  return useQuery({
    queryKey: [
      "san-pham-list",
      params?.page ?? 1,
      params?.limit ?? 200,
      params?.q ?? "",
    ],
    queryFn: async () => {
      const raw = await fetchSanPhamList({
        page: params?.page ?? 1,
        limit: params?.limit ?? 200,
        q: params?.q ?? "",
      });
      return { items: normalizeList(raw) };
    },
    staleTime: 10_000,
    retry: 0,
  });
}

export function useSanPhamById(id: string) {
  return useQuery({
    queryKey: ["san-pham-by-id", id],
    enabled: !!id,
    queryFn: async () => {
      const raw = await fetchSanPhamById(id);
      const p = normalizeSanPham(raw);
      if (!p) throw new Error("Sản phẩm không hợp lệ");
      return p;
    },
    staleTime: 10_000,
    retry: 0,
  });
}
