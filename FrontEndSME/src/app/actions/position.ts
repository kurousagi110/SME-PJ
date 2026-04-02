"use server";

import { http } from "@/lib/http";

export async function createPosition(idDepartment: string, data: any) {
  try {
    const result = await http.post(
      `/phongban-chucvu/${idDepartment}/chuc-vu`,
      data
    );
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(err.message || "Tạo chức vụ không thành công");
  }
}

export async function updatePosition(
  idDepartment: string,
  idPosition: string,
  data: any
) {
  try {
    const result = await http.patch(
      `/phongban-chucvu/${idDepartment}/chuc-vu/${idPosition}`,
      data
    );
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật chức vụ không thành công");
  }
}
export async function deletePosition(idDepartment: string, idPosition: string) {
  try {
    const result = await http.delete(
      `/phongban-chucvu/${idDepartment}/chuc-vu/${idPosition}`
    );
    return { success: true, data: result };
  } catch (err: any) {
    throw new Error(err.message || "Xóa chức vụ không thành công");
  }
}
