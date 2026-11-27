"use server";

import { http } from "@/lib/http";

export interface WarehouseItem {
  _id: string;
  code: string;
  name: string;
  type: string;
  address?: string;
  manager_name?: string;
  is_active: boolean;
  sku_count?: number;
  total_qty?: number;
  low_stock_count?: number;
}

export interface WarehouseStockItem {
  _id: string;
  warehouse_code: string;
  item_type: "san_pham" | "nguyen_lieu";
  item_id: string;
  item_code: string;
  item_name: string;
  unit?: string;
  so_luong: number;
  bin_location?: string;
  min_stock?: number;
}

export interface StockTransferLine {
  item_id: string;
  item_type: "san_pham" | "nguyen_lieu";
  item_code: string;
  item_name: string;
  unit?: string;
  quantity: number;
  received_qty?: number;
  loss_qty?: number;
  from_bin?: string;
  to_bin?: string;
}

export interface StockTransferItem {
  _id: string;
  ma_phieu: string;
  from_warehouse: string;
  to_warehouse: string;
  items: StockTransferLine[];
  trang_thai: "draft" | "in_transit" | "received" | "cancelled";
  ghi_chu?: string;
  receipt_summary?: {
    total_dispatched: number;
    total_received: number;
    total_loss: number;
    has_discrepancy: boolean;
  };
  created_by?: { ho_ten?: string };
  created_at: string;
  dispatched_at?: string | null;
  received_at?: string | null;
}

export async function fetchWarehousesAction(): Promise<{
  success: boolean;
  items?: WarehouseItem[];
  error?: string;
}> {
  try {
    const res = await http.get<{ data: WarehouseItem[] }>("/warehouses");
    return { success: true, items: res?.data || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải danh sách kho" };
  }
}

export async function createWarehouseAction(payload: {
  code: string;
  name: string;
  type?: string;
  address?: string;
  manager_name?: string;
}): Promise<{ success: boolean; data?: WarehouseItem; error?: string }> {
  try {
    const res = await http.post<{ data: WarehouseItem }>("/warehouses", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Tạo kho thất bại" };
  }
}

export async function fetchWarehouseStocksAction(params: {
  warehouseCode?: string;
  itemType?: string;
  q?: string;
} = {}): Promise<{ success: boolean; items?: WarehouseStockItem[]; error?: string }> {
  try {
    const query = new URLSearchParams();
    if (params.warehouseCode) query.set("warehouseCode", params.warehouseCode);
    if (params.itemType) query.set("itemType", params.itemType);
    if (params.q) query.set("q", params.q);
    const res = await http.get<{ data: { items: WarehouseStockItem[] } }>(`/warehouses/stocks?${query.toString()}`);
    return { success: true, items: res?.data?.items || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải tồn kho theo kho" };
  }
}

export async function syncInitialWarehouseStocksAction(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await http.post<{ message?: string }>("/warehouses/stocks/sync-initial", {});
    return { success: true, message: res?.message };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Đồng bộ kho thất bại" };
  }
}

export async function updateStockBinAction(payload: {
  warehouse_code: string;
  item_type: "san_pham" | "nguyen_lieu";
  item_id: string;
  bin_location: string;
  min_stock?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await http.put("/warehouses/stocks/bin", payload);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Cập nhật vị trí kệ thất bại" };
  }
}

export async function fetchStockTransfersAction(params: { status?: string; warehouseCode?: string } = {}): Promise<{
  success: boolean;
  items?: StockTransferItem[];
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.warehouseCode) query.set("warehouseCode", params.warehouseCode);
    const res = await http.get<{ data: { items: StockTransferItem[] } }>(`/warehouses/transfers?${query.toString()}`);
    return { success: true, items: res?.data?.items || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Không thể tải phiếu chuyển kho" };
  }
}

export async function createStockTransferAction(payload: {
  from_warehouse: string;
  to_warehouse: string;
  items: StockTransferLine[];
  ghi_chu?: string;
}): Promise<{ success: boolean; data?: StockTransferItem; error?: string }> {
  try {
    const res = await http.post<{ data: StockTransferItem }>("/warehouses/transfers", payload);
    return { success: true, data: res?.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Tạo phiếu chuyển kho thất bại" };
  }
}

export async function dispatchStockTransferAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post(`/warehouses/transfers/${id}/dispatch`, {});
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Xuất chuyển kho thất bại" };
  }
}

export async function receiveStockTransferAction(
  id: string,
  payload: { received_items?: { item_id: string; item_type: string; received_qty: number }[]; ghi_chu?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post(`/warehouses/transfers/${id}/receive`, payload);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Xác nhận nhập kho thất bại" };
  }
}

export async function cancelStockTransferAction(id: string, ly_do = ""): Promise<{ success: boolean; error?: string }> {
  try {
    await http.post(`/warehouses/transfers/${id}/cancel`, { ly_do });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Hủy phiếu chuyển kho thất bại" };
  }
}
