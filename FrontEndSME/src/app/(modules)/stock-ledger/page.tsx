"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconReportAnalytics,
  IconReceipt2,
  IconRefresh,
  IconSearch,
  IconDownload,
  IconPrinter,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconPackages,
  IconCash,
  IconCalendar,
  IconBoxSeam,
  IconWood,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  fetchStockCardAction,
  fetchInOutBalanceReportAction,
  StockCardData,
  InOutBalanceRow,
  InOutBalanceReportData,
} from "@/app/actions/stock-ledger";
import { exportToCSV } from "@/lib/export";

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  NHAP_MUA_HANG: { label: "Nhập mua NCC", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  NHAP_SAN_XUAT: { label: "Nhập hoàn thành SX", color: "bg-blue-100 text-blue-800 border-blue-300" },
  NHAP_DIEU_CHINH_TANG: { label: "Kiểm kê tăng", color: "bg-teal-100 text-teal-800 border-teal-300" },
  NHAP_TRA_HANG_RMA: { label: "Nhập trả hàng RMA", color: "bg-purple-100 text-purple-800 border-purple-300" },
  XUAT_BAN_HANG: { label: "Xuất bán hàng", color: "bg-rose-100 text-rose-800 border-rose-300" },
  XUAT_SAN_XUAT: { label: "Xuất dùng sản xuất", color: "bg-amber-100 text-amber-800 border-amber-300" },
  XUAT_DIEU_CHINH_GIAM: { label: "Kiểm kê giảm", color: "bg-slate-100 text-slate-800 border-slate-300" },
};

function toVND(amount: number) {
  return Number(amount || 0).toLocaleString("vi-VN") + " đ";
}

export default function StockLedgerPage() {
  const [activeTab, setActiveTab] = React.useState("xuat-nhap-ton");
  const [loading, setLoading] = React.useState(false);

  // Filters for In-Out-Balance Report
  const now = new Date();
  const defaultToDate = now.toISOString().split("T")[0];
  const defaultFromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [tuNgay, setTuNgay] = React.useState(defaultFromDate);
  const [denNgay, setDenNgay] = React.useState(defaultToDate);
  const [itemType, setItemType] = React.useState<"product" | "material" | "all">("all");
  const [search, setSearch] = React.useState("");

  // Report Data
  const [report, setReport] = React.useState<InOutBalanceReportData | null>(null);

  // Stock Card Modal & Data
  const [selectedItemForCard, setSelectedItemForCard] = React.useState<InOutBalanceRow | null>(null);
  const [stockCardData, setStockCardData] = React.useState<StockCardData | null>(null);
  const [openCardModal, setOpenCardModal] = React.useState(false);
  const [cardLoading, setCardLoading] = React.useState(false);

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchInOutBalanceReportAction({
        itemType,
        tu_ngay: tuNgay,
        den_ngay: denNgay,
        search: search.trim() || undefined,
      });
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        toast.error(res.error || "Không thể tải báo cáo");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [itemType, tuNgay, denNgay, search]);

  React.useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleOpenStockCard = async (row: InOutBalanceRow) => {
    setSelectedItemForCard(row);
    setOpenCardModal(true);
    setCardLoading(true);
    try {
      const res = await fetchStockCardAction({
        itemId: row.id,
        itemType: row.loai === "Thành phẩm" ? "product" : "material",
        tu_ngay: tuNgay,
        den_ngay: denNgay,
      });
      if (res.success && res.data) {
        setStockCardData(res.data);
      } else {
        toast.error(res.error || "Không thể tải thẻ kho");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tải thẻ kho");
    } finally {
      setCardLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!report || !report.items.length) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }
    exportToCSV(
      `Bao_Cao_Xuat_Nhap_Ton_${tuNgay}_${denNgay}`,
      [
        { key: "ma_hang", label: "Mã Hàng" },
        { key: "ten_hang", label: "Tên Mặt Hàng" },
        { key: "loai", label: "Phân Loại" },
        { key: "don_vi", label: "Đơn Vị Tính" },
        { key: "don_gia", label: "Đơn Giá", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "ton_dau_ky", label: "Tồn Đầu Kỳ", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "gia_tri_dau", label: "Giá Trị Đầu Kỳ (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "nhap_trong_ky", label: "Nhập Trong Kỳ", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "gia_tri_nhap", label: "Giá Trị Nhập (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "xuat_trong_ky", label: "Xuất Trong Kỳ", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "gia_tri_xuat", label: "Giá Trị Xuất (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "ton_cuoi_ky", label: "Tồn Cuối Kỳ", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "gia_tri_cuoi", label: "Giá Trị Cuối Kỳ (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
      ],
      report.items
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1450px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <IconReportAnalytics className="w-7 h-7 text-indigo-600" />
            Thẻ Kho & Báo Cáo Xuất - Nhập - Tồn (Stock Ledger)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Chuẩn mực kế toán kho: Theo dõi biến động nhập xuất lũy kế và cân đối giá trị tồn kho theo thời gian thực
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <IconDownload className="w-4 h-4" /> Xuất Excel / CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadReport}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Giá Trị Tồn Đầu Kỳ
            </CardTitle>
            <div className="p-2 rounded-full bg-slate-100 text-slate-700">
              <IconPackages className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800">
              {toVND(report?.summary?.tong_gia_tri_ton_dau || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tồn kho đầu kỳ báo cáo</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-emerald-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Giá Trị Nhập
            </CardTitle>
            <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
              <IconArrowDownLeft className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">
              {toVND(report?.summary?.tong_gia_tri_nhap || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mua NCC, Lệnh SX, RMA</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-rose-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Giá Trị Xuất
            </CardTitle>
            <div className="p-2 rounded-full bg-rose-50 text-rose-600">
              <IconArrowUpRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-600">
              {toVND(report?.summary?.tong_gia_tri_xuat || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bán hàng, Xuất SX BOM</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Giá Trị Tồn Cuối Kỳ
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
              <IconCash className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {toVND(report?.summary?.tong_gia_tri_ton_cuoi || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Giá trị kho hiện hành</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Controls: Date range & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-slate-50 p-3.5 rounded-lg border">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Từ ngày</Label>
              <Input
                type="date"
                value={tuNgay}
                onChange={(e) => setTuNgay(e.target.value)}
                className="bg-white text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Đến ngày</Label>
              <Input
                type="date"
                value={denNgay}
                onChange={(e) => setDenNgay(e.target.value)}
                className="bg-white text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Phân loại mặt hàng</Label>
              <Select value={itemType} onValueChange={(val: any) => setItemType(val)}>
                <SelectTrigger className="bg-white text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả (Thành phẩm & NVL)</SelectItem>
                  <SelectItem value="product">Chỉ thành phẩm</SelectItem>
                  <SelectItem value="material">Chỉ nguyên vật liệu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Tìm kiếm</Label>
              <div className="relative mt-1">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Mã hoặc tên mặt hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Table Báo Cáo Xuất Nhập Tồn */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Mã Hàng</TableHead>
                  <TableHead className="font-semibold text-xs">Tên Mặt Hàng</TableHead>
                  <TableHead className="font-semibold text-xs text-center">ĐVT</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Đơn Giá</TableHead>
                  <TableHead className="font-semibold text-xs text-right bg-slate-100/50">Tồn Đầu Kỳ</TableHead>
                  <TableHead className="font-semibold text-xs text-right text-emerald-700 bg-emerald-50/40">Nhập Trong Kỳ</TableHead>
                  <TableHead className="font-semibold text-xs text-right text-rose-700 bg-rose-50/40">Xuất Trong Kỳ</TableHead>
                  <TableHead className="font-semibold text-xs text-right font-bold text-blue-800 bg-blue-50/50">Tồn Cuối Kỳ</TableHead>
                  <TableHead className="font-semibold text-xs text-right font-bold">Thành Tiền Tồn</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!report?.items || report.items.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-400 text-sm">
                      {loading ? "Đang tổng hợp dữ liệu xuất nhập tồn..." : "Không tìm thấy dữ liệu phù hợp."}
                    </TableCell>
                  </TableRow>
                ) : (
                  report.items.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {row.ma_hang}
                        <div className="text-[10px] text-slate-400 font-sans">{row.loai}</div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900">
                        {row.ten_hang}
                      </TableCell>
                      <TableCell className="text-xs text-center text-slate-600">
                        {row.don_vi}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600">
                        {toVND(row.don_gia)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium bg-slate-100/30">
                        {row.ton_dau_ky.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-emerald-700 bg-emerald-50/20">
                        {row.nhap_trong_ky > 0 ? `+${row.nhap_trong_ky.toLocaleString("vi-VN")}` : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-rose-700 bg-rose-50/20">
                        {row.xuat_trong_ky > 0 ? `-${row.xuat_trong_ky.toLocaleString("vi-VN")}` : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-blue-800 bg-blue-50/30">
                        {row.ton_cuoi_ky.toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900">
                        {toVND(row.gia_tri_cuoi)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenStockCard(row)}
                          className="h-7 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold"
                        >
                          Thẻ Kho
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Thẻ Kho Chi Tiết Mặt Hàng */}
      <Dialog open={openCardModal} onOpenChange={setOpenCardModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:p-0">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <IconReceipt2 className="w-5 h-5 text-indigo-600" />
              Thẻ Kho Chi Tiết (Stock Movement Card): {selectedItemForCard?.ten_hang} ({selectedItemForCard?.ma_hang})
            </DialogTitle>
            <DialogDescription>
              Lịch sử ghi chép từng biến động xuất nhập tồn lũy kế theo thời gian chứng từ.
            </DialogDescription>
          </DialogHeader>

          {cardLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Đang tải lịch sử thẻ kho...</div>
          ) : stockCardData ? (
            <div className="space-y-4 py-2 text-xs">
              {/* Header Thẻ Kho */}
              <div className="border rounded-lg p-3 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500">Mã hàng:</span>
                  <div className="font-bold text-slate-900 font-mono">{stockCardData.item.ma_hang}</div>
                </div>
                <div>
                  <span className="text-slate-500">Tên mặt hàng:</span>
                  <div className="font-bold text-slate-900">{stockCardData.item.ten_hang}</div>
                </div>
                <div>
                  <span className="text-slate-500">Đơn vị tính:</span>
                  <div className="font-semibold text-slate-800">{stockCardData.item.don_vi}</div>
                </div>
                <div>
                  <span className="text-slate-500">Tồn hiện tại:</span>
                  <div className="font-bold text-blue-600">{stockCardData.item.ton_hien_tai.toLocaleString("vi-VN")}</div>
                </div>
              </div>

              {/* Tóm tắt trong kỳ */}
              <div className="grid grid-cols-4 gap-2 text-center border p-2.5 rounded-lg bg-white">
                <div>
                  <div className="text-[11px] text-slate-500">Tồn Đầu Kỳ</div>
                  <div className="text-base font-bold text-slate-800">{stockCardData.ton_dau_ky.toLocaleString("vi-VN")}</div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-600">Tổng Nhập Trong Kỳ</div>
                  <div className="text-base font-bold text-emerald-600">+{stockCardData.tong_nhap_trong_ky.toLocaleString("vi-VN")}</div>
                </div>
                <div>
                  <div className="text-[11px] text-rose-600">Tổng Xuất Trong Kỳ</div>
                  <div className="text-base font-bold text-rose-600">-{stockCardData.tong_xuat_trong_ky.toLocaleString("vi-VN")}</div>
                </div>
                <div>
                  <div className="text-[11px] text-blue-800">Tồn Cuối Kỳ</div>
                  <div className="text-base font-bold text-blue-800">{stockCardData.ton_cuoi_ky.toLocaleString("vi-VN")}</div>
                </div>
              </div>

              {/* Bảng chi tiết từng dòng biến động */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="font-semibold text-xs">Ngày Chứng Từ</TableHead>
                      <TableHead className="font-semibold text-xs">Mã Chứng Từ</TableHead>
                      <TableHead className="font-semibold text-xs">Loại Giao Dịch</TableHead>
                      <TableHead className="font-semibold text-xs">Diễn Giải</TableHead>
                      <TableHead className="font-semibold text-xs text-right text-emerald-700">SL Nhập</TableHead>
                      <TableHead className="font-semibold text-xs text-right text-rose-700">SL Xuất</TableHead>
                      <TableHead className="font-semibold text-xs text-right font-bold text-blue-800">Tồn Lũy Kế</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!stockCardData.movements || stockCardData.movements.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-slate-400">
                          Không có giao dịch phát sinh trong khoảng thời gian này
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockCardData.movements.map((m, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="text-xs text-slate-600">
                            {new Date(m.date).toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-indigo-600">
                            {m.ma_chung_tu}
                          </TableCell>
                          <TableCell>
                            {MOVEMENT_LABELS[m.loai_giao_dich] ? (
                              <Badge className={`text-[10px] ${MOVEMENT_LABELS[m.loai_giao_dich].color}`}>
                                {MOVEMENT_LABELS[m.loai_giao_dich].label}
                              </Badge>
                            ) : (
                              <Badge variant="outline">{m.loai_giao_dich}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 max-w-[220px] truncate">
                            {m.mo_ta}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-emerald-600">
                            {m.so_luong_nhap > 0 ? `+${m.so_luong_nhap.toLocaleString("vi-VN")}` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-rose-600">
                            {m.so_luong_xuat > 0 ? `-${m.so_luong_xuat.toLocaleString("vi-VN")}` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-blue-900 bg-blue-50/20">
                            {(m.ton_luy_ke ?? 0).toLocaleString("vi-VN")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setOpenCardModal(false)}>
              Đóng
            </Button>
            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5">
              <IconPrinter className="w-4 h-4" /> In Thẻ Kho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
