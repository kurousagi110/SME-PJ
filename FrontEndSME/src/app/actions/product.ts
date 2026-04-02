"use server";
import { http } from "@/lib/http";

export async function fetchProductList(params?: {
  name: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const query = new URLSearchParams({
    q: params?.name || "",
    ...(params?.status ? { status: params.status } : {}),
    page: String(params?.page || 1),
    limit: String(params?.limit || 20),
  });
  try {
    const result = await http.get(`/san-pham?${query.toString()}`);
    return { success: true, data: result.data, pagination: result.pagination };
  } catch (err: any) {
    throw new Error(err.message || "Lấy danh sách sản phẩm không thành công");
  }
}

export async function fetchProductById(id: string) {
  try {
    const result = await http.get(`/san-pham/${id}`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Lấy thông tin sản phẩm không thành công");
  }
}

export async function createProduct(data: any) {
  try {
    const result = await http.post("/san-pham", data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Tạo sản phẩm không thành công");
  }
}

export async function updateProductById(id: string, data: any) {
  try {
    const result = await http.patch(`/san-pham/${id}`, data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật sản phẩm không thành công");
  }
}

export async function deleteProductById(id: string) {
  try {
    await http.delete(`/san-pham/${id}/hard`);
    return { success: true };
  } catch (err: any) {
    throw new Error(err.message || "Xóa sản phẩm không thành công");
  }
}

export async function fetchProductStockList(params?: {
  name: string;
  page: number;
  limit: number;
}) {
  const query = new URLSearchParams({
    q: params?.name || "",
    page: String(params?.page || 1),
    limit: String(params?.limit || 20),
  });
  try {
    const result = await http.get(`/san-pham/stock?${query.toString()}`);
    return { success: true, data: result.data, pagination: result.pagination };
  } catch (err: any) {
    throw new Error(
      err.message || "Lấy danh sách tồn kho sản phẩm không thành công"
    );
  }
}
