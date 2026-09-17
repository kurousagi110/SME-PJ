"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconBuilding,
  IconBuildingStore,
  IconCrown,
  IconDownload,
  IconFileSpreadsheet,
  IconEdit,
  IconEye,
  IconHistory,
  IconMail,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconStar,
  IconTrash,
  IconTrendingUp,
  IconTruckDelivery,
  IconUser,
  IconUsers,
  IconUsersGroup,
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
import { Textarea } from "@/components/ui/textarea";

import {
  capNhatDoiTacAction,
  ChiTietDoiTacResponse,
  DoiTacItem,
  fetchChiTietDoiTacAction,
  fetchDoiTacAction,
  fetchTongQuanCRMAction,
  taoDoiTacAction,
  TongQuanCRM,
  xoaDoiTacAction,
} from "@/app/actions/doi-tac";
import { exportToCSV } from "@/lib/export";

const NHOM_LABELS: Record<string, { label: string; color: string }> = {
  vip: { label: "Khách VIP", color: "bg-amber-100 text-amber-800 border-amber-200" },
  khach_buon: { label: "Khách buôn / Đại lý", color: "bg-blue-100 text-blue-800 border-blue-200" },
  khach_le: { label: "Khách lẻ", color: "bg-slate-100 text-slate-700 border-slate-200" },
  chinh: { label: "Nhà cung cấp chính", color: "bg-purple-100 text-purple-800 border-purple-200" },
  phu: { label: "Nhà cung cấp phụ", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default function PartnersPage() {
  const [activeTab, setActiveTab] = React.useState("khach-hang");
  const [loading, setLoading] = React.useState(false);

  const [tongQuan, setTongQuan] = React.useState<TongQuanCRM>({
    tong_khach_hang: 0,
    khach_hang_vip: 0,
    tong_nha_cung_cap: 0,
    tong_doanh_so_ltv: 0,
  });

  const [partners, setPartners] = React.useState<DoiTacItem[]>([]);
  const [search, setSearch] = React.useState("");
  const [filterNhom, setFilterNhom] = React.useState("all");

  // Dialog Tạo / Sửa
  const [openForm, setOpenForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    ma_doi_tac: "",
    loai_doi_tac: "khach_hang" as "khach_hang" | "nha_cung_cap",
    ten: "",
    so_dien_thoai: "",
    email: "",
    dia_chi: "",
    ma_so_thue: "",
    nhom: "khach_le",
    ghi_chu: "",
  });

  // Dialog Customer 360
  const [open360, setOpen360] = React.useState(false);
  const [profile360, setProfile360] = React.useState<ChiTietDoiTacResponse | null>(null);
  const [loading360, setLoading360] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const loai = activeTab === "khach-hang" ? "khach_hang" : "nha_cung_cap";
      const [tqRes, listRes] = await Promise.all([
        fetchTongQuanCRMAction(),
        fetchDoiTacAction({
          loai_doi_tac: loai,
          nhom: filterNhom === "all" ? undefined : filterNhom,
          search: search.trim() || undefined,
        }),
      ]);

      if (tqRes.success && tqRes.data) setTongQuan(tqRes.data);
      if (listRes.success && listRes.items) setPartners(listRes.items);
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải dữ liệu đối tác");
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterNhom, search]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = (loai: "khach_hang" | "nha_cung_cap") => {
    setEditingId(null);
    setFormData({
      ma_doi_tac: "",
      loai_doi_tac: loai,
      ten: "",
      so_dien_thoai: "",
      email: "",
      dia_chi: "",
      ma_so_thue: "",
      nhom: loai === "khach_hang" ? "khach_le" : "chinh",
      ghi_chu: "",
    });
    setOpenForm(true);
  };

  const handleOpenEdit = (item: DoiTacItem) => {
    setEditingId(item._id);
    setFormData({
      ma_doi_tac: item.ma_doi_tac,
      loai_doi_tac: item.loai_doi_tac === "nha_cung_cap" ? "nha_cung_cap" : "khach_hang",
      ten: item.ten,
      so_dien_thoai: item.so_dien_thoai || "",
      email: item.email || "",
      dia_chi: item.dia_chi || "",
      ma_so_thue: item.ma_so_thue || "",
      nhom: item.nhom || (item.loai_doi_tac === "nha_cung_cap" ? "chinh" : "khach_le"),
      ghi_chu: item.ghi_chu || "",
    });
    setOpenForm(true);
  };

  const handleSavePartner = async () => {
    if (!formData.ten.trim()) {
      toast.error("Vui lòng nhập tên đối tác");
      return;
    }

    try {
      if (editingId) {
        await capNhatDoiTacAction(editingId, formData);
        toast.success("Cập nhật thông tin đối tác thành công!");
      } else {
        await taoDoiTacAction(formData);
        toast.success(`Đã thêm ${formData.loai_doi_tac === "khach_hang" ? "khách hàng" : "nhà cung cấp"} mới!`);
      }
      setOpenForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi lưu đối tác");
    }
  };

  const handleDeletePartner = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đối tác "${name}"?`)) return;

    try {
      await xoaDoiTacAction(id);
      toast.success(`Đã xóa đối tác "${name}"`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xóa đối tác");
    }
  };

  const handleView360 = async (id: string) => {
    setLoading360(true);
    setOpen360(true);
    try {
      const res = await fetchChiTietDoiTacAction(id);
      if (res.success && res.data) {
        setProfile360(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải hồ sơ chi tiết");
    } finally {
      setLoading360(false);
    }
  };

  const handleExportExcel = () => {
    const isCustomer = activeTab === "khach-hang";
    exportToCSV(
      isCustomer ? "Danh_Sach_Khach_Hang" : "Danh_Sach_Nha_Cung_Cap",
      [
        { key: "ma_doi_tac", label: "Mã đối tác" },
        { key: "ten", label: isCustomer ? "Tên khách hàng" : "Tên nhà cung cấp" },
        { key: "so_dien_thoai", label: "Số điện thoại" },
        { key: "email", label: "Email" },
        { key: "dia_chi", label: "Địa chỉ" },
        { key: "ma_so_thue", label: "Mã số thuế" },
        { key: "nhom", label: "Nhóm", formatter: (v) => NHOM_LABELS[v]?.label || v },
        { key: "tong_don", label: "Tổng số đơn" },
        {
          key: "tong_gia_tri",
          label: isCustomer ? "Tổng chi tiêu (VNĐ)" : "Tổng tiền mua (VNĐ)",
          formatter: (v) => Number(v || 0).toLocaleString("vi-VN"),
        },
        { key: "cong_no", label: "Công nợ hiện tại (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
        { key: "ghi_chu", label: "Ghi chú" },
      ],
      partners
    );
  };

  const toVND = (n?: number) => (Number.isFinite(n) ? Number(n) : 0).toLocaleString("vi-VN") + " đ";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <IconUsersGroup className="w-8 h-8 text-primary" />
            Quản Lý Đối Tác (Khách Hàng & NCC)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hồ sơ khách hàng 360 độ, theo dõi giá trị trọn đời (LTV), danh bạ nhà cung cấp và công nợ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1 text-slate-600"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="flex items-center gap-1 text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
          >
            <IconDownload className="w-4 h-4 text-emerald-600" />
            Xuất Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex items-center gap-1 text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
          >
            <Link href="/import">
              <IconFileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Nhập từ Excel
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenCreate("khach_hang")}
            className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            <IconPlus className="w-4 h-4" />
            Thêm Khách Hàng
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenCreate("nha_cung_cap")}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
          >
            <IconPlus className="w-4 h-4" />
            Thêm Nhà Cung Cấp
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Khách Hàng
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
              <IconUsers className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{tongQuan.tong_khach_hang} khách</div>
            <p className="text-xs text-muted-foreground mt-1">Đã phát sinh hoặc tạo hồ sơ</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Khách Hàng VIP
            </CardTitle>
            <div className="p-2 rounded-full bg-amber-50 text-amber-600">
              <IconCrown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{tongQuan.khach_hang_vip} đối tác</div>
            <p className="text-xs text-muted-foreground mt-1">Khách hàng ưu tiên đặc biệt</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-emerald-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Doanh Số Trọn Đời (LTV)
            </CardTitle>
            <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
              <IconTrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{toVND(tongQuan.tong_doanh_so_ltv)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tổng chi tiêu toàn hệ thống</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nhà Cung Cấp
            </CardTitle>
            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
              <IconTruckDelivery className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{tongQuan.tong_nha_cung_cap} đơn vị</div>
            <p className="text-xs text-muted-foreground mt-1">Đối tác cung ứng nguyên vật liệu</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="khach-hang" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border p-1 shadow-sm rounded-lg mb-4">
          <TabsTrigger value="khach-hang" className="font-semibold flex items-center gap-1.5">
            <IconUser className="w-4 h-4" />
            Khách Hàng ({activeTab === "khach-hang" ? partners.length : tongQuan.tong_khach_hang})
          </TabsTrigger>
          <TabsTrigger value="nha-cung-cap" className="font-semibold flex items-center gap-1.5">
            <IconBuildingStore className="w-4 h-4" />
            Nhà Cung Cấp ({activeTab === "nha-cung-cap" ? partners.length : tongQuan.tong_nha_cung_cap})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: KHÁCH HÀNG */}
        <TabsContent value="khach-hang" className="space-y-4">
          <Card className="border shadow-sm bg-white">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full sm:w-auto">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm theo tên khách, số điện thoại, mã KH, địa chỉ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200"
                  />
                </div>

                <Select value={filterNhom} onValueChange={setFilterNhom}>
                  <SelectTrigger className="w-[180px] bg-slate-50">
                    <SelectValue placeholder="Nhóm khách hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả nhóm</SelectItem>
                    <SelectItem value="vip">Khách VIP</SelectItem>
                    <SelectItem value="khach_buon">Khách buôn / Đại lý</SelectItem>
                    <SelectItem value="khach_le">Khách lẻ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold">Mã KH</TableHead>
                      <TableHead className="font-semibold">Tên khách hàng</TableHead>
                      <TableHead className="font-semibold">Liên hệ</TableHead>
                      <TableHead className="font-semibold">Địa chỉ</TableHead>
                      <TableHead className="font-semibold">Nhóm</TableHead>
                      <TableHead className="font-semibold text-center">Số đơn</TableHead>
                      <TableHead className="font-semibold text-right">Tổng chi tiêu (LTV)</TableHead>
                      <TableHead className="font-semibold text-right">Công nợ</TableHead>
                      <TableHead className="font-semibold text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Không có khách hàng nào. Bấm "Thêm Khách Hàng" để tạo mới.
                        </TableCell>
                      </TableRow>
                    ) : (
                      partners.map((p) => {
                        const nhomInfo = NHOM_LABELS[p.nhom] || NHOM_LABELS.khach_le;
                        return (
                          <TableRow key={p._id}>
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {p.ma_doi_tac}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-sm text-slate-900">{p.ten}</div>
                              {p.ghi_chu && <div className="text-xs text-muted-foreground">{p.ghi_chu}</div>}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs flex items-center gap-1 text-slate-700">
                                <IconPhone className="w-3 h-3 text-slate-400" />
                                {p.so_dien_thoai || "-"}
                              </div>
                              {p.email && (
                                <div className="text-xs flex items-center gap-1 text-slate-500 mt-0.5">
                                  <IconMail className="w-3 h-3 text-slate-400" />
                                  {p.email}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">
                              {p.dia_chi || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${nhomInfo.color}`}>
                                {nhomInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-sm">
                              {p.tong_don || 0}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm text-emerald-600">
                              {toVND(p.tong_gia_tri)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              <span className={(p.cong_no || 0) > 0 ? "text-rose-600" : "text-slate-400"}>
                                {toVND(p.cong_no)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleView360(p._id)}
                                  title="Xem hồ sơ Customer 360"
                                  className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                >
                                  <IconEye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Chỉnh sửa"
                                  className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                                >
                                  <IconEdit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePartner(p._id, p.ten)}
                                  title="Xóa đối tác"
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <IconTrash className="w-4 h-4" />
                                </Button>
                              </div>
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
        </TabsContent>

        {/* TAB 2: NHÀ CUNG CẤP */}
        <TabsContent value="nha-cung-cap" className="space-y-4">
          <Card className="border shadow-sm bg-white">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full sm:w-auto">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm theo tên nhà cung cấp, mã số thuế, SĐT..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200"
                  />
                </div>

                <Select value={filterNhom} onValueChange={setFilterNhom}>
                  <SelectTrigger className="w-[180px] bg-slate-50">
                    <SelectValue placeholder="Nhóm nhà cung cấp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả nhóm</SelectItem>
                    <SelectItem value="chinh">NCC Chính</SelectItem>
                    <SelectItem value="phu">NCC Phụ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold">Mã NCC</TableHead>
                      <TableHead className="font-semibold">Tên nhà cung cấp</TableHead>
                      <TableHead className="font-semibold">Liên hệ</TableHead>
                      <TableHead className="font-semibold">Địa chỉ</TableHead>
                      <TableHead className="font-semibold">Mã số thuế</TableHead>
                      <TableHead className="font-semibold">Nhóm</TableHead>
                      <TableHead className="font-semibold text-center">Số đơn nhập</TableHead>
                      <TableHead className="font-semibold text-right">Tổng tiền nhập</TableHead>
                      <TableHead className="font-semibold text-right">Còn nợ NCC</TableHead>
                      <TableHead className="font-semibold text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Không có nhà cung cấp nào. Bấm "Thêm Nhà Cung Cấp" để tạo mới.
                        </TableCell>
                      </TableRow>
                    ) : (
                      partners.map((p) => {
                        const nhomInfo = NHOM_LABELS[p.nhom] || NHOM_LABELS.chinh;
                        return (
                          <TableRow key={p._id}>
                            <TableCell className="font-mono text-xs font-semibold text-purple-700">
                              {p.ma_doi_tac}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-sm text-slate-900">{p.ten}</div>
                              {p.ghi_chu && <div className="text-xs text-muted-foreground">{p.ghi_chu}</div>}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs flex items-center gap-1 text-slate-700">
                                <IconPhone className="w-3 h-3 text-slate-400" />
                                {p.so_dien_thoai || "-"}
                              </div>
                              {p.email && (
                                <div className="text-xs flex items-center gap-1 text-slate-500 mt-0.5">
                                  <IconMail className="w-3 h-3 text-slate-400" />
                                  {p.email}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">
                              {p.dia_chi || "-"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">
                              {p.ma_so_thue || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${nhomInfo.color}`}>
                                {nhomInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-sm">
                              {p.tong_don || 0}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm text-slate-800">
                              {toVND(p.tong_gia_tri)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              <span className={(p.cong_no || 0) > 0 ? "text-rose-600" : "text-slate-400"}>
                                {toVND(p.cong_no)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleView360(p._id)}
                                  title="Xem hồ sơ Supplier 360"
                                  className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                                >
                                  <IconEye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Chỉnh sửa"
                                  className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                                >
                                  <IconEdit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePartner(p._id, p.ten)}
                                  title="Xóa đối tác"
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <IconTrash className="w-4 h-4" />
                                </Button>
                              </div>
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
        </TabsContent>
      </Tabs>

      {/* Dialog Tạo / Sửa Đối Tác */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {editingId ? (
                <>
                  <IconEdit className="w-5 h-5 text-primary" />
                  Chỉnh Sửa Đối Tác
                </>
              ) : (
                <>
                  <IconPlus className="w-5 h-5 text-primary" />
                  {formData.loai_doi_tac === "khach_hang" ? "Thêm Khách Hàng Mới" : "Thêm Nhà Cung Cấp Mới"}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Lưu thông tin danh bạ đối tác kinh doanh để tự động hóa khi tạo đơn hàng
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Loại đối tác</Label>
                <Select
                  value={formData.loai_doi_tac}
                  onValueChange={(val: any) =>
                    setFormData((prev) => ({
                      ...prev,
                      loai_doi_tac: val,
                      nhom: val === "khach_hang" ? "khach_le" : "chinh",
                    }))
                  }
                  disabled={Boolean(editingId)}
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="khach_hang">Khách hàng</SelectItem>
                    <SelectItem value="nha_cung_cap">Nhà cung cấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nhóm phân loại</Label>
                <Select
                  value={formData.nhom}
                  onValueChange={(val: any) => setFormData((prev) => ({ ...prev, nhom: val }))}
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.loai_doi_tac === "khach_hang" ? (
                      <>
                        <SelectItem value="khach_le">Khách lẻ</SelectItem>
                        <SelectItem value="khach_buon">Khách buôn / Đại lý</SelectItem>
                        <SelectItem value="vip">Khách VIP</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="chinh">NCC Chính</SelectItem>
                        <SelectItem value="phu">NCC Phụ</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-rose-600">Tên đối tác / Doanh nghiệp *</Label>
              <Input
                placeholder={formData.loai_doi_tac === "khach_hang" ? "Anh/Chị Nguyễn Văn A..." : "Công ty TNHH..."}
                value={formData.ten}
                onChange={(e) => setFormData((prev) => ({ ...prev, ten: e.target.value }))}
                className="bg-slate-50 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Số điện thoại</Label>
                <Input
                  placeholder="090..."
                  value={formData.so_dien_thoai}
                  onChange={(e) => setFormData((prev) => ({ ...prev, so_dien_thoai: e.target.value }))}
                  className="bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mã số thuế</Label>
                <Input
                  placeholder="031..."
                  value={formData.ma_so_thue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ma_so_thue: e.target.value }))}
                  className="bg-slate-50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mã đối tác (tùy chọn)</Label>
                <Input
                  placeholder={formData.loai_doi_tac === "khach_hang" ? "Tự động sinh (KH-...)" : "Tự động sinh (NCC-...)"}
                  value={formData.ma_doi_tac}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ma_doi_tac: e.target.value }))}
                  className="bg-slate-50 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Địa chỉ giao nhận / Trụ sở</Label>
              <Input
                placeholder="Số nhà, tên đường, quận/huyện, tỉnh/thành..."
                value={formData.dia_chi}
                onChange={(e) => setFormData((prev) => ({ ...prev, dia_chi: e.target.value }))}
                className="bg-slate-50 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ghi chú</Label>
              <Textarea
                rows={2}
                placeholder="Thông tin thêm..."
                value={formData.ghi_chu}
                onChange={(e) => setFormData((prev) => ({ ...prev, ghi_chu: e.target.value }))}
                className="bg-slate-50 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>
              Hủy
            </Button>
            <Button onClick={handleSavePartner} className="bg-primary text-white font-semibold">
              {editingId ? "Cập Nhật" : "Lưu Đối Tác"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Customer / Supplier 360 */}
      <Dialog open={open360} onOpenChange={setOpen360}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <IconHistory className="w-5 h-5 text-blue-600" />
              Hồ Sơ Đối Tác 360°
            </DialogTitle>
            <DialogDescription>
              Xem chi tiết lịch sử mua bán, giá trị đơn hàng và công nợ phát sinh
            </DialogDescription>
          </DialogHeader>

          {loading360 || !profile360 ? (
            <div className="py-12 text-center text-muted-foreground">Đang tải hồ sơ...</div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Profile Card */}
              <div className="p-4 rounded-lg bg-slate-50 border space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{profile360.partner.ten}</h3>
                    <div className="font-mono text-xs text-primary font-semibold">
                      {profile360.partner.ma_doi_tac} • {profile360.partner.loai_doi_tac === "khach_hang" ? "Khách Hàng" : "Nhà Cung Cấp"}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${NHOM_LABELS[profile360.partner.nhom]?.color}`}>
                    {NHOM_LABELS[profile360.partner.nhom]?.label || profile360.partner.nhom}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <IconPhone className="w-3.5 h-3.5 text-slate-400" />
                    <strong>SĐT:</strong> {profile360.partner.so_dien_thoai || "-"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconMail className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Email:</strong> {profile360.partner.email || "-"}
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <IconMapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <strong>Địa chỉ:</strong> {profile360.partner.dia_chi || "-"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                  <div>
                    <span className="text-xs text-slate-500">Tổng số đơn hàng:</span>
                    <div className="font-bold text-slate-900">{profile360.stats.tong_don} đơn</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Tổng giá trị giao dịch:</span>
                    <div className="font-bold text-emerald-600">{toVND(profile360.stats.tong_gia_tri)}</div>
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <IconHistory className="w-4 h-4 text-slate-500" />
                  Lịch Sử Các Đơn Hàng ({profile360.orders.length})
                </h4>

                <div className="rounded-md border overflow-hidden max-h-[220px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Mã đơn</TableHead>
                        <TableHead className="text-xs font-semibold">Ngày đặt</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Tổng tiền</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile360.orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                            Chưa có đơn hàng nào phát sinh
                          </TableCell>
                        </TableRow>
                      ) : (
                        profile360.orders.map((o: any) => (
                          <TableRow key={o.ma_dh}>
                            <TableCell className="font-mono text-xs font-semibold text-primary">{o.ma_dh}</TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {new Date(o.ngay_dat || o.createAt).toLocaleDateString("vi-VN")}
                            </TableCell>
                            <TableCell className="text-right text-xs font-bold text-slate-900">
                              {toVND(o.tong_tien)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {o.trang_thai}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen360(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
