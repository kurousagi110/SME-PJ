import Link from "next/link";
import {
  Sparkles,
  ShoppingBag,
  Store,
  CalendarRange,
  Factory,
  PackagePlus,
  Warehouse,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardKpiCards } from "@/components/dashboard-kpi-cards";
import { DashboardYearlyCompare } from "@/components/dashboard-yearly-compare";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import DashboardOrdersTable from "@/components/dashboard-orders-table";

export default function Page() {
  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="px-4 lg:px-6 space-y-6 pb-12">
      {/* Stitch-style Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-accent/20 p-5 sm:p-6 shadow-xs">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full border-primary/20 bg-primary/5 text-primary text-[11px] font-medium py-0.5 px-2.5"
              >
                <Sparkles className="size-3 text-primary animate-pulse" />
                <span>SME Operations Hub</span>
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {today}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Bảng Điều Hành Trung Tâm
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Giám sát chuỗi cung ứng, tài chính, đơn hàng và tiến độ sản xuất theo thời gian thực.
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="rounded-xl shadow-xs gap-1.5 font-medium">
              <Link href="/sales">
                <ShoppingBag className="size-3.5" />
                <span>Đơn bán hàng</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-xs gap-1.5 font-medium border-border/80">
              <Link href="/pos">
                <Store className="size-3.5 text-emerald-600" />
                <span>Bán POS</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-xs gap-1.5 font-medium border-border/80">
              <Link href="/planning">
                <CalendarRange className="size-3.5 text-blue-600" />
                <span>Kế hoạch MRP</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-xs gap-1.5 font-medium border-border/80">
              <Link href="/product/orders">
                <Factory className="size-3.5 text-purple-600" />
                <span>Lệnh SX</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-xs gap-1.5 font-medium border-border/80">
              <Link href="/warehouse">
                <Warehouse className="size-3.5 text-amber-600" />
                <span>Kho bãi</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <DashboardKpiCards />

      {/* Yearly Financial & Operational Compare */}
      <DashboardYearlyCompare />

      {/* Interactive Charts */}
      <ChartAreaInteractive />

      {/* Recent Orders Table */}
      <DashboardOrdersTable />
    </div>
  );
}

