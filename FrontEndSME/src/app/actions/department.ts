"use server";

import { http } from "@/lib/http";
export async function fetchDepartments(params?: {
  name?: string;
  page?: number;
  limit?: number;
  status?: number;
}) {
  try {
    const query = new URLSearchParams({
      ...(params?.name ? { q: params.name } : {}),
      ...(params?.page ? { page: String(params.page) } : {}),
      ...(params?.limit ? { limit: String(params.limit) } : {}),
      ...(params?.status ? { status: String(params.status) } : {}),
    });

    const result = await http.get(`/phongban-chucvu?${query.toString()}`);
    return { success: true, data: result.data, pagination: result.pagination };
  } catch (err: any) {
    throw new Error(err.message || "Lấy danh sách phòng ban không thành công");
  }
}

export async function fetchDepartmentById(id: string) {
  try {
    const result = await http.get(`/phongban-chucvu/${id}`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Lấy thông tin phòng ban không thành công");
  }
}

export async function createDepartment(data: any) {
  try {
    const result = await http.post("/phongban-chucvu", data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Tạo phòng ban không thành công");
  }
}

export async function updateDepartment(id: string, data: any) {
  try {
    const result = await http.patch(`/phongban-chucvu/${id}`, data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật phòng ban không thành công");
  }
}
export async function deleteDepartment(id: string) {
  try {
    const result = await http.delete(`/phongban-chucvu/${id}/hard`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Xóa phòng ban không thành công");
  }
}

export async function resoreDepartment(id: string) {
  try {
    const result = await http.post(`/phongban-chucvu/${id}/restore`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Khôi phục phòng ban không thành công");
  }
}

export async function hardDeleteDepartment(id: string) {
  try {
    const result = await http.delete(`/phongban-chucvu/${id}/hard`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Xóa vĩnh viễn phòng ban không thành công");
  }
}
