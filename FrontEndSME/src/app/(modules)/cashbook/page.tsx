"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBuildingBank,
  IconCash,
  IconDownload,
  IconFileInvoice,
  IconPlus,
  IconPrinter,
  IconReceipt2,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconWallet,
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
  CongNoItem,
  CongNoResponse,
  fetchCongNoAction,
  fetchSoQuyAction,
  fetchTongQuanSoQuyAction,
  huyPhieuAction,
  SoQuyItem,
  taoPhieuAction,
  TongQuanSoQuy,
} from "@/app/actions/so-quy";
import { exportToCSV, printCashReceipt } from "@/lib/export";

const HANG_MUC_LABELS: Record<string, string> = {
  thu_ban_hang: "Thu tiền bán hàng",
  thu_no_khach: "Thu nợ khách hàng",
  thu_khac: "Thu khác",
  chi_mua_hang: "Chi mua nguyên vật liệu",
  chi_tra_no_ncc: "Chi trả nợ nhà cung cấp",
  chi_luong: "Chi trả lương nhân viên",
  chi_van_hanh: "Chi phí vận hành",
  chi_khac: "Chi khác",
};

export default function CashbookPage() {
  const [activeTab, setActiveTab] = React.useState("so-quy");
  const [loading, setLoading] = React.useState(false);

  // Data
  const [tongQuan, setTongQuan] = React.useState<TongQuanSoQuy>({
    tong_thu: 0,
    tong_chi: 0,
    ton_quy: 0,
    ton_tien_mat: 0,
    ton_chuyen_khoan: 0,
  });
  const [soQuyItems, setSoQuyItems] = React.useState<SoQuyItem[]>([]);
  const [congNo, setCongNo] = React.useState<CongNoResponse>({
    khach_hang: { items: [], tong_phai_thu: 0, tong_da_thu: 0, tong_con_phai_thu: 0 },
    nha_cung_cap: { items: [], tong_phai_tra: 0, tong_da_tra: 0, tong_con_phai_tra: 0 },
  });

  // Filters
  const [filterLoai, setFilterLoai] = React.useState<string>("all");
  const [filterPhuongThuc, setFilterPhuongThuc] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  // Dialog Tạo Phiếu
  const [openCreate, setOpenCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<{
    loai_phieu: "thu" | "chi";
    hang_muc: string;
    so_tien: string;
    phuong_thuc: "tien_mat" | "chuyen_khoan";
    doi_tuong_ten: string;
    doi_tuong_sdt: string;
    doi_tuong_dia_chi: string;
    ma_chung_tu: string;
    ghi_chu: string;
  }>({
    loai_phieu: "thu",
    hang_muc: "thu_ban_hang",
    so_tien: "",
    phuong_thuc: "tien_mat",
    doi_tuong_ten: "",
    doi_tuong_sdt: "",
    doi_tuong_dia_chi: "",
    ma_chung_tu: "",
    ghi_chu: "",
  });

  const loadAllData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [tqRes, sqRes, cnRes] = await Promise.all([
        fetchTongQuanSoQuyAction(),
        fetchSoQuyAction({
          loai_phieu: filterLoai === "all" ? undefined : filterLoai,
          phuong_thuc: filterPhuongThuc === "all" ? undefined : filterPhuongThuc,
          search: search.trim() || undefined,
        }),
        fetchCongNoAction(),
      ]);

      if (tqRes.success && tqRes.data) setTongQuan(tqRes.data);
      if (sqRes.success && sqRes.items) setSoQuyItems(sqRes.items);
      if (cnRes.success && cnRes.data) setCongNo(cnRes.data);
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải dữ liệu sổ quỹ");
    } finally {
      setLoading(false);
    }
  }, [filterLoai, filterPhuongThuc, search]);

  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleOpenCreateModal = (loai: "thu" | "chi", defaultData?: Partial<typeof createForm>) => {
    setCreateForm({
      loai_phieu: loai,
      hang_muc: defaultData?.hang_muc || (loai === "thu" ? "thu_ban_hang" : "chi_mua_hang"),
      so_tien: defaultData?.so_tien || "",
      phuong_thuc: defaultData?.phuong_thuc || "tien_mat",
      doi_tuong_ten: defaultData?.doi_tuong_ten || "",
      doi_tuong_sdt: defaultData?.doi_tuong_sdt || "",
      doi_tuong_dia_chi: defaultData?.doi_tuong_dia_chi || "",
      ma_chung_tu: defaultData?.ma_chung_tu || "",
      ghi_chu: defaultData?.ghi_chu || "",
    });
    setOpenCreate(true);
  };

  const handleSavePhieu = async () => {
    const amount = Number(createForm.so_tien);
    if (!amount || amount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ (> 0)");
      return;
    }

    try {
      const res = await taoPhieuAction({
        loai_phieu: createForm.loai_phieu,
        hang_muc: createForm.hang_muc,
        so_tien: amount,
        phuong_thuc: createForm.phuong_thuc,
        doi_tuong: {
          ten: createForm.doi_tuong_ten,
          so_dien_thoai: createForm.doi_tuong_sdt,
          dia_chi: createForm.doi_tuong_dia_chi,
        },
        ma_chung_tu: createForm.ma_chung_tu,
        ghi_chu: createForm.ghi_chu,
      });

      if (res.success) {
        toast.success(`Đã tạo ${createForm.loai_phieu === "thu" ? "Phiếu Thu" : "Phiếu Chi"} thành công!`);
        setOpenCreate(false);
        loadAllData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tạo phiếu thu/chi");
    }
  };

  const handleCancelPhieu = async (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy phiếu ${code}? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      const res = await huyPhieuAction(id, "Người dùng hủy qua giao diện");
      if (res.success) {
        toast.success(`Đã hủy phiếu ${code}`);
        loadAllData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi hủy phiếu");
    }
  };

  const handleExportExcel = () => {
    if (activeTab === "so-quy") {
      exportToCSV(
        "So_Quy_Thu_Chi",
        [
          { key: "ma_phieu", label: "Mã phiếu" },
          { key: "loai_phieu", label: "Loại", formatter: (v) => (v === "thu" ? "Thu" : "Chi") },
          { key: "hang_muc", label: "Hạng mục", formatter: (v) => HANG_MUC_LABELS[v] || v },
          { key: "doi_tuong", label: "Đối tượng", formatter: (_, r) => r.doi_tuong?.ten || "-" },
          { key: "so_tien", label: "Số tiền (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
          { key: "phuong_thuc", label: "Phương thức", formatter: (v) => (v === "chuyen_khoan" ? "Chuyển khoản" : "Tiền mặt") },
          { key: "ma_chung_tu", label: "Chứng từ gốc" },
          { key: "ngay_ghi_nhan", label: "Ngày ghi nhận", formatter: (v) => new Date(v).toLocaleDateString("vi-VN") },
          { key: "trang_thai", label: "Trạng thái", formatter: (v) => (v === "active" ? "Đã ghi sổ" : "Đã hủy") },
          { key: "ghi_chu", label: "Ghi chú" },
        ],
        soQuyItems
      );
    } else if (activeTab === "cong-no-khach") {
      exportToCSV(
        "Cong_No_Phai_Thu_Khach_Hang",
        [
          { key: "ma_dh", label: "Mã đơn hàng" },
          { key: "khach_hang", label: "Khách hàng" },
          { key: "so_dien_thoai", label: "Số điện thoại" },
          { key: "tong_tien", label: "Tổng tiền (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
          { key: "da_thanh_toan", label: "Đã thu (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
          { key: "con_lai", label: "Còn phải thu (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
          { key: "trang_thai_cong_no", label: "Trạng thái nợ", formatter: (v) => (v === "da_thanh_toan" ? "Đã thanh toán" : v === "thanh_toan_mot_phan" ? "Còn nợ một phần" : "Chưa thanh toán") },
        ],
        congNo.khach_hang.items
      );
    } else {
      exportToCSV(
        "Cong_No_Phai_Tra_Nha_Cung_Cap",
        [
          { key: "ma_dh", label: "Mã đơn nhập" },
          { key: "nha_cung_cap", label: "Nhà cung cấp" },
          { key: "tong_tien", label: "Tổng tiền (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
          { key: "da_chi", label: "Đã chi (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
          { key: "con_lai", label: "Còn nợ NCC (VNĐ)", formatter: (v) => Number(v || 0).toLocaleString("vi-VN") },
          { key: "trang_thai_cong_no", label: "Trạng thái nợ", formatter: (v) => (v === "da_thanh_toan" ? "Đã thanh toán" : v === "thanh_toan_mot_phan" ? "Còn nợ một phần" : "Chưa thanh toán") },
        ],
        congNo.nha_cung_cap.items
      );
    }
  };

  const toVND = (n: number) => (Number.isFinite(n) ? Number(n) : 0).toLocaleString("vi-VN") + " đ";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <IconReceipt2 className="w-8 h-8 text-primary" />
            Sổ Quỹ & Quản Lý Công Nợ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi dòng tiền thực tế (Cash Flow), số dư quỹ và kiểm soát công nợ 2 chiều (Khách hàng & Nhà cung cấp)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
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
            size="sm"
            onClick={() => handleOpenCreateModal("thu")}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <IconPlus className="w-4 h-4" />
            Lập Phiếu Thu
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenCreateModal("chi")}
            className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm"
          >
            <IconPlus className="w-4 h-4" />
            Lập Phiếu Chi
          </Button>
        </div>
      </div>

      {/* 5 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Thu
            </CardTitle>
            <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
              <IconArrowDownLeft className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{toVND(tongQuan.tong_thu)}</div>
            <p className="text-xs text-muted-foreground mt-1">Dòng tiền vào thực tế</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Chi
            </CardTitle>
            <div className="p-2 rounded-full bg-rose-50 text-rose-600">
              <IconArrowUpRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-600">{toVND(tongQuan.tong_chi)}</div>
            <p className="text-xs text-muted-foreground mt-1">Dòng tiền ra thực tế</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tồn Quỹ Ròng
            </CardTitle>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600">
              <IconWallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${tongQuan.ton_quy >= 0 ? "text-blue-600" : "text-rose-600"}`}>
              {toVND(tongQuan.ton_quy)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Thu trừ chi hiện tại</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quỹ Tiền Mặt
            </CardTitle>
            <div className="p-2 rounded-full bg-amber-50 text-amber-600">
              <IconCash className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800">{toVND(tongQuan.ton_tien_mat)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tiền mặt tại két</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quỹ Ngân Hàng
            </CardTitle>
            <div className="p-2 rounded-full bg-purple-50 text-purple-600">
              <IconBuildingBank className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800">{toVND(tongQuan.ton_chuyen_khoan)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tài khoản ngân hàng</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="so-quy" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border p-1 shadow-sm rounded-lg mb-4">
          <TabsTrigger value="so-quy" className="font-semibold">
            Sổ Quỹ Thu - Chi ({soQuyItems.length})
          </TabsTrigger>
          <TabsTrigger value="cong-no-khach" className="font-semibold">
            Công Nợ Khách Hàng ({congNo.khach_hang.items.filter((i) => i.con_lai > 0).length} đơn nợ)
          </TabsTrigger>
          <TabsTrigger value="cong-no-ncc" className="font-semibold">
            Công Nợ Nhà Cung Cấp ({congNo.nha_cung_cap.items.filter((i) => i.con_lai > 0).length} đơn nợ)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SỔ QUỸ THU - CHI */}
        <TabsContent value="so-quy" className="space-y-4">
          <Card className="border shadow-sm bg-white">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Filter Row */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full sm:w-auto">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm theo mã phiếu, chứng từ, người nộp/nhận..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={filterLoai} onValueChange={setFilterLoai}>
                    <SelectTrigger className="w-[140px] bg-slate-50">
                      <SelectValue placeholder="Loại phiếu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả loại</SelectItem>
                      <SelectItem value="thu">Phiếu Thu (+)</SelectItem>
                      <SelectItem value="chi">Phiếu Chi (-)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterPhuongThuc} onValueChange={setFilterPhuongThuc}>
                    <SelectTrigger className="w-[160px] bg-slate-50">
                      <SelectValue placeholder="Phương thức" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả phương thức</SelectItem>
                      <SelectItem value="tien_mat">Tiền mặt</SelectItem>
                      <SelectItem value="chuyen_khoan">Chuyển khoản</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold">Mã phiếu</TableHead>
                      <TableHead className="font-semibold">Loại</TableHead>
                      <TableHead className="font-semibold">Hạng mục</TableHead>
                      <TableHead className="font-semibold">Đối tượng</TableHead>
                      <TableHead className="font-semibold text-right">Số tiền</TableHead>
                      <TableHead className="font-semibold">Phương thức</TableHead>
                      <TableHead className="font-semibold">Chứng từ</TableHead>
                      <TableHead className="font-semibold">Ngày ghi</TableHead>
                      <TableHead className="font-semibold">Trạng thái</TableHead>
                      <TableHead className="font-semibold text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {soQuyItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Không có giao dịch nào trong sổ quỹ. Hãy bấm "Lập Phiếu Thu" hoặc "Lập Phiếu Chi".
                        </TableCell>
                      </TableRow>
                    ) : (
                      soQuyItems.map((item) => {
                        const isThu = item.loai_phieu === "thu";
                        const isCancelled = item.trang_thai === "cancelled";
                        return (
                          <TableRow key={item._id} className={isCancelled ? "opacity-60 bg-slate-50" : ""}>
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {item.ma_phieu}
                            </TableCell>
                            <TableCell>
                              {isThu ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
                                  Thu
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none">
                                  Chi
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {HANG_MUC_LABELS[item.hang_muc] || item.hang_muc}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-semibold">{item.doi_tuong?.ten || "Khách lẻ / Nội bộ"}</div>
                              {item.doi_tuong?.so_dien_thoai && (
                                <div className="text-xs text-muted-foreground">{item.doi_tuong.so_dien_thoai}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              <span className={isThu ? "text-emerald-600" : "text-rose-600"}>
                                {isThu ? "+" : "-"} {toVND(item.so_tien)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              {item.phuong_thuc === "chuyen_khoan" ? "Chuyển khoản" : "Tiền mặt"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">
                              {item.ma_chung_tu || "-"}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(item.ngay_ghi_nhan).toLocaleDateString("vi-VN")}
                            </TableCell>
                            <TableCell>
                              {isCancelled ? (
                                <Badge variant="destructive" className="text-xs">
                                  Đã hủy
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                  Đã ghi sổ
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => printCashReceipt(item)}
                                  title="In phiếu A5"
                                  className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-blue-50"
                                >
                                  <IconPrinter className="w-4 h-4" />
                                </Button>
                                {!isCancelled && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCancelPhieu(item._id, item.ma_phieu)}
                                    title="Hủy phiếu"
                                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  >
                                    <IconTrash className="w-4 h-4" />
                                  </Button>
                                )}
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

        {/* TAB 2: CÔNG NỢ KHÁCH HÀNG */}
        <TabsContent value="cong-no-khach" className="space-y-4">
          <Card className="border shadow-sm bg-white">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Bảng Kê Công Nợ Phải Thu Khách Hàng
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tổng hợp từ các đơn bán hàng thực tế đã được duyệt
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    Tổng giá trị: <strong className="text-slate-800">{toVND(congNo.khach_hang.tong_phai_thu)}</strong>
                  </div>
                  <div>
                    Đã thu: <strong className="text-emerald-600">{toVND(congNo.khach_hang.tong_da_thu)}</strong>
                  </div>
                  <div>
                    Còn phải thu:{" "}
                    <strong className="text-rose-600 text-base">{toVND(congNo.khach_hang.tong_con_phai_thu)}</strong>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold">Mã đơn hàng</TableHead>
                      <TableHead className="font-semibold">Khách hàng</TableHead>
                      <TableHead className="font-semibold">Ngày đặt</TableHead>
                      <TableHead className="font-semibold text-right">Tổng đơn</TableHead>
                      <TableHead className="font-semibold text-right">Đã thanh toán</TableHead>
                      <TableHead className="font-semibold text-right">Còn nợ</TableHead>
                      <TableHead className="font-semibold text-center">Trạng thái công nợ</TableHead>
                      <TableHead className="font-semibold text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {congNo.khach_hang.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          Không có đơn bán hàng nào trong hệ thống.
                        </TableCell>
                      </TableRow>
                    ) : (
                      congNo.khach_hang.items.map((row) => {
                        const isPaid = row.con_lai <= 0;
                        return (
                          <TableRow key={row.ma_dh}>
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {row.ma_dh}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-sm">{row.khach_hang}</div>
                              {row.so_dien_thoai && (
                                <div className="text-xs text-muted-foreground">{row.so_dien_thoai}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(row.ngay_dat).toLocaleDateString("vi-VN")}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm">
                              {toVND(row.tong_tien)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-semibold text-sm">
                              {toVND(row.da_thanh_toan || 0)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              <span className={isPaid ? "text-slate-400" : "text-rose-600"}>
                                {toVND(row.con_lai)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {isPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-xs">
                                  Đã thanh toán đủ
                                </Badge>
                              ) : row.da_thanh_toan && row.da_thanh_toan > 0 ? (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none text-xs">
                                  Còn nợ một phần
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none text-xs">
                                  Chưa thanh toán
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {!isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleOpenCreateModal("thu", {
                                      hang_muc: "thu_no_khach",
                                      doi_tuong_ten: row.khach_hang,
                                      doi_tuong_sdt: row.so_dien_thoai,
                                      ma_chung_tu: row.ma_dh,
                                      so_tien: String(row.con_lai),
                                      ghi_chu: `Thu tiền đơn hàng ${row.ma_dh}`,
                                    })
                                  }
                                  className="h-7 text-xs font-medium border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                >
                                  Thu tiền nợ
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
        </TabsContent>

        {/* TAB 3: CÔNG NỢ NHÀ CUNG CẤP */}
        <TabsContent value="cong-no-ncc" className="space-y-4">
          <Card className="border shadow-sm bg-white">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Bảng Kê Công Nợ Phải Trả Nhà Cung Cấp
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Theo dõi các khoản tiền phải chi trả cho các đơn nhập nguyên vật liệu
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    Tổng tiền hàng: <strong className="text-slate-800">{toVND(congNo.nha_cung_cap.tong_phai_tra)}</strong>
                  </div>
                  <div>
                    Đã chi trả: <strong className="text-emerald-600">{toVND(congNo.nha_cung_cap.tong_da_tra)}</strong>
                  </div>
                  <div>
                    Còn nợ NCC:{" "}
                    <strong className="text-rose-600 text-base">{toVND(congNo.nha_cung_cap.tong_con_phai_tra)}</strong>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold">Mã đơn nhập</TableHead>
                      <TableHead className="font-semibold">Nhà cung cấp</TableHead>
                      <TableHead className="font-semibold">Ngày đặt</TableHead>
                      <TableHead className="font-semibold text-right">Tổng đơn</TableHead>
                      <TableHead className="font-semibold text-right">Đã chi</TableHead>
                      <TableHead className="font-semibold text-right">Còn nợ</TableHead>
                      <TableHead className="font-semibold text-center">Trạng thái nợ</TableHead>
                      <TableHead className="font-semibold text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {congNo.nha_cung_cap.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          Không có đơn nhập nguyên vật liệu nào trong hệ thống.
                        </TableCell>
                      </TableRow>
                    ) : (
                      congNo.nha_cung_cap.items.map((row) => {
                        const isPaid = row.con_lai <= 0;
                        return (
                          <TableRow key={row.ma_dh}>
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {row.ma_dh}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">{row.nha_cung_cap}</TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(row.ngay_dat).toLocaleDateString("vi-VN")}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm">
                              {toVND(row.tong_tien)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-semibold text-sm">
                              {toVND(row.da_chi || 0)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              <span className={isPaid ? "text-slate-400" : "text-rose-600"}>
                                {toVND(row.con_lai)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {isPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-xs">
                                  Đã thanh toán đủ
                                </Badge>
                              ) : row.da_chi && row.da_chi > 0 ? (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none text-xs">
                                  Còn nợ một phần
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none text-xs">
                                  Chưa trả
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {!isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleOpenCreateModal("chi", {
                                      hang_muc: "chi_tra_no_ncc",
                                      doi_tuong_ten: row.nha_cung_cap,
                                      ma_chung_tu: row.ma_dh,
                                      so_tien: String(row.con_lai),
                                      ghi_chu: `Chi trả tiền hàng cho đơn ${row.ma_dh}`,
                                    })
                                  }
                                  className="h-7 text-xs font-medium border-rose-300 text-rose-700 hover:bg-rose-50"
                                >
                                  Trả tiền nợ
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
        </TabsContent>
      </Tabs>

      {/* Dialog Lập Phiếu Thu / Chi */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {createForm.loai_phieu === "thu" ? (
                <>
                  <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-700">
                    <IconPlus className="w-5 h-5" />
                  </div>
                  Lập Phiếu Thu Tiền
                </>
              ) : (
                <>
                  <div className="p-1.5 rounded-full bg-rose-100 text-rose-700">
                    <IconPlus className="w-5 h-5" />
                  </div>
                  Lập Phiếu Chi Tiền
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {createForm.loai_phieu === "thu"
                ? "Ghi nhận dòng tiền thu vào quỹ tiền mặt hoặc tài khoản ngân hàng"
                : "Ghi nhận dòng tiền chi ra từ quỹ tiền mặt hoặc tài khoản ngân hàng"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Loại phiếu</Label>
                <Select
                  value={createForm.loai_phieu}
                  onValueChange={(val: "thu" | "chi") =>
                    setCreateForm((prev) => ({
                      ...prev,
                      loai_phieu: val,
                      hang_muc: val === "thu" ? "thu_ban_hang" : "chi_mua_hang",
                    }))
                  }
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thu">Phiếu Thu (+)</SelectItem>
                    <SelectItem value="chi">Phiếu Chi (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phương thức</Label>
                <Select
                  value={createForm.phuong_thuc}
                  onValueChange={(val: "tien_mat" | "chuyen_khoan") =>
                    setCreateForm((prev) => ({ ...prev, phuong_thuc: val }))
                  }
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tien_mat">Tiền mặt tại két</SelectItem>
                    <SelectItem value="chuyen_khoan">Chuyển khoản NH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hạng mục</Label>
                <Select
                  value={createForm.hang_muc}
                  onValueChange={(val) => setCreateForm((prev) => ({ ...prev, hang_muc: val }))}
                >
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {createForm.loai_phieu === "thu" ? (
                      <>
                        <SelectItem value="thu_ban_hang">Thu tiền bán hàng</SelectItem>
                        <SelectItem value="thu_no_khach">Thu nợ khách hàng</SelectItem>
                        <SelectItem value="thu_khac">Thu khác</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="chi_mua_hang">Chi mua nguyên vật liệu</SelectItem>
                        <SelectItem value="chi_tra_no_ncc">Trả nợ nhà cung cấp</SelectItem>
                        <SelectItem value="chi_luong">Chi trả lương</SelectItem>
                        <SelectItem value="chi_van_hanh">Chi phí vận hành</SelectItem>
                        <SelectItem value="chi_khac">Chi khác</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-rose-600">Số tiền (VNĐ) *</Label>
                <Input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={createForm.so_tien}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, so_tien: e.target.value }))}
                  className="font-bold text-base bg-slate-50"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {createForm.loai_phieu === "thu" ? "Người nộp tiền / Khách hàng" : "Người nhận tiền / Nhà cung cấp"}
              </Label>
              <Input
                placeholder="Họ tên đối tượng..."
                value={createForm.doi_tuong_ten}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, doi_tuong_ten: e.target.value }))}
                className="bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Số điện thoại</Label>
                <Input
                  placeholder="09..."
                  value={createForm.doi_tuong_sdt}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, doi_tuong_sdt: e.target.value }))}
                  className="bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mã chứng từ gốc (nếu có)</Label>
                <Input
                  placeholder="Ví dụ: DH-2026..."
                  value={createForm.ma_chung_tu}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, ma_chung_tu: e.target.value }))}
                  className="font-mono text-xs bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lý do / Ghi chú</Label>
              <Textarea
                placeholder="Diễn giải chi tiết lý do nộp/chi..."
                rows={2}
                value={createForm.ghi_chu}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, ghi_chu: e.target.value }))}
                className="bg-slate-50 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Đóng
            </Button>
            <Button
              onClick={handleSavePhieu}
              className={
                createForm.loai_phieu === "thu"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  : "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              }
            >
              Lưu {createForm.loai_phieu === "thu" ? "Phiếu Thu" : "Phiếu Chi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
