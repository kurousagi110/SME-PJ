"use client";

import * as React from "react";
import {
  IconReportMoney,
  IconChartBar,
  IconClockHour4,
  IconTrendingUp,
  IconTrendingDown,
  IconDownload,
  IconPrinter,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconCoin,
  IconBuildingStore,
  IconPackage,
} from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { formatVND } from "@/utils/format";
import { exportToCSV } from "@/lib/export";
import {
  getProfitAndLossAction,
  getProductProfitabilityAction,
  getAgingDebtAction,
  recalculateCOGSAction,
  type PnLReportResponse,
  type ProductProfitabilityItem,
  type AgingDebtResponse,
} from "@/app/actions/financial";

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = React.useState<string>("pnl");
  const [selectedYear, setSelectedYear] = React.useState<string>("2026");
  const [loading, setLoading] = React.useState<boolean>(true);
  const [syncingCogs, setSyncingCogs] = React.useState<boolean>(false);

  // Data states
  const [pnlData, setPnlData] = React.useState<PnLReportResponse | null>(null);
  const [productsData, setProductsData] = React.useState<ProductProfitabilityItem[]>([]);
  const [debtData, setDebtData] = React.useState<AgingDebtResponse | null>(null);

  // Fetch all data
  const fetchData = React.useCallback(async (year: string) => {
    setLoading(true);
    try {
      const [pnlRes, prodRes, debtRes] = await Promise.all([
        getProfitAndLossAction({ year }),
        getProductProfitabilityAction({ limit: 50 }),
        getAgingDebtAction({ type: "customer" }),
      ]);

      if (pnlRes.success && pnlRes.data) {
        setPnlData(pnlRes.data);
      }
      if (prodRes.success && prodRes.items) {
        setProductsData(prodRes.items);
      }
      if (debtRes.success && debtRes.data) {
        setDebtData(debtRes.data);
      }
    } catch {
      toast.error("Không thể tải số liệu báo cáo tài chính");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData(selectedYear);
  }, [fetchData, selectedYear]);

  // Recalculate historical COGS
  const handleRecalculateCOGS = async () => {
    setSyncingCogs(true);
    try {
      const res = await recalculateCOGSAction();
      if (res.success) {
        toast.success(`Đã chuẩn hóa và tính toán lại giá vốn cho ${res.updatedOrders} đơn hàng!`);
        fetchData(selectedYear);
      } else {
        toast.error(res.error || "Thất bại khi cập nhật lại giá vốn");
      }
    } catch {
      toast.error("Lỗi khi kết nối máy chủ");
    } finally {
      setSyncingCogs(false);
    }
  };

  // Export PnL to CSV
  const handleExportPnLExcel = () => {
    if (!pnlData) return;
    const s = pnlData.summary;
    const exportRows = [
      { item: "1. Doanh thu bán hàng gộp", value: s.grossRevenue, note: "Tổng đơn hàng bán" },
      { item: "2. Các khoản giảm trừ (Chiết khấu)", value: s.totalDiscounts, note: "Chiết khấu thương mại" },
      { item: "3. Hàng bán bị trả lại hoàn tiền (RMA)", value: s.totalSalesReturns, note: "Đổi trả hoàn kho" },
      { item: "4. Doanh thu thuần về bán hàng", value: s.netRevenue, note: "Doanh thu thực nhận" },
      { item: "5. Giá vốn hàng bán (COGS)", value: s.totalCogs, note: "Bình quân gia quyền liên hoàn" },
      { item: "6. Lợi nhuận gộp", value: s.grossProfit, note: `Biên gộp: ${s.grossMarginPct}%` },
      { item: "7. Chi phí nhân sự (Lương)", value: s.opex.payroll, note: "Bảng lương chi trả" },
      { item: "8. Chi phí vận chuyển & Logistics", value: s.opex.shipping, note: "Cước giao hàng" },
      { item: "9. Chi phí mặt bằng & xưởng", value: s.opex.rentAndUtilities, note: "Điện nước, thuê xưởng" },
      { item: "10. Chi phí vận hành khác", value: s.opex.other, note: "Quản lý doanh nghiệp" },
      { item: "11. Tổng chi phí hoạt động (OPEX)", value: s.opex.total, note: "Tổng chi phí vận hành" },
      { item: "12. Lợi nhuận thuần hoạt động kinh doanh (Net Profit)", value: s.netOperatingProfit, note: `Biên ròng: ${s.netMarginPct}%` },
    ];

    exportToCSV(
      `Bao_Cao_Lai_Lo_PNL_${selectedYear}`,
      [
        { key: "item", label: "Khoản Mục Báo Cáo Tài Chính" },
        { key: "value", label: "Số Tiền (VND)", formatter: (v) => Number(v).toLocaleString("vi-VN") },
        { key: "note", label: "Thuyết Minh / Ghi Chú" },
      ],
      exportRows
    );
    toast.success("Đã xuất báo cáo P&L thành công!");
  };

  // Export Aging Debt to CSV
  const handleExportDebtExcel = () => {
    if (!debtData || !debtData.items.length) return;
    exportToCSV(
      `Bao_Cao_Tuoi_No_Khach_Hang`,
      [
        { key: "name", label: "Khách Hàng / Đối Tác" },
        { key: "phone", label: "Số Điện Thoại" },
        { key: "creditLimit", label: "Hạn Mức Nợ (VND)", formatter: (v) => (v ? Number(v).toLocaleString("vi-VN") : "Không giới hạn") },
        { key: "paymentTerms", label: "Hạn Thanh Toán (Ngày)", formatter: (v) => `${v} ngày` },
        { key: "totalDebt", label: "Tổng Công Nợ (VND)", formatter: (v) => Number(v).toLocaleString("vi-VN") },
        { key: "current", label: "Trong Hạn 0-30 Ngày", formatter: (v) => Number(v).toLocaleString("vi-VN") },
        { key: "days_31_60", label: "Quá Hạn 31-60 Ngày", formatter: (v) => Number(v).toLocaleString("vi-VN") },
        { key: "days_61_90", label: "Quá Hạn 61-90 Ngày", formatter: (v) => Number(v).toLocaleString("vi-VN") },
        { key: "days_over_90", label: "Nợ Xấu >90 Ngày", formatter: (v) => Number(v).toLocaleString("vi-VN") },
        { key: "maxDaysOverdue", label: "Số Ngày Quá Hạn Cao Nhất", formatter: (v) => `${v} ngày` },
      ],
      debtData.items
    );
    toast.success("Đã xuất báo cáo Tuổi Nợ thành công!");
  };

  const summary = pnlData?.summary;
  const isProfitable = (summary?.netOperatingProfit ?? 0) >= 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* ─── Header & Top Controls ─── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Báo Cáo Tài Chính & Lãi - Lỗ (P&L)
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              COGS Engine 2.0
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Báo cáo Kết quả Kinh doanh Chuẩn mực — Định giá Tồn kho Bình quân Gia quyền Liên hoàn & Phân tích Tuổi nợ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Chọn năm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">Năm 2026</SelectItem>
              <SelectItem value="2025">Năm 2025</SelectItem>
              <SelectItem value="2024">Năm 2024</SelectItem>
            </SelectContent>
          </Select>

          {/* Sync COGS button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculateCOGS}
            disabled={syncingCogs}
            title="Đồng bộ lại giá vốn từ định mức BOM cho các đơn hàng hoàn tất"
          >
            <IconRefresh className={`h-4 w-4 mr-1.5 ${syncingCogs ? "animate-spin" : ""}`} />
            Đồng bộ Giá Vốn
          </Button>

          {/* Export button */}
          <Button
            variant="outline"
            size="sm"
            onClick={activeTab === "debt" ? handleExportDebtExcel : handleExportPnLExcel}
          >
            <IconDownload className="h-4 w-4 mr-1.5 text-emerald-600" />
            Xuất Excel
          </Button>

          {/* Print button */}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <IconPrinter className="h-4 w-4 mr-1.5" />
            In Báo Cáo
          </Button>
        </div>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pnl" className="flex items-center gap-1.5">
            <IconReportMoney className="h-4 w-4" />
            Lãi - Lỗ (P&L)
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-1.5">
            <IconPackage className="h-4 w-4" />
            Hiệu Quả SP
          </TabsTrigger>
          <TabsTrigger value="debt" className="flex items-center gap-1.5">
            <IconClockHour4 className="h-4 w-4" />
            Tuổi Nợ
          </TabsTrigger>
        </TabsList>

        {/* ══════════════ TAB 1: BÁO CÁO LÃI - LỖ (P&L) ══════════════ */}
        <TabsContent value="pnl" className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {/* 1. Doanh thu thuần */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Doanh Thu Thuần</CardDescription>
                <CardTitle className="text-xl font-bold text-blue-600">
                  {formatVND(summary?.netRevenue || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Từ {summary?.totalOrders || 0} đơn hàng bán hoàn thành
              </CardContent>
            </Card>

            {/* 2. Giá vốn COGS */}
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Giá Vốn (COGS)</CardDescription>
                <CardTitle className="text-xl font-bold text-amber-600">
                  {formatVND(summary?.totalCogs || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Theo chuẩn Moving Average
              </CardContent>
            </Card>

            {/* 3. Lợi nhuận gộp */}
            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Lợi Nhuận Gộp</CardDescription>
                <CardTitle className="text-xl font-bold text-indigo-600">
                  {formatVND(summary?.grossProfit || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Biên gộp:</span>
                <span className="font-semibold text-indigo-700">{summary?.grossMarginPct || 0}%</span>
              </CardContent>
            </Card>

            {/* 4. Chi phí OPEX */}
            <Card className="border-l-4 border-l-rose-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Chi Phí (OPEX)</CardDescription>
                <CardTitle className="text-xl font-bold text-rose-600">
                  {formatVND(summary?.opex?.total || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Lương, mặt bằng xưởng, logistics
              </CardContent>
            </Card>

            {/* 5. Lợi nhuận ròng */}
            <Card className={`border-l-4 ${isProfitable ? "border-l-emerald-500" : "border-l-red-500"} shadow-sm`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Lợi Nhuận Ròng</CardDescription>
                <CardTitle className={`text-xl font-bold ${isProfitable ? "text-emerald-600" : "text-red-600"}`}>
                  {formatVND(summary?.netOperatingProfit || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
                {isProfitable ? (
                  <>
                    <IconTrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Hoạt động sinh lãi</span>
                  </>
                ) : (
                  <>
                    <IconTrendingDown className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-red-700 font-medium">Đang thâm hụt OPEX</span>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 6. Biên ròng % */}
            <Card className="border-l-4 border-l-teal-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Tỷ Suất Biên Ròng</CardDescription>
                <CardTitle className="text-xl font-bold text-teal-600">
                  {summary?.netMarginPct || 0}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Hiệu suất ròng trên 1đ doanh thu
              </CardContent>
            </Card>
          </div>

          {/* Interactive Recharts: Monthly P&L Timeline */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Biểu Đồ Xu Hướng Tài Chính 12 Tháng Năm {selectedYear}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tương quan giữa Doanh thu thuần, Giá vốn hàng bán, Chi phí hoạt động và Lợi nhuận ròng
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded bg-blue-500" />
                    <span>Doanh thu</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded bg-amber-500" />
                    <span>Giá vốn (COGS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded bg-rose-400" />
                    <span>Chi phí (OPEX)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-1 bg-emerald-600" />
                    <span>Lợi nhuận ròng</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                {pnlData?.monthlyTimeline && pnlData.monthlyTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={pnlData.monthlyTimeline}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`}
                      />
                      <Tooltip
                        formatter={(val: any, name: string) => {
                          const labels: Record<string, string> = {
                            revenue: "Doanh thu",
                            cogs: "Giá vốn COGS",
                            opex: "Chi phí OPEX",
                            netProfit: "Lợi nhuận ròng",
                          };
                          return [formatVND(Number(val) || 0), labels[name] || name];
                        }}
                      />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="cogs" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="opex" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Line
                        type="monotone"
                        dataKey="netProfit"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#059669" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Chưa có đủ dữ liệu biến động các tháng
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Statement Table (VAS Accounting Format) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Bảng Báo Cáo Kết Quả Hoạt Động Kinh Doanh Chuẩn Kế Toán (VAS)
              </CardTitle>
              <CardDescription className="text-xs">
                Kỳ kế toán năm {selectedYear} — Đơn vị tính: Việt Nam Đồng (VND)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[80px]">Mã Số</TableHead>
                      <TableHead>Chỉ Tiêu Báo Cáo Tài Chính</TableHead>
                      <TableHead className="w-[180px]">Thuyết Minh</TableHead>
                      <TableHead className="w-[180px] text-right">Số Tiền (VND)</TableHead>
                      <TableHead className="w-[120px] text-right">Tỷ Trọng %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {/* 1. Doanh thu gộp */}
                    <TableRow>
                      <TableCell className="font-mono text-muted-foreground">01</TableCell>
                      <TableCell className="font-medium">1. Doanh thu bán hàng và cung cấp dịch vụ</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Tổng doanh số bán</TableCell>
                      <TableCell className="text-right font-medium">{formatVND(summary?.grossRevenue || 0)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">—</TableCell>
                    </TableRow>

                    {/* 2. Giảm trừ */}
                    <TableRow className="text-muted-foreground">
                      <TableCell className="font-mono">02</TableCell>
                      <TableCell className="pl-6">2. Các khoản giảm trừ doanh thu</TableCell>
                      <TableCell className="text-xs">Chiết khấu & Hàng trả lại</TableCell>
                      <TableCell className="text-right text-rose-600">
                        -{formatVND((summary?.totalDiscounts || 0) + (summary?.totalSalesReturns || 0))}
                      </TableCell>
                      <TableCell className="text-right">—</TableCell>
                    </TableRow>

                    {/* 3. Doanh thu thuần */}
                    <TableRow className="bg-blue-50/50 dark:bg-blue-950/20 font-semibold">
                      <TableCell className="font-mono text-blue-700">10</TableCell>
                      <TableCell className="text-blue-900 dark:text-blue-200">
                        3. Doanh thu thuần về bán hàng và cung cấp dịch vụ (10 = 01 - 02)
                      </TableCell>
                      <TableCell className="text-xs text-blue-700">Doanh thu thực tế</TableCell>
                      <TableCell className="text-right text-blue-700">{formatVND(summary?.netRevenue || 0)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-700">100.0%</TableCell>
                    </TableRow>

                    {/* 4. Giá vốn hàng bán */}
                    <TableRow>
                      <TableCell className="font-mono text-muted-foreground">11</TableCell>
                      <TableCell className="font-medium">4. Giá vốn hàng bán (COGS)</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Bình quân gia quyền</TableCell>
                      <TableCell className="text-right text-amber-700 font-medium">{formatVND(summary?.totalCogs || 0)}</TableCell>
                      <TableCell className="text-right text-amber-700">
                        {summary?.netRevenue ? Math.round(((summary.totalCogs / summary.netRevenue) * 1000) / 10) : 0}%
                      </TableCell>
                    </TableRow>

                    {/* 5. Lợi nhuận gộp */}
                    <TableRow className="bg-indigo-50/50 dark:bg-indigo-950/20 font-semibold">
                      <TableCell className="font-mono text-indigo-700">20</TableCell>
                      <TableCell className="text-indigo-900 dark:text-indigo-200">
                        5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ (20 = 10 - 11)
                      </TableCell>
                      <TableCell className="text-xs text-indigo-700">Lãi gộp sản phẩm</TableCell>
                      <TableCell className="text-right text-indigo-700">{formatVND(summary?.grossProfit || 0)}</TableCell>
                      <TableCell className="text-right font-bold text-indigo-700">{summary?.grossMarginPct || 0}%</TableCell>
                    </TableRow>

                    {/* 6. Chi phí bán hàng & Logistics */}
                    <TableRow className="text-muted-foreground">
                      <TableCell className="font-mono">21</TableCell>
                      <TableCell className="pl-6">6. Chi phí bán hàng & Logistics</TableCell>
                      <TableCell className="text-xs">Cước vận chuyển hàng</TableCell>
                      <TableCell className="text-right">{formatVND(summary?.opex?.shipping || 0)}</TableCell>
                      <TableCell className="text-right">
                        {summary?.netRevenue ? Math.round(((summary.opex.shipping / summary.netRevenue) * 1000) / 10) : 0}%
                      </TableCell>
                    </TableRow>

                    {/* 7. Chi phí nhân sự */}
                    <TableRow className="text-muted-foreground">
                      <TableCell className="font-mono">22</TableCell>
                      <TableCell className="pl-6">7. Chi phí nhân sự & Tiền lương</TableCell>
                      <TableCell className="text-xs">Bảng lương toàn cty</TableCell>
                      <TableCell className="text-right">{formatVND(summary?.opex?.payroll || 0)}</TableCell>
                      <TableCell className="text-right">
                        {summary?.netRevenue ? Math.round(((summary.opex.payroll / summary.netRevenue) * 1000) / 10) : 0}%
                      </TableCell>
                    </TableRow>

                    {/* 8. Chi phí mặt bằng & quản lý */}
                    <TableRow className="text-muted-foreground">
                      <TableCell className="font-mono">23</TableCell>
                      <TableCell className="pl-6">8. Chi phí mặt bằng xưởng & Quản lý doanh nghiệp</TableCell>
                      <TableCell className="text-xs">Điện nước, thuê xưởng</TableCell>
                      <TableCell className="text-right">
                        {formatVND((summary?.opex?.rentAndUtilities || 0) + (summary?.opex?.other || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {summary?.netRevenue
                          ? Math.round(((((summary.opex.rentAndUtilities + summary.opex.other) / summary.netRevenue) * 1000) / 10))
                          : 0}%
                      </TableCell>
                    </TableRow>

                    {/* 9. Lợi nhuận thuần ròng */}
                    <TableRow className="bg-emerald-50 dark:bg-emerald-950/30 font-bold border-t-2 border-emerald-500">
                      <TableCell className="font-mono text-emerald-700">30</TableCell>
                      <TableCell className="text-emerald-900 dark:text-emerald-100 text-base">
                        9. Lợi nhuận thuần từ hoạt động kinh doanh (EBITDA / Net Profit)
                      </TableCell>
                      <TableCell className="text-xs text-emerald-700 font-normal">Lợi nhuận ròng cuối cùng</TableCell>
                      <TableCell className="text-right text-emerald-700 text-base">
                        {formatVND(summary?.netOperatingProfit || 0)}
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-700 text-base">
                        {summary?.netMarginPct || 0}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ TAB 2: HIỆU QUẢ SINH LỜI SẢN PHẨM ══════════════ */}
        <TabsContent value="products" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Ma Trận Hiệu Quả Sinh Lời Từng Mặt Hàng (Product Margin Matrix)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Xếp hạng theo lợi nhuận gộp đóng góp thực tế từ các đơn bán hoàn thành
                  </CardDescription>
                </div>
                <Badge variant="secondary">Tổng {productsData.length} sản phẩm có giao dịch</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[100px]">Mã SP</TableHead>
                      <TableHead>Tên Sản Phẩm</TableHead>
                      <TableHead className="text-center w-[100px]">Đã Bán</TableHead>
                      <TableHead className="text-right w-[150px]">Tổng Doanh Thu</TableHead>
                      <TableHead className="text-right w-[150px]">Tổng Giá Vốn (COGS)</TableHead>
                      <TableHead className="text-right w-[150px]">Lợi Nhuận Gộp</TableHead>
                      <TableHead className="text-right w-[110px]">Biên Lãi %</TableHead>
                      <TableHead className="text-center w-[160px]">Phân Loại</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {productsData.length > 0 ? (
                      productsData.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono font-medium">{p.code}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-center font-semibold">{p.qty}</TableCell>
                          <TableCell className="text-right font-medium text-blue-700">{formatVND(p.revenue)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatVND(p.totalCost)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">{formatVND(p.grossProfit)}</TableCell>
                          <TableCell className="text-right font-bold">{p.marginPct}%</TableCell>
                          <TableCell className="text-center">
                            {p.classification.includes("Star") && (
                              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                🌟 Ngôi sao (Star)
                              </Badge>
                            )}
                            {p.classification.includes("Cow") && (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                🐄 Bò sữa (Cash Cow)
                              </Badge>
                            )}
                            {p.classification.includes("Tiềm năng") && (
                              <Badge variant="outline" className="text-blue-700 border-blue-200">
                                🚀 Tiềm năng
                              </Badge>
                            )}
                            {p.classification.includes("Low") && (
                              <Badge variant="outline" className="text-amber-700 border-amber-200">
                                ⚠️ Cần tối ưu giá
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          Chưa có dữ liệu giao dịch sản phẩm
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ TAB 3: PHÂN TÍCH TUỔI NỢ (AGING DEBT) ══════════════ */}
        <TabsContent value="debt" className="space-y-6">
          {/* Aging Debt KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Tổng Công Nợ Phải Thu</CardDescription>
                <CardTitle className="text-xl font-bold text-blue-600">
                  {formatVND(debtData?.summary?.totalDebt || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Từ {debtData?.summary?.totalDebtors || 0} đối tác khách hàng
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Trong Hạn (0 - 30 Ngày)</CardDescription>
                <CardTitle className="text-xl font-bold text-emerald-600">
                  {formatVND(debtData?.summary?.current || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Nợ lưu thông bình thường
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Quá Hạn 31 - 60 Ngày</CardDescription>
                <CardTitle className="text-xl font-bold text-amber-600">
                  {formatVND(debtData?.summary?.days_31_60 || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Cần gửi email nhắc nợ đợt 1
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Quá Hạn 61 - 90 Ngày</CardDescription>
                <CardTitle className="text-xl font-bold text-orange-600">
                  {formatVND(debtData?.summary?.days_61_90 || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Tạm dừng cấp thêm hạn mức
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Nợ Xấu (&gt; 90 Ngày)</CardDescription>
                <CardTitle className="text-xl font-bold text-red-600">
                  {formatVND(debtData?.summary?.days_over_90 || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Tỷ lệ nợ xấu:</span>
                <span className="font-bold text-red-600">{debtData?.summary?.badDebtPercentage || 0}%</span>
              </CardContent>
            </Card>
          </div>

          {/* Aging Debt Table by Customer */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Danh Sách Chi Tiết Tuổi Nợ Theo Từng Khách Hàng
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Theo dõi hạn mức tín dụng và số ngày quá hạn để chủ động kiểm soát rủi ro dòng tiền
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportDebtExcel}>
                  <IconDownload className="h-4 w-4 mr-1.5" />
                  Xuất Excel Tuổi Nợ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Khách Hàng</TableHead>
                      <TableHead className="w-[120px]">Điện Thoại</TableHead>
                      <TableHead className="text-right w-[130px]">Hạn Mức Nợ</TableHead>
                      <TableHead className="text-right w-[140px]">Tổng Công Nợ</TableHead>
                      <TableHead className="text-right w-[130px]">Trong Hạn</TableHead>
                      <TableHead className="text-right w-[130px]">31 - 60 Ngày</TableHead>
                      <TableHead className="text-right w-[130px]">61 - 90 Ngày</TableHead>
                      <TableHead className="text-right w-[130px]">Nợ Xấu &gt;90N</TableHead>
                      <TableHead className="text-center w-[130px]">Rủi Ro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {debtData?.items && debtData.items.length > 0 ? (
                      debtData.items.map((d, idx) => {
                        const isOverLimit = d.creditLimit > 0 && d.totalDebt > d.creditLimit;
                        const hasBadDebt = d.days_over_90 > 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="font-medium">{d.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{d.code}</div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{d.phone || "—"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {d.creditLimit > 0 ? formatVND(d.creditLimit) : <span className="text-muted-foreground">Không giới hạn</span>}
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-700">
                              {formatVND(d.totalDebt)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                              {formatVND(d.current)}
                            </TableCell>
                            <TableCell className="text-right text-amber-600">
                              {d.days_31_60 > 0 ? formatVND(d.days_31_60) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              {d.days_61_90 > 0 ? formatVND(d.days_61_90) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-bold">
                              {d.days_over_90 > 0 ? formatVND(d.days_over_90) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {hasBadDebt ? (
                                <Badge variant="destructive" className="flex items-center gap-1 justify-center">
                                  <IconAlertTriangle className="h-3 w-3" /> Nợ xấu
                                </Badge>
                              ) : isOverLimit ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                  Vượt hạn mức
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                                  An toàn
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                          Không có khoản nợ quá hạn nào cần xử lý
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
