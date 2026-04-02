"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPurchaseReceipt,
  fetchPurchaseReceipts,
  updatePurchaseReceiptStatus,
  PurchaseReceiptStatus,
} from "@/app/actions/receipt-purchase";

export function usePurchaseReceipts(params: {
  q: string;
  trang_thai: "ALL" | PurchaseReceiptStatus;
  page: number;
  limit: number;
}) {
  const q = params?.q ?? "";
  const trang_thai = params?.trang_thai ?? "ALL";
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery({
    queryKey: ["purchase-receipts", q, trang_thai, page, limit],
    queryFn: async () =>
      fetchPurchaseReceipts({
        q,
        trang_thai,
        page,
        limit,
      }),
    staleTime: 5_000,
    retry: 0,
  });
}

export function useCreatePurchaseReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Parameters<typeof createPurchaseReceipt>[0]) =>
      createPurchaseReceipt(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-receipts"] });
    },
  });
}

export function useUpdatePurchaseReceiptStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Parameters<typeof updatePurchaseReceiptStatus>[0]
    ) => updatePurchaseReceiptStatus(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-receipts"] });
      // Completing a purchase receipt adds raw materials (and possibly finished goods)
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["nguyen-lieu-stock-map"] });
      qc.invalidateQueries({ queryKey: ["product-stock"] });
    },
  });
}
