"use client";
import {
  fetchOrderSaleList,
  fetchOrderSaleById,
  createOrderSale,
  updateOrderSaleStatusById,
} from "@/app/actions/order-sale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
export function useOrderSale(params: {
  customer_name: string;
  status?: string;
  type?: string;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: ["order-sale", params],
    queryFn: async () => {
      const res = await fetchOrderSaleList(params);
      return res.data;
    },
    enabled: typeof window !== "undefined",
  });
}

export function useOrderSaleById(id: string) {
  return useQuery({
    queryKey: ["order-sale", id],
    queryFn: async () => {
      const res = await fetchOrderSaleById(id);
      return res.data;
    },
    enabled: typeof window !== "undefined" && !!id,
  });
}

export function useCreateOrderSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createOrderSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-sale"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateOrderSaleStatusById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateOrderSaleStatusById(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order-sale"] });
      queryClient.invalidateQueries({ queryKey: ["order-sale", variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
