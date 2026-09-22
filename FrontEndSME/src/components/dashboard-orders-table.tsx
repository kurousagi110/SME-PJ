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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Search } from "lucide-react";

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
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="size-4" />
              </div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Sổ Chứng Từ & Giao Dịch Gần Đây
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Truy xuất lịch sử nhập xuất, mua bán vật tư và thành phẩm theo thời gian thực.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Trang trước
            </Button>

            <div className="text-xs font-medium text-muted-foreground px-1">
              {page} / {totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm mã đơn, KH, NCC..."
              className="pl-8 h-9 text-xs rounded-xl"
            />
          </div>

          <Select
            value={loaiDon}
            onValueChange={(v: any) => {
              setLoaiDon(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[220px] h-9 text-xs rounded-xl">
              <SelectValue placeholder="Loại chứng từ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả chứng từ</SelectItem>
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
            <SelectTrigger className="w-full md:w-[120px] h-9 text-xs rounded-xl">
              <SelectValue placeholder="Năm" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  Năm {y}
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
            <SelectTrigger className="w-full md:w-[110px] h-9 text-xs rounded-xl">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((x) => (
                <SelectItem key={x} value={String(x)}>
                  {x} dòng
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
            Lỗi lấy dữ liệu: {(error as any)?.message || "API error"}
          </div>
        ) : null}

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <DataTable data={data?.items ?? []} loading={isLoading} />
        </div>
      </CardContent>
    </Card>
  );
}
