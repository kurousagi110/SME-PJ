"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProductionReceipt,
  fetchProductionNeeds,
  fetchProductionReceipts,
  updateProductionReceiptStatus,
  ProdReceiptStatus,
} from "@/app/actions/production-receipts";

/** ===================== LIST ===================== */
export function useProductionReceipts(params: {
  q: string;
  trang_thai: "ALL" | ProdReceiptStatus;
  page: number;
  limit: number;
}) {
  const q = params?.q ?? "";
  const trang_thai = params?.trang_thai ?? "ALL";
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery({
    queryKey: ["prod-receipts", q, trang_thai, page, limit],
    queryFn: async () =>
      fetchProductionReceipts({
        q,
        trang_thai,
        page,
        limit,
      }),
    staleTime: 5_000,
    retry: 0,
  });
}

/** ===================== CREATE ===================== */
export function useCreateProductionReceipt() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Parameters<typeof createProductionReceipt>[0]) =>
      createProductionReceipt(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prod-receipts"] });
    },
  });
}

/** ===================== UPDATE STATUS ===================== */
export function useUpdateProdReceiptStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: Parameters<typeof updateProductionReceiptStatus>[0]
    ) => updateProductionReceiptStatus(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prod-receipts"] });
    },
  });
}

/** ===================== NEEDS ===================== */
export function useProductionNeeds(id?: string, enabled?: boolean) {
  const safeId = id ? String(id) : "";

  return useQuery({
    queryKey: ["prod-receipt-needs", safeId],
    enabled: !!safeId && !!enabled,
    queryFn: async () => fetchProductionNeeds(safeId),
    staleTime: 3_000,
    retry: 0,
  });
}
