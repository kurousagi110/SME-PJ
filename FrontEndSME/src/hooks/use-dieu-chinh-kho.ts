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
      return {
        items: res.data,
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
    mutationFn: createDieuChinhKho,
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
    mutationFn: (id: string) => approveDieuChinhKho(id),
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
    mutationFn: (id: string) => rejectDieuChinhKho(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
