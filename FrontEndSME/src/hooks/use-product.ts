"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  fetchProductList,
  fetchProductById,
  createProduct,
  updateProductById,
  deleteProductById,
  fetchProductStockList,
} from "@/app/actions/product";
import { toast } from "sonner";

export function useProductList(params: {
  name: string;
  status?: string;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: ["product-catalog", params],
    queryFn: () => fetchProductList(params),
  });
}

export function useProductById(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProductById(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      toast.success("Tạo sản phẩm thành công");
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
    },
    onError: (error) => {
      toast.error("Tạo sản phẩm thất bại");
      console.error(error);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ _id, ...payload }: { _id: string; [key: string]: any }) =>
      updateProductById(_id, payload),
    onSuccess: () => {
      toast.success("Cập nhật sản phẩm thành công");
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
    },
    onError: (error) => {
      toast.error("Cập nhật sản phẩm thất bại");
      console.error(error);
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
    onError: (error) => {
      toast.error("Xóa sản phẩm thất bại");
      console.error(error);
    },
  });
}

export function useProductStockList(params: {
  name: string;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: ["product-stock", params],
    queryFn: () => fetchProductStockList(params),
  });
}
