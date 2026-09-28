"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconRotateClockwise2,
  IconCheck,
  IconX,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconFileText,
  IconShieldCheck,
  IconAlertTriangle,
  IconArrowBackUp,
  IconBuildingWarehouse,
  IconCash,
  IconReceipt2,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  fetchRmaListAction,
  createRmaAction,
  processRmaQcAction,
  ReturnOrder,
  RmaItem,
} from "@/app/actions/rma";

const REFUND_LABELS: Record<string, string> = {
  debt_offset: "Cấn trừ công nợ",
  cash_refund: "Hoàn tiền mặt",
  bank_refund: "Chuyển khoản NH",
  store_credit: "Điểm thưởng / Credit",
};

const QC_LABELS: Record<string, { label: string; color: string }> = {
  nhap_lai_kho: { label: "Đạt chuẩn - Nhập kho", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  phe_pham: { label: "Phế phẩm - Tiêu hủy", color: "bg-rose-100 text-rose-800 border-rose-300" },
  can_sua_chua: { label: "Cần khắc phục / Sửa", color: "bg-amber-100 text-amber-800 border-amber-300" },
};

function toVND(amount: number) {
  return Number(amount || 0).toLocaleString("vi-VN") + " đ";
}

export default function ReturnsPage() {
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<ReturnOrder[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  // Dialog Tạo RMA
  const [openCreate, setOpenCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    ma_dh: "",
    ly_do: "",
    phuong_an_hoan_tien: "debt_offset",
    ghi_chu: "",
    products: [{ ma_sp: "", ten_sp: "", so_luong: 1, don_gia: 0 }],
  });

  // Dialog QC Gate
  const [openQc, setOpenQc] = React.useState(false);
  const [selectedRma, setSelectedRma] = React.useState<ReturnOrder | null>(null);
  const [qcDecisions, setQcDecisions] = React.useState<
    Record<string, "nhap_lai_kho" | "phe_pham" | "can_sua_chua">
  >({});
  const [qcNote, setQcNote] = React.useState("");

  // Dialog Xem Chi Tiết
  const [openDetail, setOpenDetail] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRmaListAction({
        trang_thai: statusFilter === "all" ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        toast.error(res.error || "Không thể tải danh sách RMA");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // KPI calculations
  const totalRma = items.length;
  const pendingCount = items.filter((i) => i.trang_thai === "pending" || i.trang_thai === "qc_processing").length;
  const completedCount = items.filter((i) => i.trang_thai === "completed").length;
  const totalRefundAmount = items.reduce((acc, i) => acc + (i.tong_tien_hoan || 0), 0);

  // Form helpers for adding/removing product rows in Create Modal
  const addProductRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      products: [...prev.products, { ma_sp: "", ten_sp: "", so_luong: 1, don_gia: 0 }],
    }));
  };

  const removeProductRow = (idx: number) => {
    setCreateForm((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== idx),
    }));
  };

  const handleProductChange = (idx: number, field: string, value: any) => {
    setCreateForm((prev) => {
      const copy = [...prev.products];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, products: copy };
    });
  };

  const handleCreateRma = async () => {
    if (!createForm.ma_dh.trim()) {
      toast.error("Vui lòng nhập mã đơn hàng gốc (ma_dh)");
      return;
    }
    if (!createForm.ly_do.trim()) {
      toast.error("Vui lòng nhập lý do đổi trả hàng");
      return;
    }
    const validProducts = createForm.products.filter(
      (p) => p.ma_sp.trim() && Number(p.so_luong) > 0
    );
    if (!validProducts.length) {
      toast.error("Vui lòng thêm ít nhất 1 mặt hàng cần đổi trả hợp lệ");
      return;
    }

    try {
      const res = await createRmaAction({
        ma_dh: createForm.ma_dh.trim(),
        ly_do: createForm.ly_do.trim(),
        phuong_an_hoan_tien: createForm.phuong_an_hoan_tien,
        ghi_chu: createForm.ghi_chu.trim(),
        san_pham: validProducts.map((p) => ({
          ma_sp: p.ma_sp.trim(),
          ten_sp: p.ten_sp.trim() || p.ma_sp.trim(),
          so_luong: Number(p.so_luong),
          don_gia: Number(p.don_gia || 0),
        })),
      });

      if (res.success) {
        toast.success(`Đã tạo phiếu RMA thành công!`);
        setOpenCreate(false);
        setCreateForm({
          ma_dh: "",
          ly_do: "",
          phuong_an_hoan_tien: "debt_offset",
          ghi_chu: "",
          products: [{ ma_sp: "", ten_sp: "", so_luong: 1, don_gia: 0 }],
        });
        loadData();
      } else {
        toast.error(res.error || "Tạo RMA thất bại");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tạo yêu cầu đổi trả");
    }
  };

  const handleOpenQcModal = (rma: ReturnOrder) => {
    setSelectedRma(rma);
    const initialMap: Record<string, "nhap_lai_kho" | "phe_pham" | "can_sua_chua"> = {};
    (rma.san_pham || []).forEach((p) => {
      initialMap[p.ma_sp] = p.qc_result || "nhap_lai_kho";
    });
    setQcDecisions(initialMap);
    setQcNote("");
    setOpenQc(true);
  };

  const handleSubmitQc = async () => {
    if (!selectedRma) return;
    try {
      const qc_details = (selectedRma.san_pham || []).map((p) => ({
        ma_sp: p.ma_sp,
        qc_result: qcDecisions[p.ma_sp] || ("nhap_lai_kho" as const),
      }));

      const res = await processRmaQcAction(selectedRma.ma_rma, {
        qc_details,
        ghi_chu_qc: qcNote.trim(),
      });

      if (res.success) {
        toast.success(`Đã hoàn tất kiểm định QC cho phiếu ${selectedRma.ma_rma}. Tồn kho và sổ quỹ đã được cập nhật khép kín!`);
        setOpenQc(false);
        loadData();
      } else {
        toast.error(res.error || "Kiểm định QC thất bại");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xử lý kiểm định QC");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <IconArrowBackUp className="w-7 h-7 text-indigo-600" />
            Trung Tâm Đổi & Trả Hàng (RMA & QC Gate)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quy trình khép kín: Tiếp nhận yêu cầu → Kiểm định chất lượng QC → Tự động hoàn kho & Cân đối sổ quỹ/công nợ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button
            size="sm"
            onClick={() => setOpenCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
          >
            <IconPlus className="w-4 h-4" />
            Tạo Phiếu Đổi/Trả Mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Yêu Cầu RMA
            </CardTitle>
            <div className="p-2 rounded-full bg-slate-100 text-slate-700">
              <IconFileText className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{totalRma}</div>
            <p className="text-xs text-muted-foreground mt-1">Toàn bộ hồ sơ đổi trả</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-amber-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Chờ Kiểm Định QC
            </CardTitle>
            <div className="p-2 rounded-full bg-amber-50 text-amber-600">
              <IconShieldCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Cần kho kiểm tra chất lượng</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-emerald-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đã Hoàn Tất Xử Lý
            </CardTitle>
            <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
              <IconBuildingWarehouse className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Đã nhập kho / Ghi sổ chi</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Giá Trị Hoàn Trả
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
              <IconCash className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{toVND(totalRefundAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Giá trị hoàn trả khách hàng</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:w-auto">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Tìm theo mã RMA, mã đơn hàng gốc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-50 text-xs w-full sm:max-w-xs"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 p-1 rounded-md text-xs">
                <TabsTrigger value="all">Tất cả ({totalRma})</TabsTrigger>
                <TabsTrigger value="pending">Chờ kiểm định ({pendingCount})</TabsTrigger>
                <TabsTrigger value="completed">Đã hoàn tất ({completedCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Mã RMA</TableHead>
                  <TableHead className="font-semibold text-xs">Đơn Hàng Gốc</TableHead>
                  <TableHead className="font-semibold text-xs">Khách Hàng</TableHead>
                  <TableHead className="font-semibold text-xs">Lý Do Đổi/Trả</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Số Mặt Hàng</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Tiền Hoàn Dự Kiến</TableHead>
                  <TableHead className="font-semibold text-xs">Phương Án Hoàn</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Trạng Thái</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Hành Động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400 text-sm">
                      Không tìm thấy phiếu đổi trả hàng nào phù hợp điều kiện.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => {
                    const isPending = r.trang_thai === "pending" || r.trang_thai === "qc_processing";
                    const isCompleted = r.trang_thai === "completed";
                    return (
                      <TableRow key={r._id} className="hover:bg-slate-50">
                        <TableCell className="font-bold font-mono text-xs text-slate-900">
                          {r.ma_rma}
                          <div className="text-[10px] text-muted-foreground font-sans">
                            {new Date(r.created_at).toLocaleDateString("vi-VN")}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                          {r.ma_dh}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold text-slate-800">{r.khach_hang?.ten || "Khách hàng"}</div>
                          <div className="text-[11px] text-slate-400">{r.khach_hang?.so_dien_thoai || ""}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">
                          {r.ly_do}
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold">
                          {(r.san_pham || []).length} SP
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-900">
                          {toVND(r.tong_tien_hoan)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {REFUND_LABELS[r.phuong_an_hoan_tien] || r.phuong_an_hoan_tien}
                        </TableCell>
                        <TableCell className="text-center">
                          {isPending && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                              Chờ Kiểm Định QC
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                              Đã Hoàn Tất
                            </Badge>
                          )}
                          {r.trang_thai === "rejected" && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300">
                              Từ Chối
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRma(r);
                              setOpenDetail(true);
                            }}
                            className="h-7 text-xs text-slate-600"
                          >
                            Xem chi tiết
                          </Button>
                          {isPending && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenQcModal(r)}
                              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                            >
                              Kiểm định QC
                            </Button>
                          )}
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

      {/* Dialog Tạo Yêu Cầu Đổi Trả RMA */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-indigo-100 text-indigo-700">
                <IconPlus className="w-5 h-5" />
              </div>
              Tạo Yêu Cầu Đổi & Trả Hàng (RMA)
            </DialogTitle>
            <DialogDescription>
              Tiếp nhận sản phẩm hoàn trả từ khách hàng. Sau khi tạo, phiếu sẽ được gửi đến Kho để thực hiện kiểm định QC.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mã đơn hàng gốc *</Label>
                <Input
                  placeholder="Ví dụ: DH-2026-..."
                  value={createForm.ma_dh}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, ma_dh: e.target.value }))}
                  className="font-mono text-sm bg-slate-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phương án hoàn tiền</Label>
                <Select
                  value={createForm.phuong_an_hoan_tien}
                  onValueChange={(val) => setCreateForm((prev) => ({ ...prev, phuong_an_hoan_tien: val }))}
                >
                  <SelectTrigger className="bg-slate-50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debt_offset">Cấn trừ công nợ khách hàng</SelectItem>
                    <SelectItem value="cash_refund">Hoàn tiền mặt (Tạo phiếu chi)</SelectItem>
                    <SelectItem value="bank_refund">Chuyển khoản (Tạo phiếu chi)</SelectItem>
                    <SelectItem value="store_credit">Điểm tích lũy / Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Lý do đổi trả *</Label>
              <Input
                placeholder="Ví dụ: Sản phẩm lỗi bề mặt, Khách yêu cầu đổi size..."
                value={createForm.ly_do}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, ly_do: e.target.value }))}
                className="bg-slate-50 text-xs"
              />
            </div>

            {/* Danh sách mặt hàng đổi trả */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">Danh sách sản phẩm đổi trả</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProductRow}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <IconPlus className="w-3.5 h-3.5" /> Thêm SP
                </Button>
              </div>

              <div className="space-y-2">
                {createForm.products.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border text-xs">
                    <div className="flex-1">
                      <Input
                        placeholder="Mã sản phẩm (ma_sp)..."
                        value={p.ma_sp}
                        onChange={(e) => handleProductChange(idx, "ma_sp", e.target.value)}
                        className="bg-white text-xs h-8"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Tên sản phẩm..."
                        value={p.ten_sp}
                        onChange={(e) => handleProductChange(idx, "ten_sp", e.target.value)}
                        className="bg-white text-xs h-8"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        placeholder="SL"
                        value={p.so_luong}
                        onChange={(e) => handleProductChange(idx, "so_luong", e.target.value)}
                        min="1"
                        className="bg-white text-xs h-8 text-center"
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        placeholder="Đơn giá"
                        value={p.don_gia}
                        onChange={(e) => handleProductChange(idx, "don_gia", e.target.value)}
                        min="0"
                        className="bg-white text-xs h-8 text-right"
                      />
                    </div>
                    {createForm.products.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProductRow(idx)}
                        className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50"
                      >
                        <IconX className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ghi chú bổ sung</Label>
              <Textarea
                placeholder="Ghi chú thêm về hiện trạng gói hàng khi nhận..."
                rows={2}
                value={createForm.ghi_chu}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, ghi_chu: e.target.value }))}
                className="bg-slate-50 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateRma} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              Tạo Yêu Cầu RMA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog QC Gate (Kiểm Định Chất Lượng & Nhập Kho) */}
      <Dialog open={openQc} onOpenChange={setOpenQc}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-700">
                <IconShieldCheck className="w-5 h-5" />
              </div>
              Kiểm Định Chất Lượng QC & Hoàn Tất Trả Hàng ({selectedRma?.ma_rma})
            </DialogTitle>
            <DialogDescription>
              Thẩm định từng sản phẩm nhận về. Sản phẩm đạt chuẩn sẽ được tự động cộng trả lại tồn kho. Hệ thống sẽ tự động hạch toán sổ quỹ nếu phương án là hoàn tiền.
            </DialogDescription>
          </DialogHeader>

          {selectedRma && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
                <div><strong>Đơn hàng gốc:</strong> {selectedRma.ma_dh}</div>
                <div><strong>Khách hàng:</strong> {selectedRma.khach_hang?.ten} ({selectedRma.khach_hang?.so_dien_thoai})</div>
                <div><strong>Lý do trả:</strong> {selectedRma.ly_do}</div>
                <div><strong>Phương án hoàn tiền:</strong> {REFUND_LABELS[selectedRma.phuong_an_hoan_tien]}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800">Quyết định kiểm định chất lượng (QC)</Label>
                <div className="border rounded-md divide-y">
                  {(selectedRma.san_pham || []).map((p) => (
                    <div key={p.ma_sp} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{p.ten_sp || p.ma_sp}</div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          Mã SP: {p.ma_sp} | SL: {p.so_luong} | Đơn giá: {toVND(p.don_gia)}
                        </div>
                      </div>
                      <div className="w-56">
                        <Select
                          value={qcDecisions[p.ma_sp] || "nhap_lai_kho"}
                          onValueChange={(val: any) =>
                            setQcDecisions((prev) => ({ ...prev, [p.ma_sp]: val }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nhap_lai_kho">Đạt chuẩn - Nhập kho (+tồn kho)</SelectItem>
                            <SelectItem value="phe_pham">Phế phẩm - Tiêu hủy (Không nhập)</SelectItem>
                            <SelectItem value="can_sua_chua">Cần sửa chữa / Tái chế</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Biên bản nghiệm thu QC</Label>
                <Textarea
                  placeholder="Ghi nhận tình trạng ngoại quan, bao bì, tem nhãn..."
                  rows={2}
                  value={qcNote}
                  onChange={(e) => setQcNote(e.target.value)}
                  className="bg-slate-50 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenQc(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitQc} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Xác Nhận & Hoàn Tất RMA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Chi Tiết RMA */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <IconFileText className="w-5 h-5 text-indigo-600" />
              Chi Tiết Phiếu Đổi/Trả {selectedRma?.ma_rma}
            </DialogTitle>
          </DialogHeader>

          {selectedRma && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border">
                <div><strong>Mã đơn gốc:</strong> {selectedRma.ma_dh}</div>
                <div><strong>Khách hàng:</strong> {selectedRma.khach_hang?.ten}</div>
                <div><strong>Ngày tạo:</strong> {new Date(selectedRma.created_at).toLocaleString("vi-VN")}</div>
                <div><strong>Phương án:</strong> {REFUND_LABELS[selectedRma.phuong_an_hoan_tien]}</div>
                <div><strong>Tổng tiền hoàn:</strong> {toVND(selectedRma.tong_tien_hoan)}</div>
                <div><strong>Mã phiếu chi:</strong> {selectedRma.ma_phieu_chi || "Không có (cấn trừ)"}</div>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-slate-800">Danh sách sản phẩm:</div>
                <div className="border rounded-md divide-y">
                  {(selectedRma.san_pham || []).map((p, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{p.ten_sp || p.ma_sp}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Mã: {p.ma_sp} | SL: {p.so_luong} | Đơn giá: {toVND(p.don_gia)}
                        </div>
                      </div>
                      <div>
                        {p.qc_result && QC_LABELS[p.qc_result] ? (
                          <Badge className={QC_LABELS[p.qc_result].color}>
                            {QC_LABELS[p.qc_result].label}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Chưa kiểm định</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRma.ghi_chu_qc && (
                <div className="bg-amber-50 p-2.5 rounded border border-amber-200 text-amber-900">
                  <strong>Ghi chú kiểm định QC:</strong> {selectedRma.ghi_chu_qc}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetail(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
