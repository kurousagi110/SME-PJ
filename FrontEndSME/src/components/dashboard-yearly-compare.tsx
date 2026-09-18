"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingCart,
  Layers,
  Scale,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchDashboardYearlyCompare } from "@/app/actions/dashbroard";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => String(currentYear - (5 - i)));

export function DashboardYearlyCompare() {
  const [yearA, setYearA] = React.useState<string>(String(currentYear));
  const [yearB, setYearB] = React.useState<string>(String(currentYear - 1));

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-yearly-compare", yearA, yearB],
    queryFn: () =>
      fetchDashboardYearlyCompare({
        yearA: Number(yearA),
        yearB: yearB === "none" ? null : Number(yearB),
      }),
    staleTime: 30_000,
  });

  const toVND = (n: number) => n.toLocaleString("vi-VN") + " đ";

  const dataA = data?.dataA;
  const dataB = data?.dataB;
  const comp = data?.comparison;

  const renderGrowthBadge = (val?: number) => {
    if (val === undefined || val === null || yearB === "none") return null;
    const isPositive = val >= 0;
    return (
      <Badge
        variant="outline"
        className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isPositive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
        }`}
      >
        {isPositive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        <span>{isPositive ? `+${val}%` : `${val}%`}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with year selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Tổng Quan So Sánh Tài Chính Giữa 2 Năm (YoY)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Phân tích biến động doanh thu, chi phí nhập hàng, lợi nhuận gộp và sản lượng giữa Năm A và Năm B.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Năm A:</span>
            <Select value={yearA} onValueChange={setYearA}>
              <SelectTrigger className="w-28 font-semibold" size="sm">
                <SelectValue placeholder="Năm A" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-muted-foreground font-bold">vs</span>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Năm B:</span>
            <Select value={yearB} onValueChange={setYearB}>
              <SelectTrigger className="w-32 font-semibold" size="sm">
                <SelectValue placeholder="Năm B" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không so sánh</SelectItem>
                {years
                  .filter((y) => y !== yearA)
                  .map((y) => (
                    <SelectItem key={y} value={y}>
                      Năm {y}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 4 Financial & Operational Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Doanh thu bán hàng */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Doanh Thu Bán Hàng
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : toVND(dataA?.totalRevenue ?? 0)}
              </div>
              {renderGrowthBadge(comp?.revenueGrowth)}
            </div>
            {yearB !== "none" && (
              <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t border-dashed">
                <span>Năm {yearB}:</span>
                <span className="font-medium text-foreground">
                  {isLoading ? "..." : toVND(dataB?.totalRevenue ?? 0)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Chi phí nhập vật tư / hàng */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chi Phí Nhập Vật Tư
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : toVND(dataA?.totalPurchaseCost ?? 0)}
              </div>
              {renderGrowthBadge(comp?.costGrowth)}
            </div>
            {yearB !== "none" && (
              <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t border-dashed">
                <span>Năm {yearB}:</span>
                <span className="font-medium text-foreground">
                  {isLoading ? "..." : toVND(dataB?.totalPurchaseCost ?? 0)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Lợi nhuận gộp ước tính */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lợi Nhuận Gộp (Gross)
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : toVND(dataA?.grossProfit ?? 0)}
              </div>
              {renderGrowthBadge(comp?.profitGrowth)}
            </div>
            <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t border-dashed">
              <span>Tỷ suất biên:</span>
              <span className="font-semibold text-purple-600">
                {dataA?.profitMargin ?? 0}%
                {yearB !== "none" && dataB && (
                  <span className="text-muted-foreground font-normal ml-1">
                    (vs {dataB.profitMargin}%)
                  </span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Tổng sản lượng đơn bán */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Số Lượng Đơn Bán
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : `${dataA?.totalSalesOrders ?? 0} đơn`}
              </div>
              {renderGrowthBadge(comp?.ordersGrowth)}
            </div>
            {yearB !== "none" && (
              <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t border-dashed">
                <span>Năm {yearB}:</span>
                <span className="font-medium text-foreground">
                  {isLoading ? "..." : `${dataB?.totalSalesOrders ?? 0} đơn`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Table */}
      {yearB !== "none" && data?.monthlyTrends && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              Chi Tiết Doanh Thu & Lợi Nhuận Theo Từng Tháng: Năm {yearA} vs Năm {yearB}
            </CardTitle>
            <CardDescription className="text-xs">
              Bảng đối soát 12 tháng giúp nhận diện tính mùa vụ và nhịp độ tăng trưởng kinh doanh.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold w-24">Tháng</TableHead>
                  <TableHead className="text-right font-semibold">Doanh thu {yearA}</TableHead>
                  <TableHead className="text-right font-semibold">Doanh thu {yearB}</TableHead>
                  <TableHead className="text-right font-semibold">Chênh lệch</TableHead>
                  <TableHead className="text-right font-semibold">Lợi nhuận {yearA}</TableHead>
                  <TableHead className="text-right font-semibold">Lợi nhuận {yearB}</TableHead>
                  <TableHead className="text-center font-semibold w-24">Số đơn ({yearA}/{yearB})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {data.monthlyTrends.map((row) => {
                  const diff = row.revenueA - row.revenueB;
                  const isDiffPos = diff >= 0;
                  return (
                    <TableRow key={row.month} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{row.monthLabel}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {toVND(row.revenueA)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {toVND(row.revenueB)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          isDiffPos ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isDiffPos ? `+${toVND(diff)}` : toVND(diff)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-purple-600">
                        {toVND(row.profitA)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {toVND(row.profitB)}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        <span className="font-bold text-foreground">{row.ordersA}</span> / {row.ordersB}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
