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
  IconWallet,
  IconArrowUpRight,
  IconArrowDownRight,
  IconBuildingBank,
  IconAdjustmentsHorizontal,
  IconFileZip,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  fetchCashFlowForecastAction,
  reconcileBankAction,
  type PnLReportResponse,
  type ProductProfitabilityItem,
  type AgingDebtResponse,
  type CashFlowForecastResponse,
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
  const [cashflowData, setCashflowData] = React.useState<CashFlowForecastResponse | null>(null);

  // Bank reconciliation dialog state
  const [openReconcileModal, setOpenReconcileModal] = React.useState<boolean>(false);
  const [reconcileResult, setReconcileResult] = React.useState<any>(null);
  const [isReconciling, setIsReconciling] = React.useState<boolean>(false);

  // What-If Simulator states
  const [simRevenuePct, setSimRevenuePct] = React.useState<number>(0);
  const [simCogsPct, setSimCogsPct] = React.useState<number>(0);
  const [simOpexPct, setSimOpexPct] = React.useState<number>(0);

  // Fetch all data
  const fetchData = React.useCallback(async (year: string) => {
    setLoading(true);
    try {
      const [pnlRes, prodRes, debtRes, cashflowRes] = await Promise.all([
        getProfitAndLossAction({ year }),
        getProductProfitabilityAction({ limit: 50 }),
        getAgingDebtAction({ type: "customer" }),
        fetchCashFlowForecastAction({ days: 90 }),
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
      if (cashflowRes.success && cashflowRes.data) {
        setCashflowData(cashflowRes.data);
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

  // One-Click Audit Pack Export (Combined Multi-Section UTF-8 BOM CSV)
  const handleExportAuditPack = () => {
    const lines: string[] = [];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const row = (cols: unknown[]) => lines.push(cols.map(esc).join(","));

    row([`HỒ SƠ KIỂM TOÁN TÀI CHÍNH TỔNG HỢP - NĂM ${selectedYear}`, `Ngày xuất: ${new Date().toLocaleString("vi-VN")}`]);
    lines.push("");

    // Section 1: P&L
    row(["PHẦN 1: BÁO CÁO KẾT QUẢ KINH DOANH (P&L)"]);
    row(["Khoản mục", "Số tiền (VND)", "Ghi chú"]);
    if (pnlData?.summary) {
      const s = pnlData.summary;
      row(["Doanh thu thuần", s.netRevenue, ""]);
      row(["Giá vốn hàng bán (COGS)", s.totalCogs, "Bình quân gia quyền"]);
      row(["Lợi nhuận gộp", s.grossProfit, `Biên gộp: ${s.grossMarginPct}%`]);
      row(["Tổng chi phí vận hành (OPEX)", s.opex.total, `Lương: ${s.opex.payroll}, Ship: ${s.opex.shipping}`]);
      row(["Lợi nhuận ròng", s.netOperatingProfit, `Biên ròng: ${s.netMarginPct}%`]);
    }
    lines.push("");

    // Section 2: Product Profitability
    row(["PHẦN 2: HIỆU QUẢ SINH LỜI SẢN PHẨM"]);
    row(["Mã SP", "Tên Sản Phẩm", "SL Bán", "Doanh Thu", "Giá Vốn", "Lợi Nhuận Gộp", "Biên LN (%)", "Phân loại"]);
    for (const p of productsData) {
      row([p.code, p.name, p.qty, p.revenue, p.totalCost, p.grossProfit, p.marginPct, p.classification]);
    }
    lines.push("");

    // Section 3: Aging Debt
    row(["PHẦN 3: PHÂN TÍCH TUỔI NỢ KHÁCH HÀNG"]);
    row(["Khách hàng", "SĐT", "Tổng Nợ", "0-30 ngày", "31-60 ngày", "61-90 ngày", ">90 ngày"]);
    for (const d of debtData?.items || []) {
      row([d.name, d.phone, d.totalDebt, d.current, d.days_31_60, d.days_61_90, d.days_over_90]);
    }
    lines.push("");

    // Section 4: Cashflow Summary
    row(["PHẦN 4: DỰ PHÓNG DÒNG TIỀN 12 TUẦN"]);
    row(["Số dư tiền mặt hiện tại", cashflowData?.currentCashBalance ?? 0]);
    row(["Monthly Burn Rate", cashflowData?.monthlyBurnRate ?? 0]);
    row(["Runway (Tháng)", cashflowData?.runwayMonths ?? "Ổn định"]);

    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ho_So_Kiem_Toan_SME_${selectedYear}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Đã xuất trọn bộ Hồ sơ Kiểm toán 1-Click!");
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

          {/* Bank Reconcile button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenReconcileModal(true)}
            className="text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100/50"
          >
            <IconBuildingBank className="h-4 w-4 mr-1.5" />
            Đối Soát Ngân Hàng
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

          {/* One-Click Audit Pack */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAuditPack}
            className="text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/50 dark:text-indigo-300 dark:border-indigo-800 dark:bg-indigo-950/40"
            title="Xuất trọn bộ P&L, Hiệu quả SP, Tuổi nợ và Dòng tiền trong 1 file"
          >
            <IconFileZip className="h-4 w-4 mr-1.5" />
            Audit Pack 1-Click
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 max-w-2xl">
          <TabsTrigger value="pnl" className="flex items-center gap-1.5">
            <IconReportMoney className="h-4 w-4" />
            Lãi - Lỗ (P&L)
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-1.5">
            <IconWallet className="h-4 w-4" />
            Dòng Tiền
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-1.5">
            <IconPackage className="h-4 w-4" />
            Hiệu Quả SP
          </TabsTrigger>
          <TabsTrigger value="debt" className="flex items-center gap-1.5">
            <IconClockHour4 className="h-4 w-4" />
            Tuổi Nợ
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <IconAdjustmentsHorizontal className="h-4 w-4" />
            What-If
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

        {/* ══════════════ TAB 4: DỰ BÁO DÒNG TIỀN & NGÂN QUỸ (CASH FLOW) ══════════════ */}
        <TabsContent value="cashflow" className="space-y-6">
          {/* Executive Cashflow KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Số Dư Quỹ Tiền Mặt Thực Tế</CardTitle>
                <IconWallet className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  {formatVND(cashflowData?.currentCashBalance ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Khả dụng trong Sổ Quỹ (Tiền mặt + Ngân hàng)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tốc Độ Tiêu Hao / Tháng (Burn Rate)</CardTitle>
                <IconArrowDownRight className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">
                  {formatVND(cashflowData?.monthlyBurnRate ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Trung bình chi phí vận hành & lương 90 ngày qua
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chỉ Số Runway Hoạt Động</CardTitle>
                <IconTrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {cashflowData?.runwayMonths ?? 0} tháng
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Duy trì vận hành an toàn với số dư hiện tại
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đánh Giá Sức Khỏe Ngân Quỹ</CardTitle>
                <IconCheck className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={cashflowData?.healthStatus === "HEALTHY" ? "outline" : "destructive"}
                    className={
                      cashflowData?.healthStatus === "HEALTHY"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-sm py-0.5"
                        : "text-sm py-0.5"
                    }
                  >
                    {cashflowData?.healthStatus === "HEALTHY" ? "ỔN ĐỊNH & AN TOÀN" : "CẢNH BÁO THÂM HỤT"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {cashflowData?.healthAdvice || "Dòng tiền hoạt động ổn định."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Biểu đồ dự phóng 12 tuần tới */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Dự Phóng Dòng Tiền Thu - Chi 12 Tuần Tới (90 Ngày)</CardTitle>
              <CardDescription>
                So sánh Dự thu từ đơn bán hàng (Xanh lá), Dự chi NCC & Lương (Đỏ cam), và Đường số dư tiền mặt cuối kỳ (Xanh dương)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cashflowData?.weeklyBuckets || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => formatVND(Number(val))}
                      labelFormatter={(label) => `Thời gian: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="inflows" name="Dự thu (Tiền vào)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outflows" name="Dự chi (Tiền ra)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="closingCash"
                      name="Số dư tiền mặt cuối kỳ"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Dự Thu & Dự Chi */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-emerald-800 flex items-center gap-2">
                      <IconArrowUpRight className="h-5 w-5 text-emerald-600" />
                      Khoản Dự Thu Sắp Tới (Receivables)
                    </CardTitle>
                    <CardDescription>Các đơn hàng bán chuẩn bị đến hạn thu tiền</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Đơn</TableHead>
                      <TableHead>Khách Hàng</TableHead>
                      <TableHead className="text-right">Số Tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cashflowData?.topReceivables || []).slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-xs">{r.referenceCode}</TableCell>
                        <TableCell className="text-xs truncate max-w-[140px]">{r.partnerName}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-emerald-700">
                          {formatVND(r.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-amber-800 flex items-center gap-2">
                      <IconArrowDownRight className="h-5 w-5 text-amber-600" />
                      Khoản Dự Chi Sắp Tới (Payables & Opex)
                    </CardTitle>
                    <CardDescription>Công nợ nhà cung cấp, quỹ lương & vận hành định kỳ</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Khoản Chi</TableHead>
                      <TableHead>Đối Tượng</TableHead>
                      <TableHead className="text-right">Số Tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cashflowData?.topPayables || []).slice(0, 5).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-xs">{p.purpose}</TableCell>
                        <TableCell className="text-xs truncate max-w-[140px]">{p.partnerName}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-amber-700">
                          {formatVND(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════ TAB 5: WHAT-IF SIMULATOR ══════════════ */}
        <TabsContent value="simulator" className="space-y-6">
          {(() => {
            const baseRev = summary?.netRevenue || 0;
            const baseCogs = summary?.totalCogs || 0;
            const baseOpex = summary?.opex?.total || 0;

            const projRev = Math.round(baseRev * (1 + simRevenuePct / 100));
            const projCogs = Math.round(baseCogs * (1 + simRevenuePct / 100) * (1 + simCogsPct / 100));
            const projGross = projRev - projCogs;
            const projOpex = Math.round(baseOpex * (1 + simOpexPct / 100));
            const projNet = projGross - projOpex;
            const projMarginPct = projRev > 0 ? Number(((projNet / projRev) * 100).toFixed(1)) : 0;
            const grossMarginRatio = projRev > 0 ? projGross / projRev : 0;
            const breakEvenRev = grossMarginRatio > 0 ? Math.round(projOpex / grossMarginRatio) : 0;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-5 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconAdjustmentsHorizontal className="h-5 w-5 text-indigo-600" />
                        Thông số Giả lập Kịch bản
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSimRevenuePct(0);
                          setSimCogsPct(0);
                          setSimOpexPct(0);
                        }}
                      >
                        Đặt lại 0%
                      </Button>
                    </div>
                    <CardDescription className="text-xs">
                      Kéo thanh trượt để mô phỏng tác động của giá nguyên vật liệu, doanh số và chi phí vận hành tới lợi nhuận ròng.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Biến động Doanh số bán hàng</span>
                        <span className={simRevenuePct >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                          {simRevenuePct > 0 ? `+${simRevenuePct}%` : `${simRevenuePct}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-30}
                        max={50}
                        step={1}
                        value={simRevenuePct}
                        onChange={(e) => setSimRevenuePct(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Biến động Giá vốn / Nguyên vật liệu (COGS)</span>
                        <span className={simCogsPct <= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                          {simCogsPct > 0 ? `+${simCogsPct}%` : `${simCogsPct}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-20}
                        max={40}
                        step={1}
                        value={simCogsPct}
                        onChange={(e) => setSimCogsPct(Number(e.target.value))}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Biến động Chi phí vận hành (OPEX)</span>
                        <span className={simOpexPct <= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                          {simOpexPct > 0 ? `+${simOpexPct}%` : `${simOpexPct}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-20}
                        max={40}
                        step={1}
                        value={simOpexPct}
                        onChange={(e) => setSimOpexPct(Number(e.target.value))}
                        className="w-full accent-rose-600 cursor-pointer"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-7 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Kết quả Dự phóng Tài chính (What-If)</CardTitle>
                    <CardDescription className="text-xs">
                      So sánh trực tiếp giữa số liệu thực tế năm {selectedYear} và kịch bản giả lập
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg border bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">Doanh thu dự kiến</div>
                        <div className="text-sm font-bold text-blue-600 mt-0.5">{formatVND(projRev)}</div>
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">Giá vốn dự kiến</div>
                        <div className="text-sm font-bold text-amber-600 mt-0.5">{formatVND(projCogs)}</div>
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">Lợi nhuận ròng</div>
                        <div className={`text-sm font-bold mt-0.5 ${projNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatVND(projNet)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/20">
                        <div className="text-[11px] text-muted-foreground">Biên ròng / Hòa vốn</div>
                        <div className="text-sm font-bold text-indigo-600 mt-0.5">{projMarginPct}%</div>
                        <div className="text-[10px] text-muted-foreground">
                          Hòa vốn: {formatVND(breakEvenRev)}
                        </div>
                      </div>
                    </div>

                    <div className="h-[220px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={[
                            { name: "Thực tế", revenue: baseRev, cogs: baseCogs, netProfit: summary?.netOperatingProfit || 0 },
                            { name: "Kịch bản giả lập", revenue: projRev, cogs: projCogs, netProfit: projNet },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} />
                          <Tooltip formatter={(v: any) => formatVND(Number(v || 0))} />
                          <Legend />
                          <Bar dataKey="revenue" name="Doanh thu thuần" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="cogs" name="Giá vốn (COGS)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="netProfit" name="Lợi nhuận ròng" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* ─── MODAL ĐỐI SOÁT SAO KÊ NGÂN HÀNG ─── */}
      <Dialog open={openReconcileModal} onOpenChange={setOpenReconcileModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconBuildingBank className="h-5 w-5 text-blue-600" />
              Đối Soát Sao Kê Ngân Hàng Tự Động
            </DialogTitle>
            <DialogDescription>
              So khớp nhanh các giao dịch ngân hàng thực tế với Sổ Quỹ SME để phát hiện khoản chưa vào sổ hoặc sai lệch số tiền.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!reconcileResult ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Hệ thống hỗ trợ nạp sao kê mô phỏng hoặc danh sách giao dịch từ Vietcombank, MB, Techcombank:
                </p>
                <div className="p-3 bg-slate-50 rounded border text-xs font-mono space-y-1">
                  <div>[1] 2026-10-12: +26.125.000 đ (KH chuyen khoan DH-20261008-IHTG7J)</div>
                  <div>[2] 2026-10-12: -15.000.000 đ (Chi mua go tu NCC An Cuong)</div>
                  <div>[3] 2026-10-13: +1.000.000 đ (Khach chuyen khoan DH-20261008-S1C9SQ)</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs text-blue-600 font-medium">Tỷ lệ khớp lệnh</div>
                    <div className="text-2xl font-bold text-blue-800">{reconcileResult.matchedRate}%</div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                    <div className="text-xs text-emerald-600 font-medium">Đã khớp Sổ Quỹ</div>
                    <div className="text-2xl font-bold text-emerald-800">{reconcileResult.matchedCount} GD</div>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <div className="text-xs text-amber-600 font-medium">Chưa có trong Sổ</div>
                    <div className="text-2xl font-bold text-amber-800">{reconcileResult.unmatchedCount} GD</div>
                  </div>
                </div>

                <div className="max-h-[220px] overflow-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nội Dung GD</TableHead>
                        <TableHead>Số Tiền</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(reconcileResult.matched || []).map((m: any, idx: number) => (
                        <TableRow key={`m-${idx}`}>
                          <TableCell className="text-xs">{m.bankTx?.content || "Giao dịch khớp"}</TableCell>
                          <TableCell className="text-xs font-semibold">{formatVND(m.ledgerEntry?.so_tien || 0)}</TableCell>
                          <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Đã Khớp ({m.ledgerEntry?.ma_phieu})</Badge></TableCell>
                        </TableRow>
                      ))}
                      {(reconcileResult.unmatchedBank || []).map((u: any, idx: number) => (
                        <TableRow key={`u-${idx}`}>
                          <TableCell className="text-xs">{u.bankTx?.content}</TableCell>
                          <TableCell className="text-xs font-semibold text-amber-600">{formatVND(u.bankTx?.amount || 0)}</TableCell>
                          <TableCell><Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Chưa Lập Phiếu</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenReconcileModal(false); setReconcileResult(null); }}>
              Đóng
            </Button>
            {!reconcileResult && (
              <Button
                disabled={isReconciling}
                onClick={async () => {
                  setIsReconciling(true);
                  try {
                    const sampleTx = [
                      { content: "DH-20261008-IHTG7J", amount: 26125000, type: "IN" },
                      { content: "Chi mua go tu NCC An Cuong", amount: 15000000, type: "OUT" },
                      { content: "DH-20261008-S1C9SQ", amount: 1000000, type: "IN" },
                    ];
                    const res = await reconcileBankAction(sampleTx);
                    if (res.success && res.data) {
                      setReconcileResult(res.data);
                      toast.success("Đối soát sao kê ngân hàng hoàn tất!");
                    } else {
                      toast.error(res.error || "Không thể đối soát sao kê");
                    }
                  } catch {
                    toast.error("Lỗi mạng khi đối soát");
                  } finally {
                    setIsReconciling(false);
                  }
                }}
              >
                {isReconciling ? "Đang đối soát..." : "Chạy Đối Soát Sao Kê Mẫu"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

