"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchChamCongByDate, upsertChamCong } from "@/app/actions/check-in";

function normalizeChamCongItems(raw: any): any[] {
  const root = raw?.data ?? raw;

  // backend bạn có thể trả: { items: [] } hoặc { data: { items: [] } } hoặc []
  const items =
    root?.items ??
    root?.data?.items ??
    root?.data ??
    (Array.isArray(root) ? root : []);

  return Array.isArray(items) ? items : [];
}

export function useChamCongByDate(ngay_thang: string) {
  return useQuery({
    queryKey: ["chamcong-by-date", ngay_thang],
    enabled: !!ngay_thang,
    queryFn: async () => {
      const raw = await fetchChamCongByDate({ ngay_thang });
      return { items: normalizeChamCongItems(raw) };
    },
    staleTime: 5_000,
    retry: 0,
  });
}

export function useUpsertChamCong(ngay_thang: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      return await upsertChamCong(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chamcong-by-date", ngay_thang] });
    },
  });
}
