"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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

import { fetchDashboardChartCompare } from "@/app/actions/dashbroard";

type ChartRow = {
  date: string; // YYYY-MM-DD
  yearA: number;
  yearB: number;
};

const currentYear = new Date().getFullYear(); // 2026
const years = Array.from({ length: 5 }, (_, i) => String(currentYear - (4 - i))); // 2022..2026

const chartConfig = {
  yearA: { label: "Năm A", color: "var(--primary)" },
  yearB: { label: "Năm B", color: "var(--primary)" },
} satisfies ChartConfig;

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

  const [timeRange, setTimeRange] = React.useState<"90d" | "30d" | "7d">("90d");
  const [yearA, setYearA] = React.useState(String(currentYear));
  const [yearB, setYearB] = React.useState<string>("none");

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const { data = [], isLoading, error } = useQuery<ChartRow[]>({
    queryKey: ["dash-chart", loai_don, yearA, yearB, timeRange],
    queryFn: async () => {
      const rows = await fetchDashboardChartCompare({
        loai_don,
        yearA: Number(yearA),
        yearB: yearB === "none" ? null : Number(yearB),
        timeRange,
      });
      return rows as ChartRow[];
    },
    staleTime: 10_000,
    retry: 0,
  });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>

        <CardAction className="flex items-center gap-2">
          {/* Range toggle (desktop) */}
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(v) => v && setTimeRange(v as any)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">90 ngày</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 ngày</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 ngày</ToggleGroupItem>
          </ToggleGroup>

          {/* Range select (mobile) */}
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger
              className="w-28 @[767px]/card:hidden"
              size="sm"
              aria-label="Chọn khoảng thời gian"
            >
              <SelectValue placeholder="90 ngày" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
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
            <SelectTrigger className="w-28" size="sm" aria-label="Chọn năm A">
              <SelectValue placeholder="Năm A" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {years.map((y) => (
                <SelectItem key={y} value={y} className="rounded-lg">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year B */}
          <Select value={yearB} onValueChange={setYearB}>
            <SelectTrigger className="w-32" size="sm" aria-label="So sánh năm B">
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
                    So sánh {y}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`fillYearA-${loai_don}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-yearA)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-yearA)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id={`fillYearB-${loai_don}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-yearB)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-yearB)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />

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

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("vi-VN", { month: "short", day: "numeric" })
                  }
                  indicator="dot"
                />
              }
            />

            <Area
              dataKey="yearB"
              type="natural"
              fill={`url(#fillYearB-${loai_don})`}
              stroke="var(--color-yearB)"
              stackId="b"
            />
            <Area
              dataKey="yearA"
              type="natural"
              fill={`url(#fillYearA-${loai_don})`}
              stroke="var(--color-yearA)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-2 text-sm text-muted-foreground">
          {isLoading ? "Đang tải dữ liệu..." : null}
          {error ? `Lỗi: ${(error as any)?.message || "Không lấy được dữ liệu"}` : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 3 CHART:
 * 1) đơn nhập mua (purchase_receipt)
 * 2) đơn nhập thành phẩm từ sản xuất (prod_receipt)
 * 3) đơn bán (sale)
 */
export function ChartAreaInteractive() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <MetricCard
        title="Số lượng đơn nhập nguyên liệu"
        subtitle="Theo ngày • Có thể so sánh giữa 2 năm"
        loai_don="purchase_receipt"
      />
      <MetricCard
        title="Số lượng đơn sản xuất sản phẩm"
        subtitle="Theo ngày • Có thể so sánh giữa 2 năm"
        loai_don="prod_receipt"
      />
      <MetricCard
        title="Số lượng đơn bán sản phẩm"
        subtitle="Theo ngày • Có thể so sánh giữa 2 năm"
        loai_don="sale"
      />
    </div>
  );
}
