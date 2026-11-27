"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconBuildingFactory2,
  IconReceiptTax,
  IconChartPie,
  IconPlus,
  IconRefresh,
  IconCalculator,
  IconTool,
  IconFileSpreadsheet,
} from "@tabler/icons-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { exportToCSV } from "@/lib/export";
import {
  fetchVatReportAction,
  fetchFixedAssetsAction,
  createFixedAssetAction,
  addAssetMaintenanceAction,
  runMonthlyDepreciationAction,
  fetchBudgetVsActualAction,
  upsertBudgetAction,
  type VatReportData,
  type FixedAssetItem,
  type BudgetReportData,
} from "@/app/actions/accounting-expansion";

const fmtVnd = (n: number) => `${Math.round(n || 0).toLocaleString("vi-VN")} đ`;

export default function AccountingExpansionPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const [assets, setAssets] = useState<FixedAssetItem[]>([]);
  const [vatReport, setVatReport] = useState<VatReportData | null>(null);
  const [budgetReport, setBudgetReport] = useState<BudgetReportData | null>(null);

  // Dialogs
  const [assetDialog, setAssetDialog] = useState(false);
  const [assetForm, setAssetForm] = useState({
    ten_tai_san: "",
    category: "Máy móc thiết bị",
    department: "Xưởng sản xuất",
    original_cost: 120000000,
    salvage_value: 0,
    useful_life_months: 60,
  });

  const [maintTarget, setMaintTarget] = useState<FixedAssetItem | null>(null);
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState(500000);

  const [budgetDialog, setBudgetDialog] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    department: "Toàn công ty",
    category: "all",
    planned_amount: 50000000,
    note: "",
  });

  const loadAll = async () => {
    setLoading(true);
    const [aRes, vRes, bRes] = await Promise.all([
      fetchFixedAssetsAction(),
      fetchVatReportAction({ year, month }),
      fetchBudgetVsActualAction(year, month),
    ]);
    if (aRes.success && aRes.items) setAssets(aRes.items);
    if (vRes.success && vRes.data) setVatReport(vRes.data);
    if (bRes.success && bRes.data) setBudgetReport(bRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const handleCreateAsset = async () => {
    if (!assetForm.ten_tai_san.trim() || assetForm.original_cost <= 0) {
      toast.error("Vui lòng nhập tên tài sản và nguyên giá > 0");
      return;
    }
    const res = await createFixedAssetAction(assetForm);
    if (res.success) {
      toast.success("Đã thêm tài sản cố định mới");
      setAssetDialog(false);
      setAssetForm({ ...assetForm, ten_tai_san: "" });
      loadAll();
    } else {
      toast.error(res.error || "Thêm tài sản thất bại");
    }
  };

  const handleRunDepreciation = async () => {
    const res = await runMonthlyDepreciationAction({ month, year, post_to_cashbook: false });
    if (res.success) {
      toast.success(res.message || `Đã trích khấu hao Tháng ${month}/${year}`);
      loadAll();
    } else {
      toast.error(res.error || "Chạy khấu hao thất bại");
    }
  };

  const handleSaveMaintenance = async () => {
    if (!maintTarget || !maintDesc.trim()) return;
    const res = await addAssetMaintenanceAction(maintTarget._id, {
      description: maintDesc,
      cost: maintCost,
    });
    if (res.success) {
      toast.success("Đã ghi nhận lịch sử bảo trì thiết bị");
      setMaintTarget(null);
      setMaintDesc("");
      loadAll();
    } else {
      toast.error(res.error || "Ghi nhận bảo trì thất bại");
    }
  };

  const handleSaveBudget = async () => {
    const res = await upsertBudgetAction({
      ...budgetForm,
      year,
      month,
    });
    if (res.success) {
      toast.success("Đã lưu dự toán ngân sách phòng ban");
      setBudgetDialog(false);
      loadAll();
    } else {
      toast.error(res.error || "Lưu ngân sách thất bại");
    }
  };

  const exportVatExcel = () => {
    if (!vatReport) return;
    const rows = [
      ...vatReport.output_invoices.map((r) => ({
        Loai: "Bán ra (Đầu ra)",
        MaChungTu: r.ma_chung_tu,
        DoiTuong: r.doi_tuong,
        GiaTriChuaThue: r.doanh_thu_chua_thue || 0,
        ThueSuatPct: r.thue_suat,
        TienThueVAT: r.tien_thue_gtgt,
        TongThanhToan: r.tong_thanh_toan,
      })),
      ...vatReport.input_invoices.map((r) => ({
        Loai: "Mua vào (Đầu vào)",
        MaChungTu: r.ma_chung_tu,
        DoiTuong: r.doi_tuong,
        GiaTriChuaThue: r.gia_tri_chua_thue || 0,
        ThueSuatPct: r.thue_suat,
        TienThueVAT: r.tien_thue_gtgt,
        TongThanhToan: r.tong_thanh_toan,
      })),
    ];
    const columns = [
      { key: "Loai", label: "Loại hóa đơn" },
      { key: "MaChungTu", label: "Mã chứng từ" },
      { key: "DoiTuong", label: "Khách hàng / Nhà cung cấp" },
      { key: "GiaTriChuaThue", label: "Giá trị chưa thuế (VNĐ)" },
      { key: "ThueSuatPct", label: "Thuế suất (%)" },
      { key: "TienThueVAT", label: "Tiền thuế GTGT (VNĐ)" },
      { key: "TongThanhToan", label: "Tổng thanh toán (VNĐ)" },
    ];
    exportToCSV(`BangKe_VAT_${year}_${String(month).padStart(2, "0")}`, columns, rows);
    toast.success("Đã xuất bảng kê thuế GTGT chuẩn Excel (UTF-8 BOM)");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thuế GTGT (VAT) · Tài Sản Cố Định · Ngân Sách</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý tài sản & khấu hao đường thẳng, bảng kê thuế GTGT đầu vào/đầu ra chuẩn HTKK và dự toán ngân sách phòng ban.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[year - 1, year, year + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadAll} disabled={loading}>
            <IconRefresh className="size-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets" className="gap-1.5">
            <IconBuildingFactory2 className="size-4" />
            Tài Sản Cố Định & Khấu Hao ({assets.length})
          </TabsTrigger>
          <TabsTrigger value="vat" className="gap-1.5">
            <IconReceiptTax className="size-4" />
            Bảng Kê Thuế GTGT (VAT)
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-1.5">
            <IconChartPie className="size-4" />
            Dự Toán Ngân Sách (Budget vs Actual)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FIXED ASSETS & DEPRECIATION */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleRunDepreciation}>
              <IconCalculator className="size-4 mr-1.5" />
              Chạy Trích Khấu Hao Tháng {month}/{year}
            </Button>
            <Button onClick={() => setAssetDialog(true)}>
              <IconPlus className="size-4 mr-1.5" />
              Thêm Tài Sản Cố Định
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã TSCĐ</TableHead>
                    <TableHead>Tên tài sản / Máy móc</TableHead>
                    <TableHead>Bộ phận</TableHead>
                    <TableHead className="text-right">Nguyên giá</TableHead>
                    <TableHead className="text-right">Khấu hao / tháng</TableHead>
                    <TableHead className="text-right">Lũy kế KH</TableHead>
                    <TableHead className="text-right">Giá trị còn lại</TableHead>
                    <TableHead className="text-right">Bảo trì</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell className="font-mono text-xs font-bold">{a.ma_tai_san}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{a.ten_tai_san}</div>
                        <div className="text-xs text-muted-foreground">{a.category} · {a.useful_life_months} tháng</div>
                      </TableCell>
                      <TableCell className="text-xs">{a.department}</TableCell>
                      <TableCell className="text-right">{fmtVnd(a.original_cost)}</TableCell>
                      <TableCell className="text-right text-amber-600 font-medium">{fmtVnd(a.depreciation.monthly_depreciation)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmtVnd(a.accumulated_depreciation)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{fmtVnd(a.depreciation.net_book_value)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setMaintTarget(a)}>
                          <IconTool className="size-3.5 mr-1" />
                          ({a.maintenance_logs?.length || 0})
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && assets.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chưa có tài sản cố định nào.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: VAT REPORT */}
        <TabsContent value="vat" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">VAT Đầu Ra ({vatReport?.summary.output_invoice_count || 0} HĐ)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{fmtVnd(vatReport?.summary.total_output_vat || 0)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">VAT Đầu Vào ({vatReport?.summary.input_invoice_count || 0} HĐ)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600">{fmtVnd(vatReport?.summary.total_input_vat || 0)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Thuế GTGT Phải Nộp</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-rose-600">{fmtVnd(vatReport?.summary.vat_payable || 0)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Còn Được Khấu Trừ Kỳ Sau</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-primary">{fmtVnd(vatReport?.summary.vat_credit_carryforward || 0)}</div></CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={exportVatExcel}>
              <IconFileSpreadsheet className="size-4 mr-1.5 text-emerald-600" />
              Xuất Bảng Kê VAT Excel (HTKK)
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bảng Kê Hóa Đơn Bán Ra — {vatReport?.period_label}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chứng từ</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead className="text-right">Chưa thuế</TableHead>
                      <TableHead className="text-right">Thuế VAT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(vatReport?.output_invoices || []).slice(0, 20).map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{r.ma_chung_tu}</TableCell>
                        <TableCell className="text-xs truncate max-w-[140px]">{r.doi_tuong}</TableCell>
                        <TableCell className="text-right text-xs">{fmtVnd(r.doanh_thu_chua_thue || 0)}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-blue-600">{fmtVnd(r.tien_thue_gtgt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bảng Kê Hóa Đơn Mua Vào — {vatReport?.period_label}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chứng từ</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead className="text-right">Chưa thuế</TableHead>
                      <TableHead className="text-right">Thuế VAT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(vatReport?.input_invoices || []).slice(0, 20).map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{r.ma_chung_tu}</TableCell>
                        <TableCell className="text-xs truncate max-w-[140px]">{r.doi_tuong}</TableCell>
                        <TableCell className="text-right text-xs">{fmtVnd(r.gia_tri_chua_thue || 0)}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-emerald-600">{fmtVnd(r.tien_thue_gtgt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: BUDGET VS ACTUAL */}
        <TabsContent value="budget" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Tổng dự toán Tháng {month}/{year}: <b>{fmtVnd(budgetReport?.summary.total_planned || 0)}</b> · Thực chi: <b>{fmtVnd(budgetReport?.summary.total_actual || 0)}</b> ({budgetReport?.summary.overall_utilization_pct || 0}%)
            </div>
            <Button onClick={() => setBudgetDialog(true)}>
              <IconPlus className="size-4 mr-1.5" />
              Thiết Lập Hạn Mức Ngân Sách
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">So Sánh Dự Toán vs Thực Chi Theo Phòng Ban</CardTitle>
              <CardDescription>Tự động đối chiếu với phiếu chi Sổ Quỹ trong kỳ và cảnh báo khi đạt ngưỡng 80% / vượt 100%.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead>Hạng mục</TableHead>
                    <TableHead className="text-right">Dự toán (Budget)</TableHead>
                    <TableHead className="text-right">Thực chi (Actual)</TableHead>
                    <TableHead className="text-right">Còn lại</TableHead>
                    <TableHead className="text-right">Tỷ lệ dùng</TableHead>
                    <TableHead>Cảnh báo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(budgetReport?.rows || []).map((b, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{b.department}</TableCell>
                      <TableCell className="text-xs font-mono">{b.category}</TableCell>
                      <TableCell className="text-right">{fmtVnd(b.planned_amount)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtVnd(b.actual_amount)}</TableCell>
                      <TableCell className={`text-right font-bold ${b.remaining_amount < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {fmtVnd(b.remaining_amount)}
                      </TableCell>
                      <TableCell className="text-right font-bold">{b.utilization_pct}%</TableCell>
                      <TableCell>
                        <Badge variant={b.alert_status === "EXCEEDED" ? "destructive" : b.alert_status === "WARNING" ? "secondary" : "default"}>
                          {b.alert_status === "EXCEEDED" ? "Vượt ngân sách" : b.alert_status === "WARNING" ? "Cận ngưỡng" : "An toàn"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && (budgetReport?.rows || []).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chưa thiết lập ngân sách cho Tháng {month}/{year}.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Thêm TSCĐ */}
      <Dialog open={assetDialog} onOpenChange={setAssetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm Tài Sản Cố Định Mới</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Tên tài sản / Máy móc *</Label><Input placeholder="VD: Máy cắt CNC 1325" value={assetForm.ten_tai_san} onChange={(e) => setAssetForm({ ...assetForm, ten_tai_san: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nhóm tài sản</Label><Input value={assetForm.category} onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Bộ phận sử dụng</Label><Input value={assetForm.department} onChange={(e) => setAssetForm({ ...assetForm, department: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5"><Label>Nguyên giá</Label><Input type="number" value={assetForm.original_cost} onChange={(e) => setAssetForm({ ...assetForm, original_cost: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Giá trị thanh lý</Label><Input type="number" value={assetForm.salvage_value} onChange={(e) => setAssetForm({ ...assetForm, salvage_value: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Số tháng KH</Label><Input type="number" value={assetForm.useful_life_months} onChange={(e) => setAssetForm({ ...assetForm, useful_life_months: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetDialog(false)}>Hủy</Button>
            <Button onClick={handleCreateAsset}>Lưu TSCĐ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Bảo trì */}
      <Dialog open={!!maintTarget} onOpenChange={(o) => !o && setMaintTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ghi Nhận Bảo Trì — {maintTarget?.ma_tai_san}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nội dung bảo trì / sửa chữa *</Label><Input placeholder="VD: Thay dầu thủy lực định kỳ" value={maintDesc} onChange={(e) => setMaintDesc(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Chi phí phát sinh (VNĐ)</Label><Input type="number" value={maintCost} onChange={(e) => setMaintCost(Number(e.target.value))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintTarget(null)}>Hủy</Button>
            <Button onClick={handleSaveMaintenance}>Lưu bảo trì</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Thiết lập Ngân sách */}
      <Dialog open={budgetDialog} onOpenChange={setBudgetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thiết Lập Ngân Sách Tháng {month}/{year}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Phòng ban</Label><Input value={budgetForm.department} onChange={(e) => setBudgetForm({ ...budgetForm, department: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Hạng mục chi</Label>
              <Select value={budgetForm.category} onValueChange={(v) => setBudgetForm({ ...budgetForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tổng ngân sách chi (Tất cả)</SelectItem>
                  <SelectItem value="chi_phi_van_hanh">Chi phí vận hành (OPEX)</SelectItem>
                  <SelectItem value="chi_luong">Chi quỹ lương</SelectItem>
                  <SelectItem value="chi_mua_hang">Chi mua nguyên vật liệu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Hạn mức dự toán (VNĐ)</Label><Input type="number" value={budgetForm.planned_amount} onChange={(e) => setBudgetForm({ ...budgetForm, planned_amount: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Ghi chú</Label><Input value={budgetForm.note} onChange={(e) => setBudgetForm({ ...budgetForm, note: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialog(false)}>Hủy</Button>
            <Button onClick={handleSaveBudget}>Lưu dự toán</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
