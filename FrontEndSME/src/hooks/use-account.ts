"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { myProfile, updateProfile, updatePassword } from "@/app/actions/auth";

// Lấy thông tin tài khoản
export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const res = await myProfile();
      return res.data;
    },
    enabled: typeof window !== "undefined",
  });
}

// Cập nhật thông tin tài khoản
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

// Đổi mật khẩu
export function useUpdatePassword() {
  return useMutation({
    mutationFn: updatePassword,
  });
}
