"use server";
import { http } from "@/lib/http";

export async function fetchOrderSaleList(params?: {
  customer_name: string;
  status?: string;
  type?: string;
  page: number;
  limit: number;
}) {
  const query = new URLSearchParams({
    q: params?.customer_name || "",
    ...(params?.status ? { trang_thai: params.status } : {}),
    ...(params?.type ? { loai_don: params.type } : {}),
    page: String(params?.page || 1),
    limit: String(params?.limit || 20),
  });
  try {
    const result = await http.get("/don-hang/?" + query.toString());
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(
      err.message || "Lấy danh sách đơn hàng bán không thành công"
    );
  }
}

export async function fetchOrderSaleById(id: string) {
  try {
    const result = await http.get(`/don-hang/${id}`);
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(
      err.message || "Lấy thông tin đơn hàng bán không thành công"
    );
  }
}

export async function createOrderSale(data: any) {
  try {
    const result = await http.post("/don-hang/sales", data);
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(err.message || "Tạo đơn hàng bán không thành công");
  }
}

export async function updateOrderSaleStatusById(id: string, data: any) {
  try {
    const result = await http.post(`/don-hang/${id}/status`, data);
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(
      err.message || "Cập nhật trạng thái đơn hàng bán không thành công"
    );
  }
}
