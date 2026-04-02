"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBOM, fetchUnitCost, setBOM } from "@/app/actions/bom";

function normalizeBOM(raw: any) {
  const root = raw?.data ?? raw;

  const items =
    root?.items ??
    root?.data?.items ??
    root?.data?.bom ??
    root?.bom ??
    [];

  return {
    ghi_chu: String(root?.ghi_chu ?? root?.data?.ghi_chu ?? ""),
    items: Array.isArray(items) ? items : [],
  };
}

export function useBOM(productId: string) {
  return useQuery({
    queryKey: ["bom-by-product", productId],
    enabled: !!productId,
    queryFn: async () => normalizeBOM(await fetchBOM(productId)),
    staleTime: 10_000,
    retry: 0,
  });
}

export function useUnitCost(productId: string) {
  return useQuery({
    queryKey: ["bom-unit-cost", productId],
    enabled: !!productId,
    queryFn: async () => (await fetchUnitCost(productId))?.data ?? (await fetchUnitCost(productId)),
    staleTime: 10_000,
    retry: 0,
  });
}

export function useSetBOM(productId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { ghi_chu?: string; items: any[] }) =>
      await setBOM(productId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bom-by-product", productId] });
      qc.invalidateQueries({ queryKey: ["bom-unit-cost", productId] });
    },
  });
}
