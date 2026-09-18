"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Progress component replaced with inline div
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconTrendingUp,
  IconBuildingFactory2,
  IconChartBar,
  IconAlertTriangle,
  IconRefresh,
  IconPackage,
  IconPackageOff,
  IconCircleCheck,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  fetchForecastAction,
  fetchMRPAction,
  fetchABCAction,
  fetchAlertsAction,
  type ForecastItem,
  type MRPItem,
  type ABCItem,
  type AlertsData,
} from "@/app/actions/planning";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n));
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const STATUS_CONFIG = {
  thieu_hut: {
    label: "Thiếu hụt",
    variant: "destructive" as const,
    color: "bg-red-100 text-red-700 border-red-200",
  },
  can_nhap: {
    label: "Cần nhập",
    variant: "outline" as const,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  du: {
    label: "Đủ hàng",
    variant: "outline" as const,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  du_thua: {
    label: "Dư thừa",
    variant: "secondary" as const,
    color: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const ABC_CONFIG = {
  A: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", bar: "#3b82f6" },
  B: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", bar: "#f59e0b" },
  C: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", bar: "#9ca3af" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 bg-muted animate-pulse rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-muted-foreground py-10">
        {message}
      </TableCell>
    </TableRow>
  );
}

// ── Tab 1: Dự Báo Nhu Cầu ─────────────────────────────────────────────────────

function ForecastTab() {
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchForecastAction(6);
    if (res.success) setItems(res.items);
    else setError(res.error ?? "Lỗi");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = {
    thieu_hut: items.filter((i) => i.trang_thai_kho === "thieu_hut").length,
    can_nhap: items.filter((i) => i.trang_thai_kho === "can_nhap").length,
    du: items.filter((i) => i.trang_thai_kho === "du").length,
    du_thua: items.filter((i) => i.trang_thai_kho === "du_thua").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "thieu_hut", label: "Thiếu hụt", icon: IconAlertCircle, cls: "text-red-600 bg-red-50" },
          { key: "can_nhap", label: "Cần nhập", icon: IconAlertTriangle, cls: "text-yellow-600 bg-yellow-50" },
          { key: "du", label: "Đủ hàng", icon: IconCircleCheck, cls: "text-green-600 bg-green-50" },
          { key: "du_thua", label: "Dư thừa", icon: IconPackage, cls: "text-gray-500 bg-gray-50" },
        ].map(({ key, label, icon: Icon, cls }) => (
          <Card key={key} className={`border ${cls} border-opacity-30`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Icon size={20} />
                <div>
                  <div className="text-2xl font-bold">
                    {summary[key as keyof typeof summary]}
                  </div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forecast table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dự Báo Nhu Cầu 3 Tháng Tới</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="text-red-600 p-4 text-sm">{error}</div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead className="text-right">TB/tháng</TableHead>
                  <TableHead className="text-right">Dự báo T+1</TableHead>
                  <TableHead className="text-right">Dự báo T+2</TableHead>
                  <TableHead className="text-right">Dự báo T+3</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingRows cols={8} />
                ) : items.length === 0 ? (
                  <EmptyRow cols={8} message="Chưa có dữ liệu bán hàng để dự báo" />
                ) : (
                  items.map((item) => {
                    const cfg = STATUS_CONFIG[item.trang_thai_kho] ?? STATUS_CONFIG.du;
                    const isExpanded = expandedId === item.san_pham_id;
                    return (
                      <React.Fragment key={item.san_pham_id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : item.san_pham_id)
                          }
                        >
                          <TableCell>
                            <div className="font-medium">{item.ten_sp}</div>
                            <div className="text-xs text-muted-foreground">{item.ma_sp}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(item.ton_kho)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {item.avg_monthly}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {fmt(item.forecast_t1)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(item.forecast_t2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(item.forecast_t3)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}
                            >
                              {cfg.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isExpanded ? (
                              <IconChevronUp size={14} />
                            ) : (
                              <IconChevronDown size={14} />
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 pb-4 pt-2 px-6">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Lịch sử bán hàng 6 tháng gần nhất
                              </div>
                              <div className="flex items-end gap-2 h-16">
                                {item.monthly_qty.map((qty, idx) => {
                                  const maxQ = Math.max(...item.monthly_qty, 1);
                                  const h = Math.max(4, (qty / maxQ) * 56);
                                  return (
                                    <TooltipProvider key={idx}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex flex-col items-center gap-1 flex-1">
                                            <div
                                              className="w-full bg-primary/70 rounded-sm"
                                              style={{ height: `${h}px` }}
                                            />
                                            <span className="text-[10px] text-muted-foreground">
                                              {item.periods[idx]?.slice(5)}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {item.periods[idx]}: {fmt(qty)} sp
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                                {/* Forecast bars */}
                                {[item.forecast_t1, item.forecast_t2, item.forecast_t3].map(
                                  (fc, idx) => {
                                    const maxQ = Math.max(...item.monthly_qty, 1);
                                    const h = Math.max(4, (fc / maxQ) * 56);
                                    return (
                                      <TooltipProvider key={`fc-${idx}`}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex flex-col items-center gap-1 flex-1">
                                              <div
                                                className="w-full bg-yellow-400/70 rounded-sm border border-dashed border-yellow-500"
                                                style={{ height: `${h}px` }}
                                              />
                                              <span className="text-[10px] text-yellow-600">
                                                T+{idx + 1}
                                              </span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Dự báo T+{idx + 1}: {fmt(fc)} sp
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  }
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 2: MRP ────────────────────────────────────────────────────────────────

function MRPTab() {
  const [items, setItems] = useState<MRPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchMRPAction(7);
    if (res.success) setItems(res.items);
    else setError(res.error ?? "Lỗi");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalChi = items.reduce((s, i) => s + i.du_kien_chi, 0);
  const canNhapItems = items.filter((i) => !i.da_du);
  const duItems = items.filter((i) => i.da_du);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-muted-foreground">Loại NL cần nhập</div>
            <div className="text-2xl font-bold text-red-600">{canNhapItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-muted-foreground">Loại NL đủ tồn kho</div>
            <div className="text-2xl font-bold text-green-600">{duItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-muted-foreground">Dự kiến chi phí nhập</div>
            <div className="text-lg font-bold">{fmtCurrency(totalChi)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Kế Hoạch Nguyên Vật Liệu (MRP)</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error && <div className="text-red-600 p-4 text-sm">{error}</div>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nguyên liệu</TableHead>
                  <TableHead className="text-right">Tồn kho hiện tại</TableHead>
                  <TableHead className="text-right">Cần dùng</TableHead>
                  <TableHead className="text-right">Cần nhập thêm</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Dự kiến chi</TableHead>
                  <TableHead>Đề xuất đặt hàng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingRows cols={8} />
                ) : items.length === 0 ? (
                  <EmptyRow
                    cols={8}
                    message="Tồn kho đủ cho dự báo — không cần đặt thêm nguyên liệu"
                  />
                ) : (
                  items.map((item, idx) => (
                    <TableRow key={`${item.nguyen_lieu_id}-${idx}`}>
                      <TableCell>
                        <div className="font-medium">{item.ten_nl || item.ma_nl}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.ma_nl} • {item.don_vi}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Dùng cho:{" "}
                          {item.san_pham_can
                            .slice(0, 2)
                            .map((s) => s.ten_sp)
                            .join(", ")}
                          {item.san_pham_can.length > 2 &&
                            ` +${item.san_pham_can.length - 2}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(item.ton_kho_nl)} {item.don_vi}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(item.tong_can)} {item.don_vi}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-red-600">
                        {item.da_du ? "—" : `${fmt(item.can_nhap)} ${item.don_vi}`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmtCurrency(item.gia_nhap)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {item.da_du ? "—" : fmtCurrency(item.du_kien_chi)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.da_du ? "—" : `≥ ${item.suggested_order_date}`}
                      </TableCell>
                      <TableCell>
                        {item.da_du ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            <IconCircleCheck size={12} /> Đủ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <IconAlertCircle size={12} /> Cần nhập
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 3: ABC Analysis ───────────────────────────────────────────────────────

function ABCTab() {
  const [items, setItems] = useState<ABCItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "A" | "B" | "C">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchABCAction(6);
    if (res.success) setItems(res.items);
    else setError(res.error ?? "Lỗi");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "ALL" ? items : items.filter((i) => i.abc_class === filter);
  const chartData = items.slice(0, 15).map((i) => ({
    name: i.ten_sp.length > 14 ? i.ten_sp.slice(0, 14) + "…" : i.ten_sp,
    revenue: i.total_revenue,
    class: i.abc_class,
  }));

  const counts = { A: 0, B: 0, C: 0 };
  items.forEach((i) => counts[i.abc_class]++);

  return (
    <div className="space-y-4">
      {/* ABC Summary */}
      <div className="grid grid-cols-3 gap-3">
        {(["A", "B", "C"] as const).map((cls) => (
          <Card
            key={cls}
            className={`cursor-pointer border-2 transition-all ${
              filter === cls
                ? "border-primary"
                : "border-transparent hover:border-muted-foreground/20"
            }`}
            onClick={() => setFilter(filter === cls ? "ALL" : cls)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={`text-3xl font-bold ${ABC_CONFIG[cls].text}`}
                  >
                    {cls}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {counts[cls]} sản phẩm
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ABC_CONFIG[cls].bg} border ${ABC_CONFIG[cls].border}`}>
                  <span className={`text-sm font-bold ${ABC_CONFIG[cls].text}`}>
                    {cls === "A" ? "80%" : cls === "B" ? "15%" : "5%"}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {cls === "A"
                  ? "Đóng góp 80% doanh thu"
                  : cls === "B"
                  ? "Đóng góp 15% doanh thu"
                  : "Đóng góp 5% còn lại"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 15 Sản Phẩm Theo Doanh Thu</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 40 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${v}`
                  }
                  tick={{ fontSize: 11 }}
                />
                <RechartsTooltip
                  formatter={(value: number) => [fmtCurrency(value), "Doanh thu"]}
                />
                <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={ABC_CONFIG[entry.class as "A" | "B" | "C"].bar}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Hạng A</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block" /> Hạng B</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-400 inline-block" /> Hạng C</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABC Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Bảng Phân Loại ABC
            {filter !== "ALL" && (
              <Badge className="ml-2" variant="outline">
                Lọc: Hạng {filter}
              </Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error && <div className="text-red-600 p-4 text-sm">{error}</div>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Hạng</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">SL bán (6T)</TableHead>
                  <TableHead className="text-right">Doanh thu (6T)</TableHead>
                  <TableHead className="text-right">% DT</TableHead>
                  <TableHead className="text-right">% Tích lũy</TableHead>
                  <TableHead className="text-center">Phân loại</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <LoadingRows cols={7} />
                ) : filtered.length === 0 ? (
                  <EmptyRow cols={7} message="Không có dữ liệu" />
                ) : (
                  filtered.map((item) => {
                    const cfg = ABC_CONFIG[item.abc_class];
                    return (
                      <TableRow key={item.san_pham_id}>
                        <TableCell className="text-center font-bold text-muted-foreground">
                          #{item.rank}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.ten_sp}</div>
                          <div className="text-xs text-muted-foreground">{item.ma_sp}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmt(item.total_qty)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {fmtCurrency(item.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, item.revenue_pct)}%` }}
                              />
                            </div>
                            {item.revenue_pct}%
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {item.cumulative_pct}%
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${cfg.bg} ${cfg.text} border ${cfg.border}`}
                          >
                            {item.abc_class}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 4: Cảnh Báo Tồn Kho ──────────────────────────────────────────────────

function AlertsTab() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAlertsAction(6);
    if (res.success) setData(res.data);
    else setError(res.error ?? "Lỗi");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "SP thiếu tồn kho",
            value: data.summary.tong_sp_thieu,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "NL thiếu tồn kho",
            value: data.summary.tong_nl_thieu,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "Hàng ứ đọng >60 ngày",
            value: data.summary.tong_hang_u_dong,
            color: "text-yellow-600",
            bg: "bg-yellow-50",
          },
          {
            label: "Giá trị hàng ứ đọng",
            value: fmtCurrency(data.summary.gia_tri_hang_u_dong),
            color: "text-gray-700",
            bg: "bg-gray-50",
          },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className={`${bg}`}>
            <CardContent className="pt-4 pb-4">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Low stock SP */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <IconPackageOff size={16} className="text-red-500" />
              Sản Phẩm Tồn Kho Thấp ({data.low_stock_sp.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <IconRefresh size={12} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.low_stock_sp.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">
                <IconCircleCheck className="mx-auto mb-1 text-green-500" size={24} />
                Tất cả sản phẩm đủ tồn kho
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Hiện có</TableHead>
                    <TableHead className="text-right">Tối thiểu</TableHead>
                    <TableHead className="text-right text-red-600">Thiếu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.low_stock_sp.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{s.ten}</div>
                        <div className="text-xs text-muted-foreground">{s.ma}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-600">
                        {fmt(s.so_luong)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmt(s.ton_toi_thieu)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-red-700">
                        -{fmt(s.thieu)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Low stock NL */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IconAlertTriangle size={16} className="text-orange-500" />
              Nguyên Liệu Tồn Kho Thấp ({data.low_stock_nl.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.low_stock_nl.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">
                <IconCircleCheck className="mx-auto mb-1 text-green-500" size={24} />
                Tất cả nguyên liệu đủ tồn kho
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nguyên liệu</TableHead>
                    <TableHead className="text-right">Hiện có</TableHead>
                    <TableHead className="text-right">Tối thiểu</TableHead>
                    <TableHead className="text-right text-orange-600">Thiếu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.low_stock_nl.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{n.ten}</div>
                        <div className="text-xs text-muted-foreground">
                          {n.ma} • {n.don_vi}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-orange-600">
                        {fmt(n.so_luong)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmt(n.ton_toi_thieu)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-orange-700">
                        -{fmt(n.thieu)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Slow moving */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IconPackage size={16} className="text-yellow-500" />
              Hàng Ứ Đọng &gt;60 Ngày ({data.slow_moving.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.slow_moving.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">
                <IconCircleCheck className="mx-auto mb-1 text-green-500" size={24} />
                Không có hàng ứ đọng
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Tồn kho</TableHead>
                    <TableHead className="text-right">Giá trị tồn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slow_moving.slice(0, 10).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{s.ten}</div>
                        <div className="text-xs text-muted-foreground">{s.ma}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmt(s.so_luong)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-yellow-700 font-medium">
                        {fmtCurrency(s.gia_tri_ton)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Inventory Turnover */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IconChartBar size={16} className="text-blue-500" />
              Vòng Quay Tồn Kho (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.turnover.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">
                Chưa có dữ liệu
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Vòng quay</TableHead>
                    <TableHead className="text-right">Ngày tồn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.turnover.slice(0, 10).map((t) => {
                    const isHigh = t.turnover >= 3;
                    const isLow = t.turnover < 1;
                    return (
                      <TableRow key={t.san_pham_id}>
                        <TableCell>
                          <div className="text-sm font-medium">{t.ten_sp}</div>
                          <div className="text-xs text-muted-foreground">{t.ma_sp}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span
                            className={`font-semibold ${
                              isHigh
                                ? "text-green-600"
                                : isLow
                                ? "text-red-600"
                                : "text-foreground"
                            }`}
                          >
                            {t.turnover}×
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {t.days_on_hand != null ? `${t.days_on_hand} ngày` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Demand Planning</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Dự báo nhu cầu · Kế hoạch NVL · Phân tích ABC · Cảnh báo tồn kho
        </p>
      </div>

      <Tabs defaultValue="forecast">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="forecast" className="flex items-center gap-1 text-xs">
            <IconTrendingUp size={14} />
            Dự Báo
          </TabsTrigger>
          <TabsTrigger value="mrp" className="flex items-center gap-1 text-xs">
            <IconBuildingFactory2 size={14} />
            MRP
          </TabsTrigger>
          <TabsTrigger value="abc" className="flex items-center gap-1 text-xs">
            <IconChartBar size={14} />
            ABC
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1 text-xs">
            <IconAlertTriangle size={14} />
            Cảnh Báo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="mt-4">
          <ForecastTab />
        </TabsContent>
        <TabsContent value="mrp" className="mt-4">
          <MRPTab />
        </TabsContent>
        <TabsContent value="abc" className="mt-4">
          <ABCTab />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <AlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
