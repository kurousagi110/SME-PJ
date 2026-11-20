"use server";

import { http } from "@/lib/http";
import { updateProfile } from "./auth";
export async function fetchStaff(params: {
  name: string;
  page: number;
  limit: number;
  department?: string;
  position?: string;
}) {
  try {
    const query = new URLSearchParams({
      q: params.name || "",
      page: String(params.page),
      limit: String(params.limit),
      ...(params.department ? { phong_ban: params.department } : {}),
      ...(params.position ? { chuc_vu: params.position } : {}),
    });

    const result = await http.get(`/users?${query.toString()}&trang_thai=1`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Lấy danh sách nhân viên không thành công");
  }
}
export async function fetchStaffById(id: string) {
  try {
    const result = await http.get(`/users/${id}`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Lấy thông tin nhân viên không thành công");
  }
}
export async function createStaff(data: any) {
  try {
    const result = await http.post("/users/admin-create", data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Tạo nhân viên không thành công");
  }
}
export async function setStaffRole(
  id: string,
  role: string,
  quyen_han?: string[]
) {
  try {
    const result = await http.put(`/users/${id}/role`, { role, quyen_han });
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật phân quyền không thành công");
  }
}
export async function setStaffPosition(id: string, data: any) {
  try {
    const result = await http.put(`/users/${id}/chuc-vu`, data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật chức vụ không thành công");
  }
}
export async function setStaffDepartment(id: string, data: any) {
  try {
    const result = await http.put(`/users/${id}/phong-ban`, data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật phòng ban không thành công");
  }
}
export async function updateStaffById(
  id: string,
  phong_ban?: any,
  chuc_vu?: any,
  role?: string,
  quyen_han?: string[]
) {
  try {
    if (phong_ban) {
      await setStaffDepartment(id, phong_ban);
    }
    if (chuc_vu) {
      await setStaffPosition(id, chuc_vu);
    }
    if (role !== undefined || quyen_han !== undefined) {
      await setStaffRole(id, role || "user", quyen_han);
    }
    return { success: true };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật nhân viên không thành công");
  }
}

export async function deleteStaff(id: string) {
  try {
    const result = await http.delete(`/users/${id}`);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Xóa nhân viên không thành công");
  }
}
