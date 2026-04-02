"use server";
import { http } from "@/lib/http";

export async function fetchMaterialList(params?: {
  name: string;
  status?: string;
  low_stock?: boolean;
  page: number;
  limit: number;
}) {
  const query = new URLSearchParams({
    q: params?.name || "",
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.low_stock ? { lowStockOnly: String(params.low_stock) } : {}),
    page: String(params?.page || 1),
    limit: String(params?.limit || 20),
  });
  try {
    const result = await http.get(`/nguyen-lieu?${query.toString()}`);
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(
      err.message || "Lấy danh sách nguyên liệu không thành công"
    );
  }
}

export async function fetchMaterialById(id: string) {
  try {
    const result = await http.get(`/nguyen-lieu/${id}`);
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(
      err.message || "Lấy thông tin nguyên liệu không thành công"
    );
  }
}

export async function createMaterial(data: any) {
  try {
    const result = await http.post("/nguyen-lieu", data);
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(err.message || "Tạo nguyên liệu không thành công");
  }
}

export async function updateMaterialById(id: string, data: any) {
  try {
    const result = await http.patch(`/nguyen-lieu/${id}`, data);
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật nguyên liệu không thành công");
  }
}

export async function deleteMaterialById(id: string) {
  try {
    await http.delete(`/nguyen-lieu/${id}`);
    return { success: true };
  } catch (err: any) {
    throw new Error(err.message || "Xóa nguyên liệu không thành công");
  }
}

export async function fetchMaterialStockList(params?: {
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
    const result = await http.get(`/nguyen-lieu/stock?${query.toString()}`);
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(
      err.message || "Lấy danh sách tồn kho nguyên liệu không thành công"
    );
  }
}
