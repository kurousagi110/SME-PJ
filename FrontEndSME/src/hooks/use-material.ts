"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMaterialList,
  fetchMaterialById,
  createMaterial,
  updateMaterialById,
  deleteMaterialById,
  fetchMaterialStockList,
} from "@/app/actions/material";
import { toast } from "sonner";

export function useMaterialCatalog(params: {
  name: string;
  status?: string;
  low_stock?: boolean;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: ["material-catalog", params],
    queryFn: async () => {
      const res = await fetchMaterialList(params);
      return {
        items: res.data,
        total: (res as any).pagination?.total ?? 0,
        totalPages: (res as any).pagination?.totalPages ?? 1,
      };
    },
    enabled: typeof window !== "undefined",
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-catalog"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMaterialById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateMaterialById(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["material-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["material", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["material-stock"] });
      queryClient.invalidateQueries({ queryKey: ["nguyen-lieu-stock-map"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
export function useDeleteMaterialById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMaterialById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-catalog"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useMaterialStockList(params?: {
  name: string;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: ["material-stock", params],
    queryFn: async () => {
      const res = await fetchMaterialStockList(params);
      return {
        items: res.data,
        total: (res as any).pagination?.total ?? 0,
        totalPages: (res as any).pagination?.totalPages ?? 1,
      };
    },
    enabled: typeof window !== "undefined",
  });
}
