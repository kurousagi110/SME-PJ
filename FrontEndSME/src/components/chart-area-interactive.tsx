"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

import { fetchDashboardChartCompare } from "@/app/actions/dashbroard";

type ChartRow = {
  date: string; // YYYY-MM-DD
  yearA: number;
  yearB: number;
};

const currentYear = new Date().getFullYear(); // 2026
const years = Array.from({ length: 6 }, (_, i) => String(currentYear - (5 - i))); // 2021..2026

function MetricCard({
  title,
  subtitle,
  loai_don,
}: {
  title: string;
  subtitle: string;
  loai_don: "purchase_receipt" | "prod_receipt" | "sale";
}) {
  const isMobile = useIsMobile();

  const [timeRange, setTimeRange] = React.useState<"1y" | "90d" | "30d" | "7d">("90d");
  const [yearA, setYearA] = React.useState(String(currentYear));
  const [yearB, setYearB] = React.useState<string>(String(currentYear - 1));
  const [valueType, setValueType] = React.useState<"count" | "amount">(
    loai_don === "sale" ? "amount" : "count"
  );

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const { data = [], isLoading, error } = useQuery<ChartRow[]>({
    queryKey: ["dash-chart", loai_don, yearA, yearB, timeRange, valueType],
    queryFn: async () => {
      const rows = await fetchDashboardChartCompare({
        loai_don,
        yearA: Number(yearA),
        yearB: yearB === "none" ? null : Number(yearB),
        timeRange,
        valueType,
      });
      return rows as ChartRow[];
    },
    staleTime: 10_000,
    retry: 0,
  });

  // Calculate totals and YoY growth
  const totalA = React.useMemo(() => data.reduce((s, r) => s + (r.yearA || 0), 0), [data]);
  const totalB = React.useMemo(() => data.reduce((s, r) => s + (r.yearB || 0), 0), [data]);

  const growthPct = React.useMemo(() => {
    if (yearB === "none" || totalB === 0) return null;
    return Number((((totalA - totalB) / totalB) * 100).toFixed(1));
  }, [totalA, totalB, yearB]);

  const chartConfig = {
    yearA: { label: `Năm ${yearA}`, color: "#10b981" }, // Emerald
    yearB: { label: yearB === "none" ? "Năm B" : `Năm ${yearB}`, color: "#f59e0b" }, // Amber
  } satisfies ChartConfig;

  const formatValue = (val: number) => {
    if (valueType === "amount") {
      if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Tỷ`;
      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} Tr`;
      return val.toLocaleString("vi-VN") + " đ";
    }
    return `${val.toLocaleString("vi-VN")} đơn`;
  };

  return (
    <Card className="@container/card border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold">{title}</CardTitle>
              {growthPct !== null && (
                <Badge
                  variant="outline"
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    growthPct >= 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}
                >
                  {growthPct >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  <span>{growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`} YoY</span>
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>
          </div>

          {/* Quick stats preview */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-muted-foreground">Năm {yearA}:</span>
              <span className="font-bold text-foreground">{formatValue(totalA)}</span>
            </div>
            {yearB !== "none" && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-muted-foreground">Năm {yearB}:</span>
                <span className="font-bold text-foreground">{formatValue(totalB)}</span>
              </div>
            )}
          </div>
        </div>

        <CardAction className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-dashed">
          {/* Toggle Type: Tiền vs Số đơn */}
          <ToggleGroup
            type="single"
            value={valueType}
            onValueChange={(v) => v && setValueType(v as any)}
            variant="outline"
            size="sm"
            className="*:data-[slot=toggle-group-item]:!px-3 text-xs"
          >
            <ToggleGroupItem value="amount">Số tiền (VNĐ)</ToggleGroupItem>
            <ToggleGroupItem value="count">Số đơn</ToggleGroupItem>
          </ToggleGroup>

          {/* Range toggle (desktop) */}
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(v) => v && setTimeRange(v as any)}
            variant="outline"
            size="sm"
            className="hidden *:data-[slot=toggle-group-item]:!px-3 @[767px]/card:flex text-xs"
          >
            <ToggleGroupItem value="1y">1 năm</ToggleGroupItem>
            <ToggleGroupItem value="90d">90 ngày</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 ngày</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 ngày</ToggleGroupItem>
          </ToggleGroup>

          {/* Range select (mobile) */}
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger
              className="w-28 @[767px]/card:hidden text-xs"
              size="sm"
              aria-label="Chọn khoảng thời gian"
            >
              <SelectValue placeholder="90 ngày" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1y" className="rounded-lg">
                1 năm
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                90 ngày
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 ngày
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 ngày
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Year A */}
          <Select value={yearA} onValueChange={setYearA}>
            <SelectTrigger className="w-28 text-xs font-medium" size="sm" aria-label="Chọn năm A">
              <SelectValue placeholder="Năm A" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {years.map((y) => (
                <SelectItem key={y} value={y} className="rounded-lg">
                  Năm {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground font-semibold">vs</span>

          {/* Year B */}
          <Select value={yearB} onValueChange={setYearB}>
            <SelectTrigger className="w-32 text-xs font-medium" size="sm" aria-label="So sánh năm B">
              <SelectValue placeholder="So sánh" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="none" className="rounded-lg">
                Không so sánh
              </SelectItem>
              {years
                .filter((y) => y !== yearA)
                .map((y) => (
                  <SelectItem key={y} value={y} className="rounded-lg">
                    Năm {y}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`fillYearA-${loai_don}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`fillYearB-${loai_don}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const d = new Date(value);
                return d.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
              }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(val) => {
                if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(0)}B`;
                if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
                if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
                return `${val}`;
              }}
            />

            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("vi-VN", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />

            {yearB !== "none" && (
              <Area
                dataKey="yearB"
                name={`Năm ${yearB}`}
                type="monotone"
                fill={`url(#fillYearB-${loai_don})`}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
            <Area
              dataKey="yearA"
              name={`Năm ${yearA}`}
              type="monotone"
              fill={`url(#fillYearA-${loai_don})`}
              stroke="#10b981"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-2 text-xs text-muted-foreground flex justify-between items-center">
          <span>{isLoading ? "Đang cập nhật biểu đồ..." : null}</span>
          {error ? <span className="text-rose-600">Lỗi lấy dữ liệu</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartAreaInteractive() {
  return (
    <div className="grid grid-cols-1 gap-5">
      <MetricCard
        title="Biểu đồ Đơn Bán Hàng & Doanh Thu"
        subtitle="So sánh doanh thu và sản lượng bán giữa 2 năm"
        loai_don="sale"
      />
      <MetricCard
        title="Biểu đồ Nhập Vật Tư & Chi Phí"
        subtitle="So sánh giá trị và số lượng đơn nhập hàng"
        loai_don="purchase_receipt"
      />
      <MetricCard
        title="Biểu đồ Sản Xuất Sản Phẩm"
        subtitle="So sánh nhịp độ sản xuất thành phẩm giữa 2 năm"
        loai_don="prod_receipt"
      />
    </div>
  );
}
