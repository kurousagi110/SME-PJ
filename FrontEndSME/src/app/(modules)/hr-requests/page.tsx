"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconCalendarEvent,
  IconClockPlus,
  IconQrcode,
  IconMapPin,
  IconPlus,
  IconCheck,
  IconX,
  IconRefresh,
} from "@tabler/icons-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import {
  fetchHrRequestsAction,
  fetchLeaveBalanceAction,
  createHrRequestAction,
  decideHrRequestAction,
  generateAttendanceQrAction,
  smartCheckInAction,
  type HrRequestItem,
  type LeaveBalanceData,
  type AttendanceQrToken,
} from "@/app/actions/hr-requests";
import { useMyProfile } from "@/hooks/use-account";
import { isAdminOrDirector, hasPermission } from "@/lib/permissions";

const TYPE_LABELS: Record<string, string> = {
  leave: "Nghỉ phép",
  overtime: "Tăng ca (OT)",
  late_early: "Đi muộn / Về sớm",
  business_trip: "Công tác",
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Chờ duyệt", variant: "secondary" },
  approved: { label: "Đã duyệt", variant: "default" },
  rejected: { label: "Từ chối", variant: "destructive" },
  cancelled: { label: "Đã hủy", variant: "outline" },
};

export default function HrRequestsEssPage() {
  const { data: profile } = useMyProfile();
  const canApprove =
    isAdminOrDirector(profile) || hasPermission(profile, ["hr.manage", "approvals.view"]);

  const [items, setItems] = useState<HrRequestItem[]>([]);
  const [balance, setBalance] = useState<LeaveBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    loai_don: "leave" as "leave" | "overtime" | "late_early" | "business_trip",
    tu_ngay: todayStr,
    den_ngay: todayStr,
    nua_ngay: false,
    hinh_thuc_nghi: "phep_nam",
    so_gio_ot: 2,
    he_so_ot: 1.5,
    ly_do: "",
  });

  // Smart Attendance QR / GPS state
  const [qrDialog, setQrDialog] = useState(false);
  const [qrData, setQrData] = useState<AttendanceQrToken | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [rRes, bRes] = await Promise.all([
      fetchHrRequestsAction({ status: statusFilter === "all" ? "" : statusFilter }),
      fetchLeaveBalanceAction(),
    ]);
    if (rRes.success && rRes.items) setItems(rRes.items);
    if (bRes.success && bRes.data) setBalance(bRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.ly_do.trim()) {
      toast.error("Vui lòng nhập lý do gửi đơn");
      return;
    }
    setSubmitting(true);
    const res = await createHrRequestAction(form);
    if (res.success) {
      toast.success("Đã gửi đơn thành công! Chờ quản lý phê duyệt.");
      setCreateOpen(false);
      setForm({ ...form, ly_do: "" });
      loadData();
    } else {
      toast.error(res.error || "Gửi đơn thất bại");
    }
    setSubmitting(false);
  };

  const handleDecide = async (id: string, action: "approve" | "reject") => {
    const res = await decideHrRequestAction(id, action);
    if (res.success) {
      toast.success(action === "approve" ? "Đã phê duyệt đơn" : "Đã từ chối đơn");
      loadData();
    } else {
      toast.error(res.error || "Thao tác thất bại");
    }
  };

  const handleShowDynamicQr = async () => {
    const res = await generateAttendanceQrAction();
    if (res.success && res.data) {
      setQrData(res.data);
      setQrDialog(true);
    } else {
      toast.error(res.error || "Không thể sinh mã QR chấm công");
    }
  };

  const handleSmartAttendance = async (mode: "check_in" | "check_out") => {
    setCheckingIn(true);
    const submitWithCoords = async (lat: number | null, lng: number | null) => {
      const res = await smartCheckInAction({
        mode,
        qr_token: qrInput.trim() || undefined,
        lat,
        lng,
      });
      if (res.success) {
        toast.success(res.message || "Chấm công thành công!");
        setQrInput("");
      } else {
        toast.error(res.error || "Chấm công thất bại");
      }
      setCheckingIn(false);
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => submitWithCoords(pos.coords.latitude, pos.coords.longitude),
        () => submitWithCoords(null, null),
        { timeout: 5000 }
      );
    } else {
      await submitWithCoords(null, null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cổng Nhân Sự Tự Phục Vụ (ESS)</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý đơn xin nghỉ phép năm, đăng ký tăng ca OT (đồng bộ tự động bảng lương), đi muộn và chấm công QR/GPS.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleShowDynamicQr}>
            <IconQrcode className="size-4 mr-1.5" />
            Mã QR Chấm Công
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <IconPlus className="size-4 mr-1.5" />
            Tạo Đơn Từ Mới
          </Button>
        </div>
      </div>

      {/* Quỹ phép năm + Chấm công thông minh */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Phép Năm {balance?.year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance?.total_annual ?? 12} ngày</div>
            <p className="text-xs text-muted-foreground">
              Đã dùng: {balance?.used_days ?? 0} · Chờ duyệt: {balance?.pending_days ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Phép Năm Còn Lại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{balance?.remaining_days ?? 12} ngày</div>
            <p className="text-xs text-muted-foreground">Khả dụng để đăng ký nghỉ phép</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
              <IconMapPin className="size-4 text-primary" />
              Chấm Công Thông Minh (GPS Geofencing / Mã QR Động)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Nhập mã QR tại quầy (nếu có)..."
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value.toUpperCase())}
              className="flex-1 min-w-[180px] h-9 font-mono text-xs"
            />
            <Button size="sm" onClick={() => handleSmartAttendance("check_in")} disabled={checkingIn}>
              <IconClockPlus className="size-4 mr-1" />
              Vào ca
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleSmartAttendance("check_out")} disabled={checkingIn}>
              Tan ca
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Danh sách đơn từ */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <IconCalendarEvent className="size-4 text-primary" />
              Danh Sách Đơn Từ Nhân Sự
            </CardTitle>
            <CardDescription>Đơn đã duyệt tự động đồng bộ vào kỳ tính lương (OT, miễn phạt đi muộn).</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={loadData}>
              <IconRefresh className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Loại đơn</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Chi tiết</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Trạng thái</TableHead>
                {canApprove && <TableHead className="text-right">Duyệt</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const badge = STATUS_BADGE[it.trang_thai] || STATUS_BADGE.pending;
                return (
                  <TableRow key={it._id}>
                    <TableCell className="font-mono text-xs font-semibold">{it.ma_don}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{it.ho_ten}</div>
                      <div className="text-xs text-muted-foreground">{it.phong_ban || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[it.loai_don] || it.loai_don}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(it.tu_ngay).toLocaleDateString("vi-VN")}
                      {it.den_ngay && it.den_ngay !== it.tu_ngay
                        ? ` → ${new Date(it.den_ngay).toLocaleDateString("vi-VN")}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-xs">
                      {it.loai_don === "overtime"
                        ? `${it.so_gio_ot} giờ (×${it.he_so_ot})`
                        : `${it.so_ngay} ngày${it.hinh_thuc_nghi === "khong_luong" ? " (KL)" : ""}`}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs" title={it.ly_do}>
                      {it.ly_do}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    {canApprove && (
                      <TableCell className="text-right space-x-1">
                        {it.trang_thai === "pending" ? (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7 text-emerald-600"
                              onClick={() => handleDecide(it._id, "approve")}
                              title="Phê duyệt"
                            >
                              <IconCheck className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDecide(it._id, "reject")}
                              title="Từ chối"
                            >
                              <IconX className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {it.approved_by?.ho_ten || "—"}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canApprove ? 8 : 7} className="text-center text-muted-foreground py-8">
                    Chưa có đơn từ nhân sự nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Tạo Đơn Từ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo Đơn Từ Nhân Sự (ESS)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Loại đơn</Label>
              <Select
                value={form.loai_don}
                onValueChange={(v) => setForm({ ...form, loai_don: v as typeof form.loai_don })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leave">Xin nghỉ phép</SelectItem>
                  <SelectItem value="overtime">Đăng ký tăng ca (OT)</SelectItem>
                  <SelectItem value="late_early">Xin đi muộn / về sớm</SelectItem>
                  <SelectItem value="business_trip">Đăng ký công tác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={form.tu_ngay}
                  onChange={(e) => setForm({ ...form, tu_ngay: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={form.den_ngay}
                  onChange={(e) => setForm({ ...form, den_ngay: e.target.value })}
                />
              </div>
            </div>

            {form.loai_don === "leave" && (
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1.5">
                  <Label>Hình thức nghỉ</Label>
                  <Select
                    value={form.hinh_thuc_nghi}
                    onValueChange={(v) => setForm({ ...form, hinh_thuc_nghi: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phep_nam">Nghỉ phép năm (hưởng lương)</SelectItem>
                      <SelectItem value="khong_luong">Nghỉ không lương</SelectItem>
                      <SelectItem value="om_dau">Nghỉ ốm / BHXH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-5">
                  <Checkbox
                    id="half_day"
                    checked={form.nua_ngay}
                    onCheckedChange={(v) => setForm({ ...form, nua_ngay: Boolean(v) })}
                  />
                  <Label htmlFor="half_day">Nghỉ nửa ngày (0.5 ngày)</Label>
                </div>
              </div>
            )}

            {form.loai_don === "overtime" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Số giờ tăng ca (OT)</Label>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={form.so_gio_ot}
                    onChange={(e) => setForm({ ...form, so_gio_ot: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hệ số OT theo Luật LĐ</Label>
                  <Select
                    value={String(form.he_so_ot)}
                    onValueChange={(v) => setForm({ ...form, he_so_ot: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.5">150% — Ngày thường</SelectItem>
                      <SelectItem value="2">200% — Cuối tuần</SelectItem>
                      <SelectItem value="3">300% — Ngày lễ / Tết</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Lý do chi tiết *</Label>
              <Textarea
                rows={3}
                placeholder="Nhập lý do gửi đơn..."
                value={form.ly_do}
                onChange={(e) => setForm({ ...form, ly_do: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Đang gửi..." : "Gửi duyệt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hiển thị mã QR Chấm Công Động */}
      <Dialog open={qrDialog} onOpenChange={setQrDialog}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Mã QR Chấm Công Động</DialogTitle>
          </DialogHeader>
          {qrData && (
            <div className="space-y-3 py-2">
              <div className="p-4 rounded-lg border bg-muted/40 font-mono text-lg font-bold tracking-wider text-primary select-all">
                {qrData.token}
              </div>
              <p className="text-xs text-muted-foreground">
                Mã tự động xoay mỗi <b>{qrData.rotationSeconds} giây</b> để chống chụp ảnh gửi hộ.
                Hết hạn lúc: {new Date(qrData.expiresAt).toLocaleTimeString("vi-VN")}.
              </p>
              <Button variant="outline" size="sm" onClick={handleShowDynamicQr}>
                <IconRefresh className="size-4 mr-1" />
                Làm mới mã QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
