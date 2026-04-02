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
  return useQuery<{ data: Product[]; pagination?: unknown }>({
    queryKey: ["product-catalog", params],
    queryFn: () => fetchProductList(params as any),
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
    queryFn: () => fetchProductStockList(params),
    staleTime: 5 * 60 * 1000,
  });
}
