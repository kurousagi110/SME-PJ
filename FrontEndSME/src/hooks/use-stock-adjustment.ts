"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStockAdjustmentList,
  createStockAdjustment,
  approveStockAdjustment,
  rejectStockAdjustment,
} from "@/app/actions/stock-adjustment";
import { toast } from "sonner";

export function useStockAdjustmentList(params?: {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
  loai?: string;
  trang_thai?: string;
}) {
  return useQuery({
    queryKey: ["stock-adjustments", params],
    queryFn: async () => {
      const res = await fetchStockAdjustmentList({
        loai: params?.type || params?.loai,
        trang_thai: params?.status || params?.trang_thai,
        page: params?.page,
        limit: params?.limit,
      });
      if (!res.success) {
        throw new Error(res.message);
      }
      return {
        items: res.data || [],
        total: (res as any).pagination?.total ?? 0,
        totalPages: (res as any).pagination?.totalPages ?? 1,
      };
    },
  });
}

export function useCreateStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof createStockAdjustment>[0]) => {
      const res = await createStockAdjustment(data);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useApproveStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await approveStockAdjustment(id);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
      queryClient.invalidateQueries({ queryKey: ["material-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["material-stock"] });
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["the-kho"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useRejectStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await rejectStockAdjustment(id);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

// Backward-compatible aliases
export const useDieuChinhKhoList = useStockAdjustmentList;
export const useCreateDieuChinhKho = useCreateStockAdjustment;
export const useApproveDieuChinhKho = useApproveStockAdjustment;
export const useRejectDieuChinhKho = useRejectStockAdjustment;
