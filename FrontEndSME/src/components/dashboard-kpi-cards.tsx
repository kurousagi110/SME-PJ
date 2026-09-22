"use client";

import * as React from "react";
import {
  TrendingUp,
  DollarSign,
  PackageCheck,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardOrdersTable } from "@/app/actions/dashbroard";
import { useProductStockList } from "@/hooks/use-product";
import { useMaterialStockList } from "@/hooks/use-material";

export function DashboardKpiCards() {
  // Fetch sales orders
  const { data: salesData } = useQuery({
    queryKey: ["dashboard-kpi-sales"],
    queryFn: () =>
      fetchDashboardOrdersTable({
        loai_don: "sale",
        page: 1,
        limit: 100,
      }),
  });

  // Fetch purchase orders
  const { data: purchaseData } = useQuery({
    queryKey: ["dashboard-kpi-purchases"],
    queryFn: () =>
      fetchDashboardOrdersTable({
        loai_don: "purchase_receipt",
        page: 1,
        limit: 100,
      }),
  });

  // Stock status
  const { data: productStockData } = useProductStockList({
    name: "",
    page: 1,
    limit: 100,
  });

  const { data: materialStockData } = useMaterialStockList({
    name: "",
    page: 1,
    limit: 100,
  });

  const { totalRevenue, totalPurchases, grossProfit, profitMargin } =
    React.useMemo(() => {
      const sales = ((salesData as any)?.data || []) as any[];
      const purchases = ((purchaseData as any)?.data || []) as any[];

      const rev = sales
        .filter((s) => s.trang_thai !== "cancelled")
        .reduce((sum, s) => sum + Number(s.tong_tien ?? 0), 0);

      const cost = purchases
        .filter((p) => p.trang_thai !== "cancelled")
        .reduce((sum, p) => sum + Number(p.tong_tien ?? 0), 0);

      const profit = rev - cost;
      const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0";

      return {
        totalRevenue: rev,
        totalPurchases: cost,
        grossProfit: profit,
        profitMargin: margin,
      };
    }, [salesData, purchaseData]);

  const lowStockCount = React.useMemo(() => {
    const pItems = ((productStockData as any)?.items || []) as any[];
    const mItems = ((materialStockData as any)?.items || []) as any[];

    const pLow = pItems.filter(
      (p) => Number(p.so_luong ?? 0) <= Number(p.ton_toi_thieu ?? 0) && Number(p.ton_toi_thieu ?? 0) > 0
    ).length;

    const mLow = mItems.filter(
      (m) => Number(m.so_luong ?? 0) <= Number(m.ton_toi_thieu ?? 0) && Number(m.ton_toi_thieu ?? 0) > 0
    ).length;

    return pLow + mLow;
  }, [productStockData, materialStockData]);

  const toVND = (n: number) => n.toLocaleString("vi-VN") + " đ";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. Tổng doanh thu bán hàng */}
      <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/60 p-1 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tổng Doanh Thu
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 shadow-xs">
            <DollarSign className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {toVND(totalRevenue)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
              Doanh thu ròng
            </span>
            <span className="text-muted-foreground text-[11px] truncate">
              Từ đơn bán đã duyệt
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Chi phí nhập vật tư (COGS) */}
      <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/60 p-1 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-md">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Chi Phí Nhập Kho
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 shadow-xs">
            <ShoppingCart className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {toVND(totalPurchases)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 font-medium text-blue-600 dark:text-blue-400">
              Nguyên vật liệu
            </span>
            <span className="text-muted-foreground text-[11px] truncate">
              Vốn hàng đã nhập
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Lợi nhuận gộp ước tính */}
      <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/60 p-1 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-md">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Lợi Nhuận Gộp
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20 shadow-xs">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {toVND(grossProfit)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 font-semibold text-violet-600 dark:text-violet-400">
              Biên LN: {profitMargin}%
            </span>
            <span className="text-muted-foreground text-[11px] truncate">
              Ước tính theo đơn hàng
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Cảnh báo tồn kho */}
      <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/60 p-1 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md">
        <div
          className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
            lowStockCount > 0
              ? "from-amber-500 via-orange-500 to-amber-400"
              : "from-emerald-500 via-teal-500 to-emerald-400"
          }`}
        />
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cảnh Báo Tồn Kho
          </CardTitle>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-xs ring-1 ${
              lowStockCount > 0
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
            }`}
          >
            {lowStockCount > 0 ? (
              <AlertTriangle className="h-4.5 w-4.5" />
            ) : (
              <ShieldCheck className="h-4.5 w-4.5" />
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div
            className={`text-2xl lg:text-3xl font-bold tracking-tight tabular-nums ${
              lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {lowStockCount > 0 ? `${lowStockCount} mặt hàng` : "Đạt định mức"}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                lowStockCount > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {lowStockCount > 0 ? "Dưới mức tối thiểu" : "Kho an toàn"}
            </span>
            <span className="text-muted-foreground text-[11px] truncate">
              {lowStockCount > 0 ? "Cần bổ sung" : "100% khả dụng"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
