"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStaff,
  fetchStaffById,
  createStaff,
  updateStaffById,
  deleteStaff,
} from "@/app/actions/staff";
import { toast } from "sonner";

// 🟩 Lấy danh sách nhân viên
export function useStaffList(params: {
  name: string;
  page: number;
  limit: number;
  department?: string;
  position?: string;
}) {
  return useQuery({
    queryKey: ["staff", params],
    queryFn: () => fetchStaff(params),
  });
}

// 🟩 Lấy chi tiết nhân viên
export function useStaffById(id: string) {
  return useQuery({
    queryKey: ["staff", id],
    queryFn: () => fetchStaffById(id),
    enabled: !!id,
  });
}

// 🟩 Tạo nhân viên
export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: any) => {
      toast.error(error.message); // nếu bạn dùng sonner hoặc toast
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; phong_ban?: any; chuc_vu?: any }) =>
      updateStaffById(data.id, data.phong_ban, data.chuc_vu),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: any) => {
      toast.error(error.message); // nếu bạn dùng sonner hoặc toast
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
