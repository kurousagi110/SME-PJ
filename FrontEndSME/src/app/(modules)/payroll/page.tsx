"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calculator,
  Download,
  Printer,
  Users,
  Clock,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  calculatePayrollAction,
  chiTraLuongAction,
  fetchTrangThaiChiLuongAction,
} from "@/app/actions/payroll";
import { exportToCSV } from "@/lib/export";
import { useStaffList } from "@/hooks/use-staff";

type PayrollItem = {
  ma_nv: string;
  ho_ten: string | null;
  phong_ban: string | null;
  chuc_vu: string | null;
  thang: number;
  nam: number;
  so_ngay_cong: number;
  tong_gio_lam: number;
  so_ngay_di_tre: number;
  he_so_luong: number;
  luong_co_ban: number;
  luong_theo_cong?: number;
  don_gia_gio_override: number | null;
  doanh_so_ban_hang?: number;
  hoa_hong_kd?: number;
  san_luong_sx?: number;
  thuong_nang_suat_sx?: number;
  khau_tru_di_tre?: number;
  thuong_khac?: number;
  phat_khac?: number;
  so_gio_ot?: number;
  luong_tang_ca?: number;
  tong_bh_nld?: number;
  tong_bh_dn?: number;
  thue_tncn?: number;
  thuong: number;
  phat: number;
  ghi_chu?: string;
  luong_thuc_nhan: number;
};

export default function PayrollPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = React.useState<number>(currentMonth);
  const [year, setYear] = React.useState<number>(currentYear);
  const [selectedStaff, setSelectedStaff] = React.useState<string>("ALL");
  const [hourlyRate, setHourlyRate] = React.useState<string>("");
  const [bonus, setBonus] = React.useState<string>("0");
  const [penalty, setPenalty] = React.useState<string>("0");

  const [payrollResult, setPayrollResult] = React.useState<PayrollItem[]>([]);
  const [payStatus, setPayStatus] = React.useState<{ da_chi: boolean; phieu_chi?: any } | null>(null);

  // Fetch staff for dropdown
  const { data: staffData } = useStaffList({ page: 1, limit: 100 });
  const staffList = (staffData?.data || []) as any[];

  // Check payment status whenever month/year change
  const checkStatus = React.useCallback(async (m: number, y: number) => {
    try {
      const res = await fetchTrangThaiChiLuongAction(m, y);
      if (res.success && res.data) {
        setPayStatus(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    checkStatus(month, year);
  }, [month, year, checkStatus]);

  // Mutation to pay salary
  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await chiTraLuongAction({
        thang: Number(month),
        nam: Number(year),
        phuong_thuc: "tien_mat",
        ghi_chu: `Chi trả lương kỳ Tháng ${month}/${year} cho toàn bộ nhân sự`,
      });
      if (!res.success) {
        throw new Error(res.error || "Chi trả lương thất bại");
      }
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Đã chi trả lương thành công! Mã phiếu chi: ${data?.phieu_chi?.ma_phieu || ""}`);
      setPayStatus({ da_chi: true, phieu_chi: data?.phieu_chi });
    },
    onError: (err: any) => {
      toast.error(err.message || "Chi trả lương thất bại");
    },
  });

  // Mutation to calculate payroll
  const calculateMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        thang: Number(month),
        nam: Number(year),
      };
      if (selectedStaff && selectedStaff !== "ALL") {
        payload.ma_nv = selectedStaff;
      }
      if (hourlyRate) {
        payload.don_gia_gio = Number(hourlyRate);
      }
      if (bonus) {
        payload.thuong = Number(bonus);
      }
      if (penalty) {
        payload.phat = Number(penalty);
      }

      const res = await calculatePayrollAction(payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      const items = (data?.items || []) as PayrollItem[];
      setPayrollResult(items);
      if (items.length === 0) {
        toast.info(`Không có dữ liệu chấm công trong tháng ${month}/${year}`);
      } else {
        toast.success(`Đã tính lương thành công cho ${items.length} nhân sự`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Tính lương thất bại");
    },
  });

  // Calculate automatically on first mount
  React.useEffect(() => {
    calculateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Summary Metrics
  const { totalPayroll, totalHours, totalStaff, totalLateDays } =
    React.useMemo(() => {
      const total = payrollResult.reduce(
        (sum, item) => sum + Number(item.luong_thuc_nhan || 0),
        0
      );
      const hours = payrollResult.reduce(
        (sum, item) => sum + Number(item.tong_gio_lam || 0),
        0
      );
      const late = payrollResult.reduce(
        (sum, item) => sum + Number(item.so_ngay_di_tre || 0),
        0
      );
      return {
        totalPayroll: total,
        totalHours: hours,
        totalStaff: payrollResult.length,
        totalLateDays: late,
      };
    }, [payrollResult]);

  const toVND = (n: number) =>
    (Number.isFinite(n) ? n : 0).toLocaleString("vi-VN") + " đ";

  const escapeHtml = (val: unknown) =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Print individual payslip (A5)
  const printPayslip = (item: PayrollItem) => {
    const safeName = escapeHtml(item.ho_ten || "Chưa cập nhật");
    const safeMaNv = escapeHtml(item.ma_nv);
    const safePhongBan = escapeHtml(item.phong_ban || "-");
    const safeChucVu = escapeHtml(item.chuc_vu || "-");
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Phiếu lương - ${escapeHtml(item.ho_ten || item.ma_nv)}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 25px; color: #333; font-size: 13px; line-height: 1.5; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
          .title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; color: #1e40af; margin: 15px 0; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 15px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #f1f5f9; }
          .net-salary { font-size: 16px; font-weight: bold; color: #2563eb; background: #eff6ff; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 30px; }
          .sig-title { font-weight: bold; margin-bottom: 50px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <strong>HỆ THỐNG QUẢN LÝ DOANH NGHIỆP SME</strong><br/>
            <span>Bộ phận Nhân sự & Tiền lương</span>
          </div>
          <div style="text-align: right;">
            <span>Kỳ lương: <strong>Tháng ${item.thang}/${item.nam}</strong></span>
          </div>
        </div>

        <div class="title">PHIẾU LƯƠNG NHÂN VIÊN</div>

        <div class="info-box">
          <div class="info-grid">
            <div><strong>Họ và tên:</strong> ${safeName}</div>
            <div><strong>Mã nhân viên:</strong> ${safeMaNv}</div>
            <div><strong>Phòng ban:</strong> ${safePhongBan}</div>
            <div><strong>Chức vụ:</strong> ${safeChucVu}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Khoản mục</th>
              <th>Chi tiết / Chỉ số</th>
              <th style="text-align: right;">Số tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Số ngày công thực tế</td>
              <td>${item.so_ngay_cong} ngày (${item.tong_gio_lam} giờ làm)</td>
              <td style="text-align: right;">-</td>
            </tr>
            <tr>
              <td>Số lần đi trễ</td>
              <td>${item.so_ngay_di_tre} lần</td>
              <td style="text-align: right;">-</td>
            </tr>
            <tr>
              <td>Lương cơ bản theo hệ số</td>
              <td>Hệ số: ${item.he_so_luong} (Theo công: ${toVND(item.luong_theo_cong ?? item.luong_co_ban)})</td>
              <td style="text-align: right;">${toVND(item.luong_theo_cong ?? item.luong_co_ban)}</td>
            </tr>
            ${(item.hoa_hong_kd || 0) > 0 ? `
            <tr>
              <td>Hoa hồng Kinh doanh (2%)</td>
              <td>Doanh số thuần: ${toVND(item.doanh_so_ban_hang || 0)}</td>
              <td style="text-align: right; color: #16a34a;">+ ${toVND(item.hoa_hong_kd || 0)}</td>
            </tr>` : ""}
            ${(item.thuong_nang_suat_sx || 0) > 0 ? `
            <tr>
              <td>Thưởng năng suất / Lương khoán SX</td>
              <td>Sản lượng đạt chuẩn: ${item.san_luong_sx || 0} SP</td>
              <td style="text-align: right; color: #16a34a;">+ ${toVND(item.thuong_nang_suat_sx || 0)}</td>
            </tr>` : ""}
            <tr>
              <td>Tiền thưởng khác / Phụ cấp</td>
              <td>Thưởng bổ sung</td>
              <td style="text-align: right; color: #16a34a;">+ ${toVND(item.thuong_khac ?? item.thuong)}</td>
            </tr>
            ${(item.khau_tru_di_tre || 0) > 0 ? `
            <tr>
              <td>Khấu trừ đi trễ tự động</td>
              <td>${item.so_ngay_di_tre} buổi x 50.000 đ</td>
              <td style="text-align: right; color: #dc2626;">- ${toVND(item.khau_tru_di_tre || 0)}</td>
            </tr>` : ""}
            <tr>
              <td>Khấu trừ / Phạt khác</td>
              <td>Phạt bổ sung</td>
              <td style="text-align: right; color: #dc2626;">- ${toVND(item.phat_khac ?? 0)}</td>
            </tr>
            <tr class="net-salary">
              <td colspan="2"><strong>THỰC LĨNH (NET SALARY)</strong></td>
              <td style="text-align: right;"><strong>${toVND(item.luong_thuc_nhan)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div class="sig-title">Người nhận lương</div>
            <div>(Ký & ghi rõ họ tên)</div>
          </div>
          <div>
            <div class="sig-title">Người duyệt bảng lương</div>
            <div>(Ký & đóng dấu)</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank", "width=750,height=800");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  };

  return (
    <div className="px-4 lg:px-6 space-y-6">
      {/* HEADER TITLE */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Quản Lý Bảng Lương (Payroll)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tổng hợp dữ liệu chấm công, tính lương theo hệ số và xuất phiếu lương nhân viên
          </p>
        </div>

        <div className="flex items-center gap-2">
          {payStatus?.da_chi ? (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-300 py-1.5 px-3 flex items-center gap-1.5 font-medium"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Đã chi lương ({toVND(payStatus.phieu_chi?.so_tien || totalPayroll)})
            </Badge>
          ) : (
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              disabled={payrollResult.length === 0 || payMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Xác nhận duyệt và xuất phiếu chi trả lương ${toVND(totalPayroll)} cho Tháng ${month}/${year}? Hệ thống sẽ tự động ghi sổ quỹ chi tiền.`
                  )
                ) {
                  payMutation.mutate();
                }
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {payMutation.isPending ? "Đang xử lý..." : "Duyệt & Chi Trả Lương"}
            </Button>
          )}

          <Button
            variant="outline"
            disabled={payrollResult.length === 0}
            onClick={() => {
              exportToCSV(
                `Bang_luong_thang_${month}_${year}`,
                [
                  { key: "ma_nv", label: "Mã NV" },
                  { key: "ho_ten", label: "Họ và tên" },
                  { key: "phong_ban", label: "Phòng ban" },
                  { key: "chuc_vu", label: "Chức vụ" },
                  { key: "so_ngay_cong", label: "Ngày công" },
                  { key: "tong_gio_lam", label: "Tổng giờ làm" },
                  { key: "so_ngay_di_tre", label: "Đi trễ (ngày)" },
                  { key: "he_so_luong", label: "Hệ số" },
                  { key: "luong_co_ban", label: "Lương cơ bản", formatter: (v) => toVND(v) },
                  { key: "thuong", label: "Thưởng", formatter: (v) => toVND(v) },
                  { key: "phat", label: "Phạt", formatter: (v) => toVND(v) },
                  { key: "luong_thuc_nhan", label: "Thực nhận", formatter: (v) => toVND(v) },
                ],
                payrollResult
              );
            }}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            Xuất Excel Bảng Lương
          </Button>
        </div>
      </div>

      {/* FILTER & CALCULATION CONTROLS */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Thiết Lập Kỳ Tính Lương
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {/* Tháng */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tháng</Label>
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn tháng" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Tháng {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Năm */}
            <div className="space-y-1.5">
              <Label className="text-xs">Năm</Label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn năm" />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Năm {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chọn nhân viên */}
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs">Nhân viên</Label>
              <Select
                value={selectedStaff}
                onValueChange={(v) => setSelectedStaff(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả nhân viên</SelectItem>
                  {staffList.map((s) => (
                    <SelectItem key={s._id} value={s.ma_nv || s._id}>
                      {s.ho_ten} ({s.ma_nv || s._id.slice(-6)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tiền thưởng chung */}
            <div className="space-y-1.5">
              <Label className="text-xs">Thưởng (VNĐ)</Label>
              <Input
                type="number"
                min={0}
                step={50000}
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Nút Tính Lương */}
            <div>
              <Button
                className="w-full font-medium"
                onClick={() => calculateMutation.mutate()}
                disabled={calculateMutation.isPending}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {calculateMutation.isPending ? "Đang tính..." : "Tính Lương"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng Quỹ Lương
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {toVND(totalPayroll)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chi phí nhân sự tháng {month}/{year}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nhân Sự Hưởng Lương
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalStaff} nhân sự
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đã ghi nhận công trong kỳ
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng Giờ Làm Việc
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalHours} giờ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Trung bình: {totalStaff > 0 ? (totalHours / totalStaff).toFixed(1) : 0} giờ/người
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng Lượt Đi Trễ
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {totalLateDays} lượt
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Check-in sau 08:00 sáng
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DETAILED PAYROLL TABLE */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">
            Bảng Kê Chi Tiết Lương Tháng {month}/{year}
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            Tổng cộng {payrollResult.length} nhân viên
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Mã NV</TableHead>
                  <TableHead className="min-w-[150px]">Họ và tên</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Chức vụ</TableHead>
                  <TableHead className="text-right">Ngày công</TableHead>
                  <TableHead className="text-right">Giờ làm</TableHead>
                  <TableHead className="text-right">Đi trễ</TableHead>
                  <TableHead className="text-right">Hệ số</TableHead>
                  <TableHead className="text-right">Lương cơ bản</TableHead>
                  <TableHead className="text-right">KPI (Doanh số / SL)</TableHead>
                  <TableHead className="text-right">Thưởng + KPI + OT</TableHead>
                  <TableHead className="text-right">Phạt + Đi trễ</TableHead>
                  <TableHead className="text-right">BHXH & Thuế TNCN</TableHead>
                  <TableHead className="text-right font-bold text-primary">Thực nhận</TableHead>
                  <TableHead className="text-center w-[120px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollResult.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={14}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {calculateMutation.isPending
                        ? "Đang tính toán bảng lương..."
                        : "Không có dữ liệu chấm công cho kỳ lương này. Vui lòng bấm 'Tính Lương' sau khi chọn kỳ."}
                    </TableCell>
                  </TableRow>
                ) : (
                  payrollResult.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-medium">
                        {item.ma_nv}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.ho_ten || "Chưa cập nhật"}
                      </TableCell>
                      <TableCell>{item.phong_ban || "-"}</TableCell>
                      <TableCell>{item.chuc_vu || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.so_ngay_cong}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.tong_gio_lam}h
                      </TableCell>
                      <TableCell className="text-right">
                        {item.so_ngay_di_tre > 0 ? (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                            {item.so_ngay_di_tre}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.he_so_luong}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {toVND(item.luong_co_ban)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {(item.doanh_so_ban_hang || 0) > 0 && (
                          <div className="text-blue-600 font-medium">
                            DS: {toVND(item.doanh_so_ban_hang || 0)}
                          </div>
                        )}
                        {(item.san_luong_sx || 0) > 0 && (
                          <div className="text-indigo-600 font-medium">
                            SL: {item.san_luong_sx} SP
                          </div>
                        )}
                        {!(item.doanh_so_ban_hang || 0) && !(item.san_luong_sx || 0) && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        {item.thuong > 0 ? `+${toVND(item.thuong)}` : "-"}
                        {((item.hoa_hong_kd || 0) > 0 || (item.thuong_nang_suat_sx || 0) > 0 || (item.luong_tang_ca || 0) > 0) && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {(item.hoa_hong_kd || 0) > 0 ? `HH: ${toVND(item.hoa_hong_kd || 0)}` : ""}
                            {(item.thuong_nang_suat_sx || 0) > 0 ? ` SX: ${toVND(item.thuong_nang_suat_sx || 0)}` : ""}
                            {(item.luong_tang_ca || 0) > 0 ? ` OT: ${toVND(item.luong_tang_ca || 0)}` : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-red-500 font-medium">
                        {item.phat > 0 ? `-${toVND(item.phat)}` : "-"}
                        {(item.khau_tru_di_tre || 0) > 0 && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            Trễ: -{toVND(item.khau_tru_di_tre || 0)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-amber-700 dark:text-amber-400 text-xs">
                        {((item.tong_bh_nld || 0) + (item.thue_tncn || 0)) > 0 ? (
                          <>
                            <div className="font-medium">-{toVND((item.tong_bh_nld || 0) + (item.thue_tncn || 0))}</div>
                            <div className="text-[10px] text-muted-foreground">
                              BH: {toVND(item.tong_bh_nld || 0)} · TNCN: {toVND(item.thue_tncn || 0)}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-base">
                        {toVND(item.luong_thuc_nhan)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => printPayslip(item)}
                          className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Printer className="mr-1 h-3.5 w-3.5" />
                          Phiếu lương
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
    </div>
  );
}
