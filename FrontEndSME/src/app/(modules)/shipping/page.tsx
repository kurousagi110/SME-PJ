"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconTruck,
  IconPackage,
  IconClock,
  IconCheck,
  IconRotateClockwise,
  IconPrinter,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconCurrencyDong,
  IconRoute,
  IconArrowRight,
  IconMapPin,
  IconPhone,
  IconUser,
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
  createShipmentAction,
  fetchShipmentsAction,
  fetchShippingOverviewAction,
  ShipmentItem,
  ShippingOverview,
  updateShipmentStatusAction,
} from "@/app/actions/shipping";
import { printWaybill } from "@/lib/export";

const fmtVND = (n: number) =>
  (Number.isFinite(n) ? Number(n) : 0).toLocaleString("vi-VN") + " đ";

export default function ShippingPage() {
  const [overview, setOverview] = React.useState<ShippingOverview | null>(null);
  const [shipments, setShipments] = React.useState<ShipmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [activeTab, setActiveTab] = React.useState("all");
  const [carrierFilter, setCarrierFilter] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  // Create Modal
  const [openCreate, setOpenCreate] = React.useState(false);
  const [formOrderCode, setFormOrderCode] = React.useState("");
  const [formCarrier, setFormCarrier] = React.useState("GHN");
  const [formReceiverName, setFormReceiverName] = React.useState("");
  const [formReceiverPhone, setFormReceiverPhone] = React.useState("");
  const [formReceiverAddress, setFormReceiverAddress] = React.useState("");
  const [formCod, setFormCod] = React.useState("0");
  const [formShippingFee, setFormShippingFee] = React.useState("35000");
  const [formFeePayer, setFormFeePayer] = React.useState<"shop" | "khach">("khach");
  const [formWeight, setFormWeight] = React.useState("1500");
  const [formNote, setFormNote] = React.useState("Cho xem hàng, không thử");
  const [submitting, setSubmitting] = React.useState(false);

  // Status Modal
  const [statusItem, setStatusItem] = React.useState<ShipmentItem | null>(null);
  const [newStatus, setNewStatus] = React.useState("");
  const [statusNote, setStatusNote] = React.useState("");
  const [statusLocation, setStatusLocation] = React.useState("");

  // History Timeline Modal
  const [timelineItem, setTimelineItem] = React.useState<ShipmentItem | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ov, list] = await Promise.all([
        fetchShippingOverviewAction(),
        fetchShipmentsAction({
          trang_thai: activeTab,
          don_vi: carrierFilter,
          search: searchTerm,
        }),
      ]);
      setOverview(ov);
      if (list?.data) setShipments(list.data);
    } catch (err) {
      toast.error("Không thể tải dữ liệu vận chuyển");
    } finally {
      setLoading(false);
    }
  }, [activeTab, carrierFilter, searchTerm]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOrderCode.trim()) {
      toast.error("Vui lòng nhập mã đơn hàng");
      return;
    }
    if (!formReceiverName.trim() || !formReceiverPhone.trim()) {
      toast.error("Vui lòng nhập tên và số điện thoại người nhận");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createShipmentAction({
        ma_don_hang: formOrderCode.trim(),
        don_vi_van_chuyen: formCarrier,
        nguoi_nhan: {
          ten: formReceiverName.trim(),
          sdt: formReceiverPhone.trim(),
          dia_chi: formReceiverAddress.trim(),
        },
        tien_thu_ho_cod: Number(formCod) || 0,
        phi_van_chuyen: Number(formShippingFee) || 0,
        nguoi_tra_phi: formFeePayer,
        trong_luong_gram: Number(formWeight) || 1000,
        ghi_chu: formNote.trim(),
      });

      if (res.success) {
        toast.success(`Đã tạo vận đơn ${res.data?.ma_van_don || ""} thành công!`);
        setOpenCreate(false);
        setFormOrderCode("");
        setFormReceiverName("");
        setFormReceiverPhone("");
        setFormReceiverAddress("");
        setFormCod("0");
        loadData();
      } else {
        toast.error(res.message || "Tạo vận đơn thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi hệ thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusItem || !newStatus) return;
    try {
      const res = await updateShipmentStatusAction(statusItem.ma_van_don, {
        trang_thai: newStatus,
        ghi_chu: statusNote,
        vi_tri: statusLocation,
      });
      if (res.success) {
        toast.success(`Đã cập nhật trạng thái vận đơn ${statusItem.ma_van_don}`);
        setStatusItem(null);
        loadData();
      } else {
        toast.error(res.message || "Cập nhật trạng thái thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi hệ thống");
    }
  };

  const getCarrierBadge = (dv: string) => {
    if (dv === "GHN") return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/15 text-orange-600 border border-orange-200">GHN</span>;
    if (dv === "GHTK") return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-200">GHTK</span>;
    if (dv === "ViettelPost") return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-200">Viettel Post</span>;
    if (dv === "J&T Express") return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/15 text-red-600 border border-red-200">J&T</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-500/15 text-slate-600 border border-slate-200">Nội Bộ</span>;
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "cho_dong_goi":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 gap-1"><IconClock className="h-3.5 w-3.5" /> Chờ đóng gói</Badge>;
      case "da_ban_giao":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-300 gap-1"><IconPackage className="h-3.5 w-3.5" /> Đã bàn giao ĐVVC</Badge>;
      case "dang_giao":
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-300 gap-1 animate-pulse"><IconTruck className="h-3.5 w-3.5" /> Đang giao hàng</Badge>;
      case "giao_thanh_cong":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 gap-1"><IconCheck className="h-3.5 w-3.5" /> Giao thành công</Badge>;
      case "chuyen_hoan":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-300 gap-1"><IconRotateClockwise className="h-3.5 w-3.5" /> Chuyển hoàn</Badge>;
      default:
        return <Badge variant="secondary">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconTruck className="h-7 w-7 text-primary" />
            Vận Chuyển & Giao Hàng (Logistics)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi hành trình kiện hàng, liên kết đối tác GHN / GHTK / Viettel Post và in tem vận đơn A6.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
            <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button size="sm" onClick={() => setOpenCreate(true)} className="gap-1.5 shadow-sm">
            <IconPlus className="h-4 w-4" />
            Tạo Vận Đơn Mới
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              Đang Giao Hàng
              <IconTruck className="h-4 w-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {overview?.dang_giao || 0} <span className="text-xs font-normal text-muted-foreground">kiện</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
              Chờ bàn giao shipper: <strong>{overview?.cho_dong_goi || 0}</strong> kiện
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              Đã Giao Thành Công
              <IconCheck className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {overview?.giao_thanh_cong || 0} <span className="text-xs font-normal text-muted-foreground">kiện</span>
            </div>
            <p className="text-2xs text-emerald-600 font-medium mt-1">
              Tỷ lệ giao thành công: <strong>{overview?.ty_le_thanh_cong || 100}%</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              Tiền Thu Hộ COD Chờ Thu
              <IconCurrencyDong className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {fmtVND(overview?.tong_tien_cod || 0)}
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
              Đã thu về ví: <strong>{fmtVND(overview?.cod_da_thu || 0)}</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="border-rose-100 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              Chuyển Hoàn / Thất Bại
              <IconRotateClockwise className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {overview?.chuyen_hoan || 0} <span className="text-xs font-normal text-muted-foreground">kiện</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
              Tổng số vận đơn: <strong>{overview?.tong_so || 0}</strong> kiện
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Bộ lọc & Tabs */}
      <Card>
        <CardHeader className="p-4 pb-3 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/60">
                <TabsTrigger value="all" className="text-xs">Tất cả ({overview?.tong_so || 0})</TabsTrigger>
                <TabsTrigger value="cho_dong_goi" className="text-xs">Chờ gói ({overview?.cho_dong_goi || 0})</TabsTrigger>
                <TabsTrigger value="da_ban_giao" className="text-xs">Đã giao ĐVVC ({overview?.da_ban_giao || 0})</TabsTrigger>
                <TabsTrigger value="dang_giao" className="text-xs">Đang giao ({overview?.dang_giao || 0})</TabsTrigger>
                <TabsTrigger value="giao_thanh_cong" className="text-xs text-emerald-600">Thành công ({overview?.giao_thanh_cong || 0})</TabsTrigger>
                <TabsTrigger value="chuyen_hoan" className="text-xs text-rose-600">Hoàn ({overview?.chuyen_hoan || 0})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Đơn vị VC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ĐVVC</SelectItem>
                  <SelectItem value="GHN">Giao Hàng Nhanh</SelectItem>
                  <SelectItem value="GHTK">GHTK</SelectItem>
                  <SelectItem value="ViettelPost">Viettel Post</SelectItem>
                  <SelectItem value="J&T Express">J&T Express</SelectItem>
                  <SelectItem value="Đội xe nội bộ">Đội xe nội bộ</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-[260px]">
                <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mã vận đơn, đơn hàng, SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[140px]">Mã Vận Đơn</TableHead>
                  <TableHead className="w-[120px]">Đơn Hàng</TableHead>
                  <TableHead className="min-w-[200px]">Người Nhận & Địa Chỉ</TableHead>
                  <TableHead className="text-right">Tiền Thu Hộ (COD)</TableHead>
                  <TableHead className="text-right">Cước Phí</TableHead>
                  <TableHead className="w-[140px] text-center">Trạng Thái</TableHead>
                  <TableHead className="w-[170px] text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Đang tải danh sách vận đơn...
                    </TableCell>
                  </TableRow>
                ) : shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Không tìm thấy vận đơn nào phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((s) => (
                    <TableRow key={s._id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {getCarrierBadge(s.don_vi_van_chuyen)}
                          <span className="font-mono text-xs">{s.ma_van_don}</span>
                        </div>
                        <div className="text-3xs text-muted-foreground mt-0.5">
                          {new Date(s.ngay_tao).toLocaleDateString("vi-VN")}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-xs text-primary font-semibold">
                          {s.ma_don_hang}
                        </span>
                        <div className="text-3xs text-muted-foreground">
                          {((s.trong_luong_gram || 1000) / 1000).toFixed(1)} kg
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-xs flex items-center gap-1">
                          <IconUser className="h-3.5 w-3.5 text-muted-foreground" />
                          {s.nguoi_nhan?.ten || "Khách Hàng"}
                        </div>
                        <div className="text-2xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <IconPhone className="h-3 w-3" />
                          {s.nguoi_nhan?.sdt || "Chưa có SĐT"}
                        </div>
                        <div className="text-3xs text-muted-foreground flex items-center gap-1 truncate max-w-[280px]">
                          <IconMapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.nguoi_nhan?.dia_chi || "Chưa có địa chỉ"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
                          {fmtVND(s.tien_thu_ho_cod)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="text-xs font-medium">{fmtVND(s.phi_van_chuyen)}</div>
                        <span className="text-3xs text-muted-foreground">
                          {s.nguoi_tra_phi === "shop" ? "Shop trả" : "Khách trả"}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        {getStatusBadge(s.trang_thai)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Nút In Tem Waybill */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            title="In Phiếu Vận Đơn (Waybill)"
                            onClick={() => printWaybill(s)}
                          >
                            <IconPrinter className="h-4 w-4" />
                          </Button>

                          {/* Nút Cập Nhật Trạng Thái */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                            title="Cập nhật tiến trình giao hàng"
                            onClick={() => {
                              setStatusItem(s);
                              setNewStatus(
                                s.trang_thai === "cho_dong_goi"
                                  ? "da_ban_giao"
                                  : s.trang_thai === "da_ban_giao"
                                  ? "dang_giao"
                                  : s.trang_thai === "dang_giao"
                                  ? "giao_thanh_cong"
                                  : s.trang_thai
                              );
                              setStatusNote("");
                              setStatusLocation("");
                            }}
                          >
                            <IconArrowRight className="h-4 w-4" />
                          </Button>

                          {/* Nút Xem Lịch Trình */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Xem lịch sử hành trình"
                            onClick={() => setTimelineItem(s)}
                          >
                            <IconRoute className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: TẠO VẬN ĐƠN MỚI */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleCreateShipment}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconTruck className="h-5 w-5 text-primary" />
                Tạo Phiếu Vận Đơn Mới
              </DialogTitle>
              <DialogDescription>
                Tạo mã vận đơn và sẵn sàng in tem giao cho đơn vị vận chuyển.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="orderCode">Mã đơn hàng liên kết *</Label>
                  <Input
                    id="orderCode"
                    placeholder="VD: DH-202609-001"
                    value={formOrderCode}
                    onChange={(e) => setFormOrderCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="carrier">Đơn vị vận chuyển *</Label>
                  <Select value={formCarrier} onValueChange={setFormCarrier}>
                    <SelectTrigger id="carrier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GHN">Giao Hàng Nhanh (GHN)</SelectItem>
                      <SelectItem value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</SelectItem>
                      <SelectItem value="ViettelPost">Viettel Post</SelectItem>
                      <SelectItem value="J&T Express">J&T Express</SelectItem>
                      <SelectItem value="Đội xe nội bộ">Đội xe nội bộ công ty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="recName">Tên người nhận *</Label>
                  <Input
                    id="recName"
                    placeholder="Nguyễn Văn A"
                    value={formReceiverName}
                    onChange={(e) => setFormReceiverName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recPhone">Số điện thoại *</Label>
                  <Input
                    id="recPhone"
                    placeholder="0912345678"
                    value={formReceiverPhone}
                    onChange={(e) => setFormReceiverPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recAddr">Địa chỉ nhận hàng chi tiết *</Label>
                <Input
                  id="recAddr"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP..."
                  value={formReceiverAddress}
                  onChange={(e) => setFormReceiverAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cod">Tiền thu hộ COD (đ)</Label>
                  <Input
                    id="cod"
                    type="number"
                    value={formCod}
                    onChange={(e) => setFormCod(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shipFee">Cước vận chuyển (đ)</Label>
                  <Input
                    id="shipFee"
                    type="number"
                    value={formShippingFee}
                    onChange={(e) => setFormShippingFee(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payer">Bên trả cước</Label>
                  <Select value={formFeePayer} onValueChange={(v: "shop" | "khach") => setFormFeePayer(v)}>
                    <SelectTrigger id="payer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="khach">Khách trả</SelectItem>
                      <SelectItem value="shop">Shop trả</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="weight">Trọng lượng (gram)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="note">Ghi chú / Chỉ dẫn shipper</Label>
                  <Input
                    id="note"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang xử lý..." : "Tạo Vận Đơn"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CẬP NHẬT TRẠNG THÁI */}
      <Dialog open={!!statusItem} onOpenChange={(open) => !open && setStatusItem(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Cập Nhật Trạng Thái Vận Đơn</DialogTitle>
            <DialogDescription>
              Vận đơn: <strong className="text-primary">{statusItem?.ma_van_don}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1.5">
              <Label>Trạng thái mới *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cho_dong_goi">Chờ đóng gói</SelectItem>
                  <SelectItem value="da_ban_giao">Đã bàn giao shipper</SelectItem>
                  <SelectItem value="dang_giao">Đang giao hàng (In Transit)</SelectItem>
                  <SelectItem value="giao_thanh_cong">Giao thành công</SelectItem>
                  <SelectItem value="chuyen_hoan">Chuyển hoàn / Thất bại</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Vị trí hiện tại</Label>
              <Input
                placeholder="Kho phân loại Tân Bình / Đang phát tại Quận 1..."
                value={statusLocation}
                onChange={(e) => setStatusLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ghi chú tiến trình</Label>
              <Textarea
                placeholder="Shipper Nguyễn Văn B đã nhận hàng..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusItem(null)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateStatus}>
              Lưu Trạng Thái
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: LỊCH SỬ HÀNH TRÌNH TIMELINE */}
      <Dialog open={!!timelineItem} onOpenChange={(open) => !open && setTimelineItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconRoute className="h-5 w-5 text-primary" />
              Hành Trình Vận Đơn
            </DialogTitle>
            <DialogDescription>
              Mã: <span className="font-mono font-bold text-foreground">{timelineItem?.ma_van_don}</span> ({timelineItem?.don_vi_van_chuyen})
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-muted-foreground/20">
              {timelineItem?.lich_su_trang_thai?.map((h, idx) => (
                <div key={idx} className="relative flex items-start gap-3 pl-8 text-xs">
                  <span className="absolute left-2 top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {getStatusBadge(h.trang_thai)}
                      </span>
                      <span className="text-3xs text-muted-foreground">
                        {new Date(h.thoi_gian).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    {h.vi_tri && (
                      <div className="text-3xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        📍 {h.vi_tri}
                      </div>
                    )}
                    <p className="text-muted-foreground text-2xs mt-1">
                      {h.ghi_chu || "Cập nhật tiến trình"}
                    </p>
                    <span className="text-3xs text-muted-foreground/70">
                      Thực hiện: {h.nguoi_thuc_hien || "Hệ thống"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTimelineItem(null)}>
              Đóng
            </Button>
            {timelineItem && (
              <Button onClick={() => printWaybill(timelineItem)} className="gap-1.5">
                <IconPrinter className="h-4 w-4" />
                In Phiếu Vận Đơn
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
