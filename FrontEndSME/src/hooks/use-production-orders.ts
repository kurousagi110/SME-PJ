"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  poApprove,
  poCreate,
  poList,
  poReject,
  ProductionOrder,
  Status,
} from "@/lib/production-order.store";

import { approveProductionOrderApplyStock } from "@/app/actions/approve-production-order-stock";

const s = (v: any) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

export function useProductionOrders(params: {
  q: string;
  status: "ALL" | Status;
}) {
  return useQuery({
    queryKey: ["production-orders", params.q, params.status],
    queryFn: async () => {
      const all = poList();

      const q = s(params.q);
      const st = params.status;

      const items = all.filter((o) => {
        const okStatus = st === "ALL" ? true : o.trang_thai === st;
        const okQ =
          !q ||
          s(o.ma_don).includes(q) ||
          s(o.sp_ten).includes(q) ||
          s(o.sp_ma).includes(q);

        return okStatus && okQ;
      });

      return { items };
    },
    staleTime: 800,
    retry: 0,
  });
}

export function useCreateProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ProductionOrder, "_id">) => poCreate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
    },
  });
}

/**
 *  Duyệt đơn:
 * 1) trừ kho NL (POST /nguyen-lieu/:id/adjust-stock)
 * 2) cộng kho SP (POST /san-pham/:id/adjust-stock)
 * 3) update localStorage đơn -> APPROVED
 */
export function useApproveProductionOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      order: ProductionOrder;
      approverName: string;
    }) => {
      const o = payload.order;

      if (!o?._id) throw new Error("Thiếu id đơn");
      if (o.trang_thai !== "PENDING")
        throw new Error("Chỉ duyệt được đơn đang chờ duyệt");

      if (!o.sp_id) throw new Error("Đơn thiếu sp_id (id sản phẩm)");
      const qty = Number(o.so_luong) || 0;
      if (qty <= 0) throw new Error("Số lượng sản xuất không hợp lệ");

      // 1) apply stock (API thật)
      await approveProductionOrderApplyStock({
        sp_id: o.sp_id,
        so_luong_sp: qty,
        needs: (o.needs ?? []).map((n) => ({
          ma_nl: n.ma_nl,
          so_luong_can: Number(n.so_luong_can) || 0,
        })),
      });

      // 2) update local order status
      const r = poApprove(o._id, payload.approverName);
      if (!r) throw new Error("Không tìm thấy đơn (localStorage)");
      return r;
    },

    //  IMPORTANT: invalidate đúng key theo use-san-pham.ts + kho nguyên liệu
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });

      // kho nguyên liệu
      qc.invalidateQueries({ queryKey: ["materials-stock-map"] });

      // list sản phẩm (đúng theo use-san-pham.ts)
      qc.invalidateQueries({ queryKey: ["san-pham-list"] });

      // sản phẩm theo id đang duyệt (đúng theo use-san-pham.ts)
      const spId = vars?.order?.sp_id;
      if (spId) {
        qc.invalidateQueries({ queryKey: ["san-pham-by-id", spId] });
      }
    },
  });
}

export function useRejectProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      approverName: string;
      reason: string;
    }) => {
      const r = poReject(payload.id, payload.approverName, payload.reason);
      if (!r) throw new Error("Không tìm thấy đơn");
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
    },
  });
}
