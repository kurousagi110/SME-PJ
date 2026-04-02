"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DataTable } from "@/components/data-table";
import { fetchDashboardTable } from "@/app/actions/dashbroard";

type OrderType = "ALL" | "sale" | "prod_receipt" | "purchase_receipt";

const currentYear = new Date().getFullYear(); // 2026
const yearOptions = Array.from({ length: 6 }, (_, i) => String(currentYear - (5 - i))); // 2021..2026

export default function DashboardOrdersTable() {
  const [year, setYear] = React.useState(String(currentYear));
  const [loaiDon, setLoaiDon] = React.useState<OrderType>("ALL");
  const [q, setQ] = React.useState("");

  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-table", year, loaiDon, q, page, limit],
    queryFn: async () => {
      return fetchDashboardTable({
        year: Number(year),
        loai_don: loaiDon,
        q,
        page,
        limit,
      });
    },
    staleTime: 5_000,
    retry: 0,
  });

  const totalPages = Number(data?.totalPages ?? 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo mã chứng từ / KH / NCC..."
            className="md:max-w-[320px]"
          />

          <Select
            value={loaiDon}
            onValueChange={(v: any) => {
              setLoaiDon(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Loại chứng từ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="purchase_receipt">Nhập mua (NL/SP)</SelectItem>
              <SelectItem value="prod_receipt">Nhập thành phẩm (SX)</SelectItem>
              <SelectItem value="sale">Đơn bán hàng</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={year}
            onValueChange={(v) => {
              setYear(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Năm" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setLimit(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((x) => (
                <SelectItem key={x} value={String(x)}>
                  {x}/trang
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>

          <div className="text-sm text-muted-foreground">
            Trang <b>{page}</b> / {totalPages}
          </div>

          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border p-4 text-sm text-rose-600">
          Lỗi lấy dữ liệu: {(error as any)?.message || "API error"}
        </div>
      ) : null}

      <DataTable data={data?.items ?? []} loading={isLoading} />
    </div>
  );
}
