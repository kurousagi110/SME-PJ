"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMaterialsStock } from "@/app/actions/material-stock";

const s = (v: any) => String(v ?? "").trim();
const n = (v: any, def = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
};

type StockItem = {
  _id: string;
  ma_nl: string;
  ten_nl?: string;
  don_vi?: string;
  so_luong: number;
  status?: string;
};

function normalizeList(raw: any): StockItem[] {
  const root = raw?.data ?? raw;
  const items =
    root?.items ??
    root?.data?.items ??
    root?.data ??
    (Array.isArray(root) ? root : []);

  const arr = Array.isArray(items) ? items : [];
  return arr
    .map((x: any) => ({
      _id: s(x?._id?.$oid ?? x?._id),
      ma_nl: s(x?.ma_nl),
      ten_nl: s(x?.ten_nl) || undefined,
      don_vi: s(x?.don_vi) || undefined,
      so_luong: n(x?.so_luong, 0),
      status: s(x?.status) || undefined,
    }))
    .filter((x: any) => x._id && x.ma_nl);
}

export function useMaterialStockMap() {
  return useQuery({
    queryKey: ["nguyen-lieu-stock-map"],
    queryFn: async () => {
      const raw = await fetchMaterialsStock({ q: "", page: 1, limit: 5000 });
      const list = normalizeList(raw);

      const map = new Map<string, StockItem>();
      for (const it of list) map.set(it.ma_nl, it);

      return { items: list, map };
    },
    staleTime: 10_000,
    retry: 0,
  });
}
