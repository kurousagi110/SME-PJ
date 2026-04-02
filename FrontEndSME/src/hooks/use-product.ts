"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchProductList,
  fetchProductById,
  createProduct,
  updateProductById,
  deleteProductById,
  fetchProductStockList,
} from "@/app/actions/product";
import type { Product, ProductListParams } from "@/types";

export function useProductList(params: ProductListParams) {
  return useQuery({
    queryKey: ["product-catalog", params],
    queryFn: async () => {
      const res = await fetchProductList(params as any);
      return {
        data: {
          items: res.data,
          total: (res as any).pagination?.total ?? 0,
          totalPages: (res as any).pagination?.totalPages ?? 1,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductById(id: string) {
  return useQuery<{ data: Product }>({
    queryKey: ["product", id],
    queryFn: () => fetchProductById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) => createProduct(data),
    onSuccess: () => {
      toast.success("Tạo sản phẩm thành công");
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Tạo sản phẩm thất bại");
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ _id, ...payload }: { _id: string } & Partial<Product>) =>
      updateProductById(_id, payload),
    onSuccess: () => {
      toast.success("Cập nhật sản phẩm thành công");
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["product-stock"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Cập nhật sản phẩm thất bại");
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ _id, ton_kho }: { _id: string; ton_kho: number }) =>
      updateProductById(_id, { ton_kho }),
    onSuccess: () => {
      toast.success("Cập nhật tồn kho thành công");
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["product-stock"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Cập nhật tồn kho thất bại");
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProductById(id),
    onSuccess: () => {
      toast.success("Xóa sản phẩm thành công");
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Xóa sản phẩm thất bại");
    },
  });
}

export function useProductStockList(params: { name: string; page: number; limit: number }) {
  return useQuery({
    queryKey: ["product-stock", params],
    queryFn: async () => {
      const res = await fetchProductStockList(params);
      return {
        items: (res as any).data ?? [],
        pagination: (res as any).pagination ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
