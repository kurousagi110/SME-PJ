"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchOrderSaleList,
  fetchOrderSaleById,
  createOrderSale,
  updateOrderSaleStatusById,
} from "@/app/actions/order-sale";
import type { Order, OrderListParams, OrderCreatePayload, OrderStatusPayload } from "@/types";

export function useOrderSale(params: OrderListParams) {
  return useQuery({
    queryKey: ["order-sale", params],
    queryFn: async () => {
      const res = await fetchOrderSaleList(params as any);
      const p = (res as any).pagination ?? {};
      return {
        items: (res as any).data ?? [],
        page: p.page ?? 1,
        limit: p.limit ?? 20,
        total: p.total ?? 0,
        totalPages: p.totalPages ?? 1,
      };
    },
    enabled: typeof window !== "undefined",
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrderSaleById(id: string) {
  return useQuery<Order>({
    queryKey: ["order-sale", id],
    queryFn: async () => {
      const res = await fetchOrderSaleById(id);
      return res.data;
    },
    enabled: typeof window !== "undefined" && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOrderSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrderCreatePayload) => createOrderSale(data),
    onSuccess: () => {
      toast.success("Tạo đơn hàng thành công");
      queryClient.invalidateQueries({ queryKey: ["order-sale"] });
      // Cross-invalidate inventory so stock counts refresh
      queryClient.invalidateQueries({ queryKey: ["product-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["product-stock"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Tạo đơn hàng thất bại");
    },
  });
}

export function useUpdateOrderSaleStatusById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrderStatusPayload }) =>
      updateOrderSaleStatusById(id, data),
    onSuccess: (_data, variables) => {
      toast.success("Cập nhật trạng thái thành công");
      queryClient.invalidateQueries({ queryKey: ["order-sale"] });
      queryClient.invalidateQueries({ queryKey: ["order-sale", variables.id] });
      // Completing an order changes inventory
      queryClient.invalidateQueries({ queryKey: ["product-stock"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Cập nhật trạng thái thất bại");
    },
  });
}
