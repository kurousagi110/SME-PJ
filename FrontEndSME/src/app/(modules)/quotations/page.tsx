"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconFileInvoice,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconPrinter,
  IconCheck,
  IconX,
  IconSend,
  IconArrowsExchange,
  IconTrash,
  IconClock,
  IconBuildingStore,
  IconBuildingSkyscraper,
  IconUser,
  IconPhone,
  IconMail,
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
  fetchQuotationsAction,
  createQuotationAction,
  updateQuotationStatusAction,
  convertQuotationToOrderAction,
  deleteQuotationAction,
  Quotation,
} from "@/app/actions/quotation";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Bản thảo", color: "bg-slate-100 text-slate-800 border-slate-300" },
  sent: { label: "Đã gửi khách", color: "bg-blue-100 text-blue-800 border-blue-300" },
  accepted: { label: "Khách đồng ý", color: "bg-amber-100 text-amber-800 border-amber-300" },
  rejected: { label: "Từ chối", color: "bg-rose-100 text-rose-800 border-rose-300" },
  converted: { label: "Đã chuyển Đơn Hàng", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

function toVND(amount: number) {
  return Number(amount || 0).toLocaleString("vi-VN") + " đ";
}

export default function QuotationsPage() {
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Quotation[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  // Dialog Tạo Báo Giá
  const [openCreate, setOpenCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    ten: "",
    so_dien_thoai: "",
    email: "",
    cong_ty: "",
    dia_chi: "",
    ngay_het_han: "",
    thue_vat: 0,
    dieu_khoan: "Thanh toán 50% khi đặt hàng, 50% trước khi giao hàng. Giao hàng trong vòng 3-5 ngày làm việc.",
    ghi_chu: "",
    products: [{ ma_sp: "", ten_sp: "", don_vi: "Cái", so_luong: 1, don_gia: 0, chiet_khau_phan_tram: 0 }],
  });

  // Modal Chi Tiết / In Báo Giá
  const [selectedQuote, setSelectedQuote] = React.useState<Quotation | null>(null);
  const [openDetail, setOpenDetail] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchQuotationsAction({
        trang_thai: statusFilter === "all" ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        toast.error(res.error || "Không thể tải danh sách báo giá");
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

  // KPI Calculations
  const totalCount = items.length;
  const draftOrSentCount = items.filter((i) => i.trang_thai === "draft" || i.trang_thai === "sent").length;
  const convertedCount = items.filter((i) => i.trang_thai === "converted").length;
  const totalQuoteValue = items.reduce((acc, i) => acc + (i.tong_thanh_toan || 0), 0);

  // Form row helpers
  const addProductRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      products: [...prev.products, { ma_sp: "", ten_sp: "", don_vi: "Cái", so_luong: 1, don_gia: 0, chiet_khau_phan_tram: 0 }],
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

  const handleCreateQuotation = async () => {
    if (!createForm.ten.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    const validProducts = createForm.products.filter(
      (p) => p.ma_sp.trim() && Number(p.so_luong) > 0
    );
    if (!validProducts.length) {
      toast.error("Vui lòng thêm ít nhất 1 mặt hàng hợp lệ trong báo giá");
      return;
    }

    try {
      const res = await createQuotationAction({
        khach_hang: {
          ten: createForm.ten.trim(),
          so_dien_thoai: createForm.so_dien_thoai.trim(),
          email: createForm.email.trim(),
          cong_ty: createForm.cong_ty.trim(),
          dia_chi: createForm.dia_chi.trim(),
        },
        ngay_het_han: createForm.ngay_het_han || undefined,
        thue_vat: Number(createForm.thue_vat) || 0,
        dieu_khoan: createForm.dieu_khoan.trim(),
        ghi_chu: createForm.ghi_chu.trim(),
        items: validProducts.map((p) => ({
          ma_sp: p.ma_sp.trim(),
          ten_sp: p.ten_sp.trim() || p.ma_sp.trim(),
          don_vi: p.don_vi || "Cái",
          so_luong: Number(p.so_luong),
          don_gia: Number(p.don_gia || 0),
          chiet_khau_phan_tram: Number(p.chiet_khau_phan_tram || 0),
        })),
      });

      if (res.success) {
        toast.success(`Đã tạo báo giá ${res.data?.ma_bao_gia} thành công!`);
        setOpenCreate(false);
        setCreateForm({
          ten: "",
          so_dien_thoai: "",
          email: "",
          cong_ty: "",
          dia_chi: "",
          ngay_het_han: "",
          thue_vat: 0,
          dieu_khoan: "Thanh toán 50% khi đặt hàng, 50% trước khi giao hàng. Giao hàng trong vòng 3-5 ngày làm việc.",
          ghi_chu: "",
          products: [{ ma_sp: "", ten_sp: "", don_vi: "Cái", so_luong: 1, don_gia: 0, chiet_khau_phan_tram: 0 }],
        });
        loadData();
      } else {
        toast.error(res.error || "Tạo báo giá thất bại");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tạo báo giá");
    }
  };

  const handleUpdateStatus = async (ma_bao_gia: string, status: string) => {
    try {
      const res = await updateQuotationStatusAction(ma_bao_gia, status);
      if (res.success) {
        toast.success(`Cập nhật trạng thái thành công`);
        loadData();
      } else {
        toast.error(res.error || "Cập nhật thất bại");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi cập nhật");
    }
  };

  const handleConvertToOrder = async (quote: Quotation) => {
    if (!window.confirm(`Xác nhận CHUYỂN BÁO GIÁ ${quote.ma_bao_gia} THÀNH ĐƠN BÁN HÀNG CHÍNH THỨC?`)) {
      return;
    }
    try {
      const res = await convertQuotationToOrderAction(quote.ma_bao_gia);
      if (res.success) {
        toast.success(`Đã chuyển đổi thành Đơn Hàng ${res.data?.ma_dh} thành công!`);
        loadData();
      } else {
        toast.error(res.error || "Chuyển đổi thất bại");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi chuyển đổi thành đơn hàng");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1450px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <IconFileInvoice className="w-7 h-7 text-indigo-600" />
            Quản Lý Báo Giá B2B (Sales Quotations & Quote-to-Order)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quy trình đàm phán thương mại chuyên nghiệp: Lập báo giá → In PDF gửi khách → 1-click Chuyển thành Đơn Bán Hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button
            size="sm"
            onClick={() => setOpenCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 text-xs"
          >
            <IconPlus className="w-4 h-4" />
            Lập Báo Giá Mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Số Báo Giá
            </CardTitle>
            <div className="p-2 rounded-full bg-slate-100 text-slate-700">
              <IconFileInvoice className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Báo giá đã phát hành</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đang Đàm Phán
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
              <IconClock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{draftOrSentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Bản thảo hoặc chờ phản hồi</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-emerald-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đã Chốt & Thành Đơn
            </CardTitle>
            <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
              <IconCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{convertedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Chuyển thành Đơn Bán Hàng</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Giá Trị Báo Giá
            </CardTitle>
            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
              <IconBuildingStore className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{toVND(totalQuoteValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Quy mô cơ hội bán hàng</p>
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
                placeholder="Tìm theo mã báo giá, tên khách, số điện thoại..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-50 text-xs w-full sm:max-w-xs"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 p-1 rounded-md text-xs">
                <TabsTrigger value="all">Tất cả ({totalCount})</TabsTrigger>
                <TabsTrigger value="draft">Bản thảo</TabsTrigger>
                <TabsTrigger value="sent">Đã gửi</TabsTrigger>
                <TabsTrigger value="converted">Đã thành đơn ({convertedCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Mã Báo Giá</TableHead>
                  <TableHead className="font-semibold text-xs">Khách Hàng / Đơn Vị</TableHead>
                  <TableHead className="font-semibold text-xs">Ngày Tạo</TableHead>
                  <TableHead className="font-semibold text-xs">Hiệu Lực Đến</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Số Mặt Hàng</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Tổng Tiền Báo Giá</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Trạng Thái</TableHead>
                  <TableHead className="font-semibold text-xs">Đơn Hàng Gốc</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400 text-sm">
                      Không tìm thấy báo giá nào phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((q) => {
                    const isConverted = q.trang_thai === "converted";
                    return (
                      <TableRow key={q._id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs font-bold text-indigo-600">
                          {q.ma_bao_gia}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold text-slate-900">{q.khach_hang?.ten}</div>
                          {q.khach_hang?.cong_ty && (
                            <div className="text-[11px] text-slate-500">{q.khach_hang.cong_ty}</div>
                          )}
                          <div className="text-[10px] text-slate-400">{q.khach_hang?.so_dien_thoai}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {new Date(q.ngay_bao_gia).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {new Date(q.ngay_het_han).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold">
                          {(q.items || []).length} SP
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-900">
                          {toVND(q.tong_thanh_toan)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={STATUS_CONFIG[q.trang_thai]?.color || ""}>
                            {STATUS_CONFIG[q.trang_thai]?.label || q.trang_thai}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {q.ma_don_hang ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {q.ma_don_hang}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedQuote(q);
                              setOpenDetail(true);
                            }}
                            className="h-7 text-xs text-slate-600 font-semibold"
                          >
                            Xem & In
                          </Button>
                          {!isConverted && (
                            <Button
                              size="sm"
                              onClick={() => handleConvertToOrder(q)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              Chuyển Thành Đơn
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

      {/* Dialog Tạo Báo Giá Mới */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <IconPlus className="w-5 h-5 text-indigo-600" />
              Lập Báo Giá Thương Mại B2B Mới
            </DialogTitle>
            <DialogDescription>
              Soạn thảo báo giá gửi khách hàng. Báo giá không làm trừ kho và có thể chuyển thành đơn bán bất cứ khi nào khách chốt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Khách hàng */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tên người liên hệ / Khách hàng *</Label>
                <Input
                  placeholder="Họ tên người nhận báo giá..."
                  value={createForm.ten}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, ten: e.target.value }))}
                  className="bg-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Công ty / Doanh nghiệp</Label>
                <Input
                  placeholder="Tên công ty đối tác..."
                  value={createForm.cong_ty}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, cong_ty: e.target.value }))}
                  className="bg-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Số điện thoại</Label>
                <Input
                  placeholder="09..."
                  value={createForm.so_dien_thoai}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, so_dien_thoai: e.target.value }))}
                  className="bg-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email nhận báo giá</Label>
                <Input
                  placeholder="email@company.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-white text-xs"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Địa chỉ giao hàng / Trụ sở</Label>
                <Input
                  placeholder="Địa chỉ giao hàng..."
                  value={createForm.dia_chi}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, dia_chi: e.target.value }))}
                  className="bg-white text-xs"
                />
              </div>
            </div>

            {/* Danh sách mặt hàng */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">Danh sách sản phẩm báo giá</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProductRow}
                  className="h-7 text-xs flex items-center gap-1 font-semibold"
                >
                  <IconPlus className="w-3.5 h-3.5" /> Thêm Dòng SP
                </Button>
              </div>

              <div className="space-y-2">
                {createForm.products.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border text-xs">
                    <div className="w-32">
                      <Input
                        placeholder="Mã SP"
                        value={p.ma_sp}
                        onChange={(e) => handleProductChange(idx, "ma_sp", e.target.value)}
                        className="bg-white text-xs h-8 font-mono"
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
                    <div className="w-16">
                      <Input
                        placeholder="ĐVT"
                        value={p.don_vi}
                        onChange={(e) => handleProductChange(idx, "don_vi", e.target.value)}
                        className="bg-white text-xs h-8 text-center"
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
                    <div className="w-20">
                      <Input
                        type="number"
                        placeholder="CK %"
                        value={p.chiet_khau_phan_tram}
                        onChange={(e) => handleProductChange(idx, "chiet_khau_phan_tram", e.target.value)}
                        min="0"
                        max="100"
                        className="bg-white text-xs h-8 text-center"
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

            {/* Thuế & Điều khoản */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Thuế GTGT / VAT (%)</Label>
                <Select
                  value={String(createForm.thue_vat)}
                  onValueChange={(val) => setCreateForm((prev) => ({ ...prev, thue_vat: Number(val) }))}
                >
                  <SelectTrigger className="bg-slate-50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Không chịu thuế)</SelectItem>
                    <SelectItem value="8">8% (Thuế suất ưu đãi)</SelectItem>
                    <SelectItem value="10">10% (Thuế suất chuẩn)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Hạn hiệu lực báo giá</Label>
                <Input
                  type="date"
                  value={createForm.ngay_het_han}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, ngay_het_han: e.target.value }))}
                  className="bg-slate-50 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Điều khoản thanh toán & giao hàng</Label>
              <Textarea
                placeholder="Điều kiện thanh toán..."
                rows={2}
                value={createForm.dieu_khoan}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, dieu_khoan: e.target.value }))}
                className="bg-slate-50 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateQuotation} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              Hoàn Tất & Tạo Báo Giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Xem & In Báo Giá (Printable Template) */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto print:max-w-full print:p-0">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <IconFileInvoice className="w-5 h-5 text-indigo-600" />
              Bảng Báo Giá Thương Mại: {selectedQuote?.ma_bao_gia}
            </DialogTitle>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-5 p-4 border rounded-lg bg-white print:border-none print:p-2 text-xs">
              {/* Header phiếu in */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <div className="text-xl font-bold text-slate-900 uppercase">CÔNG TY CỔ PHẦN CÔNG NGHỆ SME</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Địa chỉ: KCN Công Nghệ Cao, Hà Nội, Việt Nam</div>
                  <div className="text-slate-500 text-[11px]">Hotline: 1900 6868 | Email: sales@sme-erp.vn</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-indigo-700 font-mono">BẢNG BÁO GIÁ</div>
                  <div className="text-slate-600 font-mono font-bold mt-1">Số: {selectedQuote.ma_bao_gia}</div>
                  <div className="text-slate-500 text-[11px]">
                    Ngày: {new Date(selectedQuote.ngay_bao_gia).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>

              {/* Thông tin khách hàng */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border text-xs">
                <div>
                  <span className="font-bold text-slate-700">KÍNH GỬI QUÝ KHÁCH HÀNG:</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedQuote.khach_hang?.ten}</div>
                  {selectedQuote.khach_hang?.cong_ty && (
                    <div className="text-slate-700">Đơn vị: {selectedQuote.khach_hang.cong_ty}</div>
                  )}
                  {selectedQuote.khach_hang?.dia_chi && (
                    <div className="text-slate-600">Địa chỉ: {selectedQuote.khach_hang.dia_chi}</div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div><strong>Số điện thoại:</strong> {selectedQuote.khach_hang?.so_dien_thoai || "-"}</div>
                  <div><strong>Email:</strong> {selectedQuote.khach_hang?.email || "-"}</div>
                  <div><strong>Thời hạn hiệu lực:</strong> {new Date(selectedQuote.ngay_het_han).toLocaleDateString("vi-VN")}</div>
                </div>
              </div>

              {/* Bảng sản phẩm */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs">STT</TableHead>
                      <TableHead className="text-xs">Mã SP</TableHead>
                      <TableHead className="text-xs">Tên Hàng Hóa / Dịch Vụ</TableHead>
                      <TableHead className="text-center text-xs">ĐVT</TableHead>
                      <TableHead className="text-center text-xs">Số Lượng</TableHead>
                      <TableHead className="text-right text-xs">Đơn Giá</TableHead>
                      <TableHead className="text-center text-xs">CK (%)</TableHead>
                      <TableHead className="text-right text-xs">Thành Tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedQuote.items || []).map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{it.ma_sp}</TableCell>
                        <TableCell className="text-xs font-semibold">{it.ten_sp}</TableCell>
                        <TableCell className="text-center text-xs">{it.don_vi}</TableCell>
                        <TableCell className="text-center text-xs font-bold">{it.so_luong}</TableCell>
                        <TableCell className="text-right text-xs">{toVND(it.don_gia)}</TableCell>
                        <TableCell className="text-center text-xs">{it.chiet_khau_phan_tram ? `${it.chiet_khau_phan_tram}%` : "-"}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-900">{toVND(it.thanh_tien)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Tổng tiền */}
              <div className="flex justify-end">
                <div className="w-72 space-y-1.5 text-xs bg-slate-50 p-3 rounded border">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tổng tiền hàng:</span>
                    <span className="font-semibold">{toVND(selectedQuote.tong_tien_truoc_ck)}</span>
                  </div>
                  {selectedQuote.tong_chiet_khau > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Chiết khấu:</span>
                      <span>-{toVND(selectedQuote.tong_chiet_khau)}</span>
                    </div>
                  )}
                  {selectedQuote.thue_vat > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Thuế GTGT ({selectedQuote.thue_vat}%):</span>
                      <span>+{toVND(selectedQuote.tien_thue_vat)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t pt-1.5 text-indigo-700">
                    <span>TỔNG CỘNG:</span>
                    <span>{toVND(selectedQuote.tong_thanh_toan)}</span>
                  </div>
                </div>
              </div>

              {/* Điều khoản */}
              {selectedQuote.dieu_khoan && (
                <div className="border-t pt-3 space-y-1">
                  <div className="font-bold text-slate-800">ĐIỀU KHOẢN THƯƠNG MẠI:</div>
                  <div className="text-slate-600 italic">{selectedQuote.dieu_khoan}</div>
                </div>
              )}

              {/* Chữ ký */}
              <div className="grid grid-cols-2 gap-8 text-center pt-6 pb-4">
                <div>
                  <div className="font-bold text-slate-800 uppercase">ĐẠI DIỆN KHÁCH HÀNG</div>
                  <div className="text-[11px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                </div>
                <div>
                  <div className="font-bold text-slate-800 uppercase">ĐẠI DIỆN DOANH NGHIỆP</div>
                  <div className="text-[11px] text-slate-400 italic">(Ký, đóng dấu)</div>
                  <div className="h-16"></div>
                  <div className="font-semibold text-slate-800">{selectedQuote.created_by?.ho_ten || "Nhân viên kinh doanh"}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setOpenDetail(false)}>
              Đóng
            </Button>
            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5">
              <IconPrinter className="w-4 h-4" /> In Báo Giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
