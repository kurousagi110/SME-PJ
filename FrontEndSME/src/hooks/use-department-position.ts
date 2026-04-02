import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDepartment,
  deleteDepartment,
  fetchDepartmentById,
  fetchDepartments,
  updateDepartment,
} from "@/app/actions/department";
import { use } from "react";
import {
  createPosition,
  deletePosition,
  updatePosition,
} from "@/app/actions/position";
import { toast } from "sonner";

export function useDepartmentsAndPositions(params?: {
  name?: string;
  page?: number;
  limit?: number;
  status?: number;
}) {
  return useQuery({
    queryKey: ["departments-positions", params],
    queryFn: () => fetchDepartments(params),
  });
}

export function useDepartmentById(idDepartment: string) {
  return useQuery({
    queryKey: ["department", idDepartment],
    queryFn: () => fetchDepartmentById(idDepartment),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-positions"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
export function useUpdateDepartments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idDepartment, data }: { idDepartment: string; data: any }) =>
      updateDepartment(idDepartment, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-positions"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idDepartment: string) => deleteDepartment(idDepartment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-positions"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idDepartment, data }: { idDepartment: string; data: any }) =>
      createPosition(idDepartment, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idDepartment,
      idPosition,
      data,
    }: {
      idDepartment: string;
      idPosition: string;
      data: any;
    }) => updatePosition(idDepartment, idPosition, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
export function useDeletePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idDepartment,
      idPosition,
    }: {
      idDepartment: string;
      idPosition: string;
    }) => deletePosition(idDepartment, idPosition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
