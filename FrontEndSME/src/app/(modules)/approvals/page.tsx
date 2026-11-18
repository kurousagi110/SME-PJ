"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  FileCheck,
  ShoppingBag,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Eye,
  CheckSquare,
} from "lucide-react";

import {
  fetchPendingApprovalsAction,
  processApprovalAction,
} from "@/app/actions/approval";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

const toVND = (x: number) => Number(x || 0).toLocaleString("vi-VN") + " đ";

function fmtDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type ApprovalKind = "purchase" | "stock_adjustment" | "sale" | "payroll" | "return_order";

interface SelectedApprovalItem {
  key: string;
  loai: ApprovalKind;
  id: string;
  title: string;
}

interface PreviewTarget {
  loai: ApprovalKind;
  title: string;
  raw: any;
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient();

  const [selectedKeys, setSelectedKeys] = React.useState<Record<string, SelectedApprovalItem>>({});
  const [batchRunning, setBatchRunning] = React.useState(false);

  // Shadcn Confirm / Reject Dialog State
  const [confirmState, setConfirmState] = React.useState<{
    open: boolean;
    mode: "approve" | "reject" | "batch_approve";
    loai?: ApprovalKind;
    id?: string;
    title: string;
    reason: string;
  }>({
    open: false,
    mode: "approve",
    title: "",
    reason: "",
  });

  // Quick-Preview Slide-Over Sheet State
  const [previewTarget, setPreviewTarget] = React.useState<PreviewTarget | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await fetchPendingApprovalsAction();
      return res.data;
    },
    refetchInterval: 15000,
  });

  const invalidateApprovalQueries = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
    queryClient.invalidateQueries({ queryKey: ["dieu-chinh-kho"] });
    queryClient.invalidateQueries({ queryKey: ["order-sale"] });
    queryClient.invalidateQueries({ queryKey: ["rma-orders"] });
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: async (payload: {
      loai: ApprovalKind | "rma";
      id: string;
      hanh_dong: "approve" | "reject";
      ghi_chu?: string;
      thang?: number;
      nam?: number;
    }) => {
      const res = await processApprovalAction(payload);
      if (!res.success) {
        throw new Error(res.error || "Xử lý phê duyệt thất bại");
      }
      return res;
    },
    onSuccess: (res) => {
      toast.success(res.message);
      invalidateApprovalQueries();
      setPreviewTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Xử lý thất bại");
    },
  });

  const handleApprove = (loai: ApprovalKind, id: string, title: string) => {
    setConfirmState({
      open: true,
      mode: "approve",
      loai,
      id,
      title,
      reason: "",
    });
  };

  const handleReject = (loai: ApprovalKind, id: string, title: string) => {
    setConfirmState({
      open: true,
      mode: "reject",
      loai,
      id,
      title,
      reason: "",
    });
  };

  const toggleSelect = (item: SelectedApprovalItem, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = { ...prev };
      if (checked) next[item.key] = item;
      else delete next[item.key];
      return next;
    });
  };

  const selectedItems = Object.values(selectedKeys);

  const executeConfirmDialog = async () => {
    if (confirmState.mode === "batch_approve") {
      if (selectedItems.length === 0) return;
      setBatchRunning(true);
      let ok = 0;
      let fail = 0;
      for (const item of selectedItems) {
        try {
          const res = await processApprovalAction({
            loai: item.loai,
            id: item.id,
            hanh_dong: "approve",
          });
          if (res.success) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      setBatchRunning(false);
      setSelectedKeys({});
      setConfirmState((s) => ({ ...s, open: false }));
      invalidateApprovalQueries();
      if (ok > 0) toast.success(`Đã phê duyệt thành công ${ok} chứng từ${fail > 0 ? `, ${fail} chứng từ lỗi` : ""}`);
      else toast.error(`Không thể phê duyệt ${fail} chứng từ đã chọn`);
      return;
    }

    if (!confirmState.loai || !confirmState.id) return;
    if (confirmState.mode === "approve") {
      mutation.mutate({
        loai: confirmState.loai,
        id: confirmState.id,
        hanh_dong: "approve",
      });
    } else {
      mutation.mutate({
        loai: confirmState.loai,
        id: confirmState.id,
        hanh_dong: "reject",
        ghi_chu: confirmState.reason.trim() || "Không đạt yêu cầu phê duyệt",
      });
    }
    setConfirmState((s) => ({ ...s, open: false }));
  };

  const pending = data || {
    totalPending: 0,
    purchases: [],
    stockAdjustments: [],
    sales: [],
    returnOrders: [],
    payroll: { thang: 9, nam: 2026, da_chi: false },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            Hộp Thư Trình Ký & Phê Duyệt (Unified Approval Hub)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tổng hợp tập trung các chứng từ từ tất cả các phòng ban đang chờ Ban Giám Đốc và Trưởng Phòng phê duyệt
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              disabled={batchRunning}
              onClick={() =>
                setConfirmState({
                  open: true,
                  mode: "batch_approve",
                  title: `${selectedItems.length} chứng từ đã chọn`,
                  reason: "",
                })
              }
            >
              <CheckSquare className="mr-1.5 h-4 w-4" />
              Duyệt hàng loạt ({selectedItems.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="rounded-lg shadow-xs"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Tổng chờ duyệt</span>
              <Layers className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {pending.totalPending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              chứng từ cần hành động
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Đơn mua vật tư</span>
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {pending.purchases.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Phòng Kho & Cung Ứng
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Kiểm kê kho</span>
              <Package className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {pending.stockAdjustments.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Phiếu điều chỉnh tồn
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Bảng lương tháng</span>
              <Calendar className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant={pending.payroll.da_chi ? "outline" : "default"}
                className={
                  pending.payroll.da_chi
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-amber-600 text-white"
                }
              >
                {pending.payroll.da_chi ? "Đã chi trả" : "Chờ duyệt chi"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tháng {pending.payroll.thang}/{pending.payroll.nam}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="all">Tất cả ({pending.totalPending})</TabsTrigger>
          <TabsTrigger value="purchases">Đơn Mua Vật Tư ({pending.purchases.length})</TabsTrigger>
          <TabsTrigger value="stock">Kiểm Kê Kho ({pending.stockAdjustments.length})</TabsTrigger>
          <TabsTrigger value="sales">Đơn Bán Hàng ({pending.sales.length})</TabsTrigger>
          <TabsTrigger value="rma">Đổi Trả RMA ({pending.returnOrders?.length || 0})</TabsTrigger>
          <TabsTrigger value="payroll">Lương Tháng</TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {pending.totalPending === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold text-foreground text-base">
                Tuyệt vời! Không có chứng từ nào chờ duyệt
              </div>
              <p className="text-xs mt-1">
                Mọi yêu cầu luân chuyển giữa các phòng ban đã được xử lý xong
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Purchase items */}
              {pending.purchases.map((p: any) => {
                const key = `purchase:${p._id}`;
                return (
                  <Card key={p._id} className="p-4 border-l-4 border-l-blue-500 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={!!selectedKeys[key]}
                          onCheckedChange={(checked) =>
                            toggleSelect(
                              { key, loai: "purchase", id: p._id, title: `Đơn mua ${p.ma_dh}` },
                              !!checked
                            )
                          }
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Đơn Mua Vật Tư
                            </Badge>
                            <span className="font-bold text-foreground">{p.ma_dh}</span>
                            <span className="text-xs text-muted-foreground">• {fmtDate(p.created_at)}</span>
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            Nhà cung cấp: <span className="text-primary">{p.nha_cung_cap_ten || "NCC"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Người lập: {p.nguoi_lap_ten || "Nhân viên"} • Số mặt hàng: {(p.san_pham || []).length} • Tổng tiền:{" "}
                            <strong className="text-foreground">{toVND(p.tong_tien)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setPreviewTarget({ loai: "purchase", title: `Đơn mua ${p.ma_dh}`, raw: p })
                          }
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Xem nhanh
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={mutation.isPending}
                          onClick={() => handleApprove("purchase", p._id, `Đơn mua ${p.ma_dh}`)}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          disabled={mutation.isPending}
                          onClick={() => handleReject("purchase", p._id, `Đơn mua ${p.ma_dh}`)}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Từ Chối
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Stock adjustment items */}
              {pending.stockAdjustments.map((a: any) => {
                const key = `stock_adjustment:${a._id}`;
                return (
                  <Card key={a._id} className="p-4 border-l-4 border-l-amber-500 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={!!selectedKeys[key]}
                          onCheckedChange={(checked) =>
                            toggleSelect(
                              {
                                key,
                                loai: "stock_adjustment",
                                id: a._id,
                                title: `Phiếu kho ${a.ten_hang}`,
                              },
                              !!checked
                            )
                          }
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Kiểm Kê Kho
                            </Badge>
                            <span className="font-bold text-foreground">{a.ma_phieu || a._id.slice(-6)}</span>
                            <span className="text-xs text-muted-foreground">• {fmtDate(a.created_at)}</span>
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            Hàng hóa: <span className="text-primary">{a.ten_hang || a.ma_hang}</span> (
                            {(a.loai ?? a.loai_hang) === "nguyen_lieu" ? "Nguyên liệu" : "Sản phẩm"})
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Chênh lệch:{" "}
                            <strong className="text-amber-600">
                              {(() => {
                                const delta = Number(a.so_luong_dieu_chinh ?? a.so_luong_lech ?? 0);
                                return delta > 0 ? `+${delta}` : delta;
                              })()}
                            </strong>{" "}
                            • Lý do: {a.ly_do || "Kiểm kê định kỳ"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setPreviewTarget({
                              loai: "stock_adjustment",
                              title: `Phiếu kiểm kê ${a.ma_phieu || a.ten_hang}`,
                              raw: a,
                            })
                          }
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Xem nhanh
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={mutation.isPending}
                          onClick={() => handleApprove("stock_adjustment", a._id, `Phiếu kho ${a.ten_hang}`)}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          disabled={mutation.isPending}
                          onClick={() => handleReject("stock_adjustment", a._id, `Phiếu kho ${a.ten_hang}`)}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Từ Chối
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Sales items */}
              {pending.sales.map((s: any) => {
                const key = `sale:${s._id}`;
                return (
                  <Card key={s._id} className="p-4 border-l-4 border-l-purple-500 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={!!selectedKeys[key]}
                          onCheckedChange={(checked) =>
                            toggleSelect(
                              { key, loai: "sale", id: s._id, title: `Đơn bán ${s.ma_dh}` },
                              !!checked
                            )
                          }
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              Đơn Bán Hàng
                            </Badge>
                            <span className="font-bold text-foreground">{s.ma_dh}</span>
                            <span className="text-xs text-muted-foreground">• {fmtDate(s.created_at)}</span>
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            Khách hàng:{" "}
                            <span className="text-primary">{s.khach_hang_ten || s.khach_hang?.ten || "Khách lẻ"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Tổng giá trị: <strong className="text-foreground">{toVND(s.tong_tien)}</strong> • Chiết khấu:{" "}
                            {toVND(s.giam_gia || 0)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setPreviewTarget({ loai: "sale", title: `Đơn bán ${s.ma_dh}`, raw: s })
                          }
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Xem nhanh
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={mutation.isPending}
                          onClick={() => handleApprove("sale", s._id, `Đơn bán ${s.ma_dh}`)}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Xác Nhận
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          disabled={mutation.isPending}
                          onClick={() => handleReject("sale", s._id, `Đơn bán ${s.ma_dh}`)}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          Hủy
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Payroll item */}
              {!pending.payroll.da_chi && (
                <Card className="p-4 border-l-4 border-l-emerald-500 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Nhân Sự & Tiền Lương
                        </Badge>
                        <span className="font-bold text-foreground">
                          Kỳ Lương Tháng {pending.payroll.thang}/{pending.payroll.nam}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-foreground">
                        Bảng lương toàn thể cán bộ nhân viên đã được tổng hợp xong và chờ duyệt chi
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Hệ thống sẽ tự động xuất Phiếu Chi trong Sổ Quỹ và cân đối dòng tiền
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={mutation.isPending}
                        onClick={() =>
                          handleApprove(
                            "payroll",
                            "current",
                            `Bảng lương Tháng ${pending.payroll.thang}/${pending.payroll.nam}`
                          )
                        }
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Duyệt Chi Trả Lương
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/payroll">
                          Chi Tiết
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PURCHASES */}
        <TabsContent value="purchases" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Đơn</TableHead>
                  <TableHead>Nhà Cung Cấp</TableHead>
                  <TableHead>Số Mặt Hàng</TableHead>
                  <TableHead className="text-right">Tổng Tiền</TableHead>
                  <TableHead>Ngày Lập</TableHead>
                  <TableHead className="text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không có đơn mua hàng nào đang chờ duyệt
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.purchases.map((p: any) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-bold">{p.ma_dh}</TableCell>
                      <TableCell>{p.nha_cung_cap_ten || "-"}</TableCell>
                      <TableCell>{(p.san_pham || []).length} mục</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{toVND(p.tong_tien)}</TableCell>
                      <TableCell>{fmtDate(p.created_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            setPreviewTarget({ loai: "purchase", title: `Đơn mua ${p.ma_dh}`, raw: p })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          onClick={() => handleApprove("purchase", p._id, `Đơn mua ${p.ma_dh}`)}
                        >
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 h-8"
                          onClick={() => handleReject("purchase", p._id, `Đơn mua ${p.ma_dh}`)}
                        >
                          Từ chối
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 3: STOCK */}
        <TabsContent value="stock" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Hàng</TableHead>
                  <TableHead>Tên Hàng Hóa</TableHead>
                  <TableHead>Loại Hàng</TableHead>
                  <TableHead className="text-right">Chênh Lệch</TableHead>
                  <TableHead>Lý Do</TableHead>
                  <TableHead className="text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.stockAdjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không có phiếu điều chỉnh kho nào đang chờ duyệt
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.stockAdjustments.map((a: any) => (
                    <TableRow key={a._id}>
                      <TableCell className="font-mono">{a.ma_hang}</TableCell>
                      <TableCell className="font-medium">{a.ten_hang}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(a.loai ?? a.loai_hang) === "nguyen_lieu" ? "Nguyên liệu" : "Sản phẩm"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-600">
                        {(() => {
                          const delta = Number(a.so_luong_dieu_chinh ?? a.so_luong_lech ?? 0);
                          return delta > 0 ? `+${delta}` : delta;
                        })()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.ly_do || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            setPreviewTarget({
                              loai: "stock_adjustment",
                              title: `Phiếu kiểm kê ${a.ma_phieu || a.ten_hang}`,
                              raw: a,
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          onClick={() => handleApprove("stock_adjustment", a._id, `Phiếu kho ${a.ten_hang}`)}
                        >
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 h-8"
                          onClick={() => handleReject("stock_adjustment", a._id, `Phiếu kho ${a.ten_hang}`)}
                        >
                          Từ chối
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 4: SALES */}
        <TabsContent value="sales" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Đơn</TableHead>
                  <TableHead>Khách Hàng</TableHead>
                  <TableHead className="text-right">Tổng Tiền</TableHead>
                  <TableHead className="text-right">Chiết Khấu</TableHead>
                  <TableHead>Ngày Đặt</TableHead>
                  <TableHead className="text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không có đơn bán hàng nào đang chờ duyệt
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.sales.map((s: any) => (
                    <TableRow key={s._id}>
                      <TableCell className="font-bold">{s.ma_dh}</TableCell>
                      <TableCell>{s.khach_hang_ten || s.khach_hang?.ten || "Khách lẻ"}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{toVND(s.tong_tien)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{toVND(s.giam_gia || 0)}</TableCell>
                      <TableCell>{fmtDate(s.created_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            setPreviewTarget({ loai: "sale", title: `Đơn bán ${s.ma_dh}`, raw: s })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          onClick={() => handleApprove("sale", s._id, `Đơn bán ${s.ma_dh}`)}
                        >
                          Xác nhận
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 h-8"
                          onClick={() => handleReject("sale", s._id, `Đơn bán ${s.ma_dh}`)}
                        >
                          Hủy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 5: RMA ĐỔI TRẢ HÀNG */}
        <TabsContent value="rma" className="mt-4">
          <Card className="shadow-xs overflow-hidden border-border/70">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[140px]">Mã RMA</TableHead>
                  <TableHead>Đơn Gốc</TableHead>
                  <TableHead>Khách Hàng</TableHead>
                  <TableHead>Lý Do Trả</TableHead>
                  <TableHead>Số Mặt Hàng</TableHead>
                  <TableHead className="text-right">Tiền Hoàn Dự Kiến</TableHead>
                  <TableHead className="text-right w-[220px]">Hành Động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!pending.returnOrders || pending.returnOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Không có phiếu đổi trả hàng nào đang chờ duyệt
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.returnOrders.map((r: any) => (
                    <TableRow key={r._id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-foreground">
                        {r.ma_rma}
                        <div className="text-[11px] text-muted-foreground font-sans">
                          {fmtDate(r.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <Link href={`/sales`} className="text-primary hover:underline">
                          {r.ma_dh}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.khach_hang?.ten || "Khách hàng"}</div>
                        <div className="text-xs text-muted-foreground">{r.khach_hang?.so_dien_thoai || ""}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {r.ly_do || "Không có lý do cụ thể"}
                      </TableCell>
                      <TableCell>{(r.san_pham || []).length} sản phẩm</TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        {toVND(r.tong_tien_hoan)}
                      </TableCell>
                      <TableCell className="text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            setPreviewTarget({
                              loai: "return_order",
                              title: `Phiếu RMA ${r.ma_rma}`,
                              raw: r,
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          onClick={() => handleApprove("return_order", r.ma_rma, `Phiếu đổi trả ${r.ma_rma}`)}
                        >
                          Duyệt QC
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 h-8"
                          onClick={() => handleReject("return_order", r.ma_rma, `Phiếu đổi trả ${r.ma_rma}`)}
                        >
                          Từ Chối
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 6: PAYROLL */}
        <TabsContent value="payroll" className="mt-4">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Kỳ Lương Tháng {pending.payroll.thang}/{pending.payroll.nam}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Trạng thái hiện tại:{" "}
                  <strong className={pending.payroll.da_chi ? "text-emerald-600" : "text-amber-600"}>
                    {pending.payroll.da_chi ? "ĐÃ CHI TRẢ LƯƠNG" : "CHƯA DUYỆT CHI TRẢ"}
                  </strong>
                </p>
                {pending.payroll?.ma_phieu && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Mã chứng từ chi tiền: <span className="font-mono font-medium">{pending.payroll.ma_phieu}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!pending.payroll.da_chi ? (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={mutation.isPending}
                    onClick={() =>
                      handleApprove(
                        "payroll",
                        "current",
                        `Bảng lương Tháng ${pending.payroll.thang}/${pending.payroll.nam}`
                      )
                    }
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Duyệt & Xuất Phiếu Chi Sổ Quỹ
                  </Button>
                ) : (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 py-2 px-4 text-sm">
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                    Đã hoàn tất chi trả
                  </Badge>
                )}

                <Button variant="outline" asChild>
                  <Link href="/payroll">
                    Xem Bảng Lương Chi Tiết
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm / Reject Dialog (replaces window.confirm / window.prompt) */}
      <Dialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmState.mode === "reject" ? (
                <XCircle className="h-5 w-5 text-rose-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
              {confirmState.mode === "reject"
                ? "Xác nhận Từ chối chứng từ"
                : confirmState.mode === "batch_approve"
                ? "Xác nhận Duyệt hàng loạt"
                : "Xác nhận Phê duyệt chứng từ"}
            </DialogTitle>
            <DialogDescription>
              {confirmState.mode === "reject"
                ? `Vui lòng nhập lý do từ chối cho: ${confirmState.title}`
                : `Bạn có chắc chắn muốn phê duyệt: ${confirmState.title}?`}
            </DialogDescription>
          </DialogHeader>

          {confirmState.mode === "reject" && (
            <div className="py-2">
              <Textarea
                value={confirmState.reason}
                onChange={(e) => setConfirmState((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Nhập lý do từ chối (vd: Sai số lượng kiểm kê, vượt định mức giá)..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmState((prev) => ({ ...prev, open: false }))}
            >
              Hủy bỏ
            </Button>
            <Button
              variant={confirmState.mode === "reject" ? "destructive" : "default"}
              className={confirmState.mode !== "reject" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              disabled={mutation.isPending || batchRunning}
              onClick={executeConfirmDialog}
            >
              {batchRunning
                ? "Đang xử lý..."
                : confirmState.mode === "reject"
                ? "Xác nhận Từ chối"
                : "Xác nhận Phê duyệt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick-Preview Slide-Over Sheet */}
      <Sheet open={!!previewTarget} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {previewTarget?.title}
            </SheetTitle>
            <SheetDescription>
              Xem nhanh chi tiết chứng từ trước khi phê duyệt
            </SheetDescription>
          </SheetHeader>

          {previewTarget && (
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs border">
                <div>
                  <span className="text-muted-foreground block">Ngày lập:</span>
                  <span className="font-medium">{fmtDate(previewTarget.raw.created_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Người lập:</span>
                  <span className="font-medium">
                    {previewTarget.raw.nguoi_lap_ten || previewTarget.raw.nguoi_tao_ten || "Nhân viên"}
                  </span>
                </div>
                {previewTarget.raw.tong_tien !== undefined && (
                  <div>
                    <span className="text-muted-foreground block">Tổng giá trị:</span>
                    <span className="font-bold text-primary">{toVND(previewTarget.raw.tong_tien)}</span>
                  </div>
                )}
                {(previewTarget.raw.so_luong_dieu_chinh !== undefined ||
                  previewTarget.raw.so_luong_lech !== undefined) && (
                  <div>
                    <span className="text-muted-foreground block">Chênh lệch tồn:</span>
                    <span className="font-bold text-amber-600">
                      {(() => {
                        const delta = Number(
                          previewTarget.raw.so_luong_dieu_chinh ?? previewTarget.raw.so_luong_lech ?? 0
                        );
                        return delta > 0 ? `+${delta}` : delta;
                      })()}
                    </span>
                  </div>
                )}
              </div>

              {(previewTarget.raw.ly_do || previewTarget.raw.ghi_chu) && (
                <div className="rounded-lg border p-3 text-xs">
                  <div className="font-semibold mb-1">Ghi chú / Lý do:</div>
                  <p className="text-muted-foreground">
                    {previewTarget.raw.ly_do || previewTarget.raw.ghi_chu}
                  </p>
                </div>
              )}

              {Array.isArray(previewTarget.raw.san_pham) && previewTarget.raw.san_pham.length > 0 && (
                <div>
                  <div className="font-semibold text-xs mb-2">
                    Chi tiết mặt hàng ({previewTarget.raw.san_pham.length})
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Hàng hóa</TableHead>
                          <TableHead className="text-xs text-right">SL</TableHead>
                          <TableHead className="text-xs text-right">Đơn giá</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewTarget.raw.san_pham.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">
                              <div className="font-medium">{item.ten_sp || item.ten_nl || item.ten_hang}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {item.ma_sp || item.ma_nl || item.ma_hang}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">{item.so_luong}</TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {toVND(item.don_gia || item.gia_nhap || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {previewTarget && (
            <SheetFooter className="gap-2">
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() =>
                  handleReject(
                    previewTarget.loai,
                    previewTarget.loai === "return_order" ? previewTarget.raw.ma_rma : previewTarget.raw._id,
                    previewTarget.title
                  )
                }
              >
                Từ chối
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() =>
                  handleApprove(
                    previewTarget.loai,
                    previewTarget.loai === "return_order" ? previewTarget.raw.ma_rma : previewTarget.raw._id,
                    previewTarget.title
                  )
                }
              >
                Phê duyệt ngay
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
