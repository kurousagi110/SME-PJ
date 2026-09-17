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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Tổng doanh thu bán hàng */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tổng Doanh Thu
          </CardTitle>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {toVND(totalRevenue)}
          </div>
          <div className="flex items-center text-xs text-emerald-600 font-medium mt-1">
            <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
            <span>Đơn bán hàng đã xác nhận</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Chi phí nhập vật tư (COGS) */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chi Phí Nhập Vật Tư
          </CardTitle>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
            <ShoppingCart className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {toVND(totalPurchases)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tổng vốn nguyên liệu đã nhập kho
          </p>
        </CardContent>
      </Card>

      {/* 3. Lợi nhuận gộp ước tính */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Lợi Nhuận Gộp (Gross)
          </CardTitle>
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {toVND(grossProfit)}
          </div>
          <div className="flex items-center text-xs text-purple-600 font-medium mt-1">
            <span>Tỷ suất biên: <strong>{profitMargin}%</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Cảnh báo tồn kho */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cảnh Báo Kho An Toàn
          </CardTitle>
          <div
            className={`p-2 rounded-lg ${
              lowStockCount > 0
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
            }`}
          >
            {lowStockCount > 0 ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {lowStockCount > 0 ? `${lowStockCount} mặt hàng` : "An toàn"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {lowStockCount > 0
              ? "Cần tạo đơn nhập hoặc sản xuất bù"
              : "Tất cả mặt hàng đều đạt định mức"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
