"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchBOM, fetchUnitCost, setBOM } from "@/app/actions/bom";
import type { BOM, BOMSetPayload, BOMLineItem, UnitCost } from "@/types";

function normalizeBOM(raw: unknown): BOM {
  const r = raw as Record<string, unknown>;
  const root: Record<string, unknown> = (r?.data as Record<string, unknown>) ?? r ?? {};

  const items =
    (root?.items as BOMLineItem[]) ??
    ((root?.data as Record<string, unknown>)?.items as BOMLineItem[]) ??
    [];

  return {
    san_pham_id: String(root?.san_pham_id ?? ""),
    ghi_chu: String(root?.ghi_chu ?? (root?.data as Record<string, unknown>)?.ghi_chu ?? ""),
    items: Array.isArray(items) ? items : [],
  };
}

export function useBOM(productId: string) {
  return useQuery<BOM>({
    queryKey: ["bom-by-product", productId],
    enabled: !!productId,
    queryFn: async () => normalizeBOM(await fetchBOM(productId)),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export function useUnitCost(productId: string) {
  return useQuery<UnitCost>({
    queryKey: ["bom-unit-cost", productId],
    enabled: !!productId,
    queryFn: async () => {
      const res = await fetchUnitCost(productId);
      return (res as Record<string, unknown>)?.data as UnitCost ?? res as UnitCost;
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export function useSetBOM(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BOMSetPayload) => setBOM(productId, payload),
    onSuccess: () => {
      toast.success("Khai báo BOM thành công");
      qc.invalidateQueries({ queryKey: ["bom-by-product", productId] });
      qc.invalidateQueries({ queryKey: ["bom-unit-cost", productId] });
      // BOM change affects PROD_RECEIPT inventory, invalidate products
      qc.invalidateQueries({ queryKey: ["product-catalog"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khai báo BOM thất bại");
    },
  });
}
