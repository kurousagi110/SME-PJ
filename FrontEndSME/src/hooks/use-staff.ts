"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchStaff,
  fetchStaffById,
  createStaff,
  updateStaffById,
  deleteStaff,
} from "@/app/actions/staff";
import type { Staff, StaffListParams, Department, Position } from "@/types";

export function useStaffList(params: StaffListParams) {
  return useQuery<{ data: Staff[]; pagination?: unknown }>({
    queryKey: ["staff", params],
    queryFn: () => fetchStaff(params as any),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStaffById(id: string) {
  return useQuery<Staff>({
    queryKey: ["staff", id],
    queryFn: async () => {
      const res = await fetchStaffById(id);
      return res.data as Staff;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Staff>) => createStaff(data),
    onSuccess: () => {
      toast.success("Tạo nhân viên thành công");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Tạo nhân viên thất bại");
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; phong_ban?: Department; chuc_vu?: Position }) =>
      updateStaffById(data.id, data.phong_ban, data.chuc_vu),
    onSuccess: () => {
      toast.success("Cập nhật nhân viên thành công");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Cập nhật nhân viên thất bại");
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      toast.success("Xóa nhân viên thành công");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Xóa nhân viên thất bại");
    },
  });
}
