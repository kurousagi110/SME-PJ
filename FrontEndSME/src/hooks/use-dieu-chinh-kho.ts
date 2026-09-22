"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDieuChinhKhoList,
  createDieuChinhKho,
  approveDieuChinhKho,
  rejectDieuChinhKho,
} from "@/app/actions/dieu-chinh-kho";
import { toast } from "sonner";

export function useDieuChinhKhoList(params?: {
  loai?: string;
  trang_thai?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["dieu-chinh-kho", params],
    queryFn: async () => {
      const res = await fetchDieuChinhKhoList(params);
      if (!res.success) {
        throw new Error(res.message);
      }
      return {
        items: res.data || [],
        total: (res as any).pagination?.total ?? 0,
        totalPages: (res as any).pagination?.totalPages ?? 1,
      };
    },
    enabled: typeof window !== "undefined",
  });
}

export function useCreateDieuChinhKho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Parameters<typeof createDieuChinhKho>[0]) => {
      const res = await createDieuChinhKho(data);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useApproveDieuChinhKho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await approveDieuChinhKho(id);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
      queryClient.invalidateQueries({ queryKey: ["material-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["material-stock"] });
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useRejectDieuChinhKho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await rejectDieuChinhKho(id);
      if (!res.success) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
