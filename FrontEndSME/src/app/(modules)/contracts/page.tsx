"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconFileText,
  IconShieldCheck,
  IconPlus,
  IconSearch,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconTool,
  IconPhone,
  IconCalendar,
  IconRefresh,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchContractsAction,
  createContractAction,
  payMilestoneAction,
  type ContractItem,
} from "@/app/actions/contract";
import {
  fetchWarrantiesAction,
  lookupWarrantyAction,
  createWarrantyAction,
  addMaintenanceTicketAction,
  type WarrantyItem,
} from "@/app/actions/warranty";
import { formatVND } from "@/utils/format";

export default function ContractsAndWarrantyPage() {
  const [activeTab, setActiveTab] = React.useState<string>("contracts");

  /* ─── State Hợp đồng ─── */
  const [contracts, setContracts] = React.useState<ContractItem[]>([]);
  const [loadingContracts, setLoadingContracts] = React.useState<boolean>(true);
  const [searchContract, setSearchContract] = React.useState<string>("");
  const [openCreateContract, setOpenCreateContract] = React.useState<boolean>(false);
  const [selectedContract, setSelectedContract] = React.useState<ContractItem | null>(null);

  // Form tạo hợp đồng
  const [contractForm, setContractForm] = React.useState({
    ten_hop_dong: "",
    partner_name: "",
    order_code: "",
    gia_tri_hop_dong: 50000000,
    dieu_khoan: "Thanh toán chia 3 đợt: Tạm ứng 30%, Giao hàng 50%, Quyết toán 20%. Bảo hành 12 tháng.",
  });

  /* ─── State Bảo hành ─── */
  const [warranties, setWarranties] = React.useState<WarrantyItem[]>([]);
  const [loadingWarranties, setLoadingWarranties] = React.useState<boolean>(true);
  const [warrantyLookupKey, setWarrantyLookupKey] = React.useState<string>("");
  const [openCreateWarranty, setOpenCreateWarranty] = React.useState<boolean>(false);
  const [selectedWarranty, setSelectedWarranty] = React.useState<WarrantyItem | null>(null);
  const [openMaintenanceModal, setOpenMaintenanceModal] = React.useState<boolean>(false);
  const [maintenanceForm, setMaintenanceForm] = React.useState({
    noi_dung: "Bảo dưỡng định kỳ, tra dầu bản lề & căn chỉnh cánh tủ",
    ky_thuat_vien: "Nguyễn Văn Kỹ Thuật",
    chi_phi: 0,
  });

  // Form tạo bảo hành
  const [warrantyForm, setWarrantyForm] = React.useState({
    ten_sp: "Tủ bếp gỗ sồi cao cấp",
    serial_number: `SN-${Date.now().toString(36).toUpperCase()}`,
    khach_hang_ten: "",
    so_dien_thoai: "",
    dia_chi: "",
    thoi_han_thang: 12,
  });

  /* ─── Load dữ liệu Hợp đồng ─── */
  const loadContracts = React.useCallback(async () => {
    setLoadingContracts(true);
    try {
      const res = await fetchContractsAction({ q: searchContract });
      if (res.success && res.items) setContracts(res.items);
    } catch {
      toast.error("Không thể tải danh sách hợp đồng");
    } finally {
      setLoadingContracts(false);
    }
  }, [searchContract]);

  /* ─── Load dữ liệu Bảo hành ─── */
  const loadWarranties = React.useCallback(async () => {
    setLoadingWarranties(true);
    try {
      const res = await fetchWarrantiesAction();
      if (res.success && res.items) setWarranties(res.items);
    } catch {
      toast.error("Không thể tải danh sách bảo hành");
    } finally {
      setLoadingWarranties(false);
    }
  }, []);

  React.useEffect(() => {
    loadContracts();
    loadWarranties();
  }, [loadContracts, loadWarranties]);

  // Tạo hợp đồng
  const handleCreateContract = async () => {
    if (!contractForm.ten_hop_dong || !contractForm.partner_name) {
      toast.error("Vui lòng nhập tên hợp đồng và tên đối tác");
      return;
    }

    try {
      const res = await createContractAction(contractForm);
      if (res.success) {
        toast.success("Tạo hợp đồng kinh tế thành công!");
        setOpenCreateContract(false);
        loadContracts();
      } else {
        toast.error(res.error || "Tạo hợp đồng thất bại");
      }
    } catch {
      toast.error("Lỗi khi tạo hợp đồng");
    }
  };

  // Thu tiền đợt thanh toán
  const handlePayMilestone = async (contractId: string, idx: number) => {
    try {
      const res = await payMilestoneAction(contractId, idx);
      if (res.success) {
        toast.success(`Đã tạo Phiếu Thu (${res.data?.ma_phieu_thu}) số tiền ${Number(res.data?.so_tien || 0).toLocaleString("vi-VN")} đ`);
        loadContracts();
        if (selectedContract && selectedContract._id === contractId) {
          const updated = { ...selectedContract };
          updated.dot_thanh_toan[idx].trang_thai = "paid";
          setSelectedContract(updated);
        }
      } else {
        toast.error(res.error || "Ghi nhận thanh toán thất bại");
      }
    } catch {
      toast.error("Lỗi mạng khi thu tiền đợt");
    }
  };

  // Tra cứu bảo hành
  const handleLookupWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantyLookupKey.trim()) {
      loadWarranties();
      return;
    }

    setLoadingWarranties(true);
    try {
      const res = await lookupWarrantyAction(warrantyLookupKey);
      if (res.success && res.items) {
        setWarranties(res.items);
        if (res.items.length === 0) {
          toast.info("Không tìm thấy phiếu bảo hành khớp với từ khóa");
        }
      }
    } catch {
      toast.error("Lỗi khi tra cứu bảo hành");
    } finally {
      setLoadingWarranties(false);
    }
  };

  // Tạo bảo hành
  const handleCreateWarranty = async () => {
    if (!warrantyForm.khach_hang_ten || !warrantyForm.so_dien_thoai) {
      toast.error("Vui lòng nhập tên khách hàng và số điện thoại");
      return;
    }

    try {
      const res = await createWarrantyAction(warrantyForm);
      if (res.success) {
        toast.success("Tạo phiếu bảo hành điện tử thành công!");
        setOpenCreateWarranty(false);
        loadWarranties();
      } else {
        toast.error(res.error || "Tạo bảo hành thất bại");
      }
    } catch {
      toast.error("Lỗi khi tạo bảo hành");
    }
  };

  // Thêm lịch sử bảo dưỡng
  const handleAddMaintenance = async () => {
    if (!selectedWarranty) return;
    try {
      const res = await addMaintenanceTicketAction(selectedWarranty._id, maintenanceForm);
      if (res.success) {
        toast.success("Đã ghi nhận nhật ký bảo dưỡng thành công!");
        setOpenMaintenanceModal(false);
        loadWarranties();
      } else {
        toast.error(res.error || "Ghi nhận thất bại");
      }
    } catch {
      toast.error("Lỗi mạng khi ghi nhận");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            Hợp Đồng B2B & Bảo Hành Điện Tử
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản trị vòng đời Hợp đồng kinh tế (Thu tiền theo đợt) và Tra cứu Bảo hành sau bán hàng
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "contracts" ? (
            <Button onClick={() => setOpenCreateContract(true)}>
              <IconPlus className="h-4 w-4 mr-1.5" />
              Tạo Hợp Đồng Mới
            </Button>
          ) : (
            <Button onClick={() => setOpenCreateWarranty(true)}>
              <IconPlus className="h-4 w-4 mr-1.5" />
              Tạo Phiếu Bảo Hành
            </Button>
          )}
        </div>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <IconFileText className="h-4 w-4" />
            Hợp Đồng Kinh Tế ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="warranty" className="flex items-center gap-2">
            <IconShieldCheck className="h-4 w-4" />
            Bảo Hành Sau Bán ({warranties.length})
          </TabsTrigger>
        </TabsList>

        {/* ══════════════ TAB 1: HỢP ĐỒNG KINH TẾ B2B ══════════════ */}
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Danh Sách Hợp Đồng Kinh Tế</CardTitle>
                  <CardDescription>Theo dõi tiến độ thanh toán từng đợt tạm ứng, bàn giao và quyết toán</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Tìm theo mã HĐ, tên đối tác..."
                    value={searchContract}
                    onChange={(e) => setSearchContract(e.target.value)}
                    className="w-[240px] text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={loadContracts}>
                    <IconRefresh className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã HĐ</TableHead>
                      <TableHead>Tên Hợp Đồng</TableHead>
                      <TableHead>Đối Tác</TableHead>
                      <TableHead className="text-right">Giá Trị HĐ</TableHead>
                      <TableHead className="text-center">Tiến Độ Thu Tiền</TableHead>
                      <TableHead className="text-center">Trạng Thái</TableHead>
                      <TableHead className="text-right">Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((c) => {
                      const paidCount = (c.dot_thanh_toan || []).filter((d) => d.trang_thai === "paid").length;
                      const totalDots = (c.dot_thanh_toan || []).length;

                      return (
                        <TableRow key={c._id}>
                          <TableCell className="font-mono font-bold text-primary">{c.ma_hop_dong}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{c.ten_hop_dong}</TableCell>
                          <TableCell>{c.partner_name}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-700">
                            {formatVND(c.gia_tri_hop_dong)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-semibold">
                              {paidCount} / {totalDots} đợt
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={c.trang_thai === "completed" ? "outline" : "secondary"}
                              className={
                                c.trang_thai === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : ""
                              }
                            >
                              {c.trang_thai === "completed" ? "Đã Quyết Toán" : "Đang Thực Hiện"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setSelectedContract(c)}
                            >
                              Chi Tiết Đợt
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {contracts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có hợp đồng nào. Nhấn "Tạo Hợp Đồng Mới" để bắt đầu!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ TAB 2: BẢO HÀNH & BẢO TRÌ ══════════════ */}
        <TabsContent value="warranty" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Tra Cứu & Quản Lý Phiếu Bảo Hành</CardTitle>
                  <CardDescription>Tra cứu nhanh bằng Số Điện Thoại khách hàng hoặc Mã Serial Barcode</CardDescription>
                </div>
                <form onSubmit={handleLookupWarranty} className="flex items-center gap-2">
                  <Input
                    placeholder="Nhập SĐT hoặc Mã Serial..."
                    value={warrantyLookupKey}
                    onChange={(e) => setWarrantyLookupKey(e.target.value)}
                    className="w-[240px] text-xs font-mono"
                  />
                  <Button type="submit" size="sm">
                    <IconSearch className="h-4 w-4 mr-1" />
                    Tra Cứu
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Phiếu</TableHead>
                      <TableHead>Sản Phẩm</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Khách Hàng</TableHead>
                      <TableHead>Số Điện Thoại</TableHead>
                      <TableHead className="text-center">Thời Hạn</TableHead>
                      <TableHead className="text-center">Trạng Thái</TableHead>
                      <TableHead className="text-right">Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warranties.map((w) => {
                      const isExpired = new Date(w.ngay_het_han) < new Date();

                      return (
                        <TableRow key={w._id}>
                          <TableCell className="font-mono font-bold text-primary">{w.ma_bao_hanh}</TableCell>
                          <TableCell className="font-medium max-w-[180px] truncate">{w.ten_sp}</TableCell>
                          <TableCell className="font-mono text-xs">{w.serial_number}</TableCell>
                          <TableCell>{w.khach_hang_ten}</TableCell>
                          <TableCell className="font-mono text-xs">{w.so_dien_thoai}</TableCell>
                          <TableCell className="text-center text-xs">
                            {w.thoi_han_thang} tháng
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={!isExpired ? "outline" : "destructive"}
                              className={!isExpired ? "bg-emerald-50 text-emerald-700 border-emerald-300" : ""}
                            >
                              {!isExpired ? "Còn Bảo Hành" : "Hết Hạn"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                setSelectedWarranty(w);
                                setOpenMaintenanceModal(true);
                              }}
                            >
                              <IconTool className="h-3.5 w-3.5 mr-1" />
                              Bảo Trì ({w.lich_su_bao_tri?.length || 0})
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {warranties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Chưa có phiếu bảo hành nào. Nhấn "Tạo Phiếu Bảo Hành" để kích hoạt!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL TẠO HỢP ĐỒNG ─── */}
      <Dialog open={openCreateContract} onOpenChange={setOpenCreateContract}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo Hợp Đồng Kinh Tế B2B Mới</DialogTitle>
            <DialogDescription>
              Hệ thống sẽ tự động tạo 3 đợt thanh toán (Tạm ứng 30%, Giao hàng 50%, Quyết toán 20%).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Tên Hợp Đồng:</Label>
              <Input
                value={contractForm.ten_hop_dong}
                onChange={(e) => setContractForm({ ...contractForm, ten_hop_dong: e.target.value })}
                placeholder="VD: Cung cấp nội thất gỗ văn phòng BIDV"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tên Khách Hàng / Đối Tác:</Label>
              <Input
                value={contractForm.partner_name}
                onChange={(e) => setContractForm({ ...contractForm, partner_name: e.target.value })}
                placeholder="VD: Công ty CP Bất Động Sản Cenland"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Giá Trị Hợp Đồng (VNĐ):</Label>
              <Input
                type="number"
                value={contractForm.gia_tri_hop_dong}
                onChange={(e) => setContractForm({ ...contractForm, gia_tri_hop_dong: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenCreateContract(false)}>Hủy</Button>
            <Button size="sm" onClick={handleCreateContract}>Tạo Hợp Đồng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL CHI TIẾT ĐỢT THANH TOÁN HỢP ĐỒNG ─── */}
      <Dialog open={Boolean(selectedContract)} onOpenChange={(open) => !open && setSelectedContract(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tiến Độ Thanh Toán: {selectedContract?.ma_hop_dong}</DialogTitle>
            <DialogDescription>{selectedContract?.ten_hop_dong}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              {(selectedContract?.dot_thanh_toan || []).map((dot, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{dot.ten_dot}</div>
                    <div className="text-emerald-700 font-bold mt-0.5">
                      {formatVND(dot.so_tien)} ({dot.ty_le}%)
                    </div>
                    {dot.ma_phieu_thu && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Phiếu thu: <b>{dot.ma_phieu_thu}</b>
                      </div>
                    )}
                  </div>
                  <div>
                    {dot.trang_thai === "paid" ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                        <IconCheck className="h-3 w-3 mr-1" /> Đã Thu
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handlePayMilestone(selectedContract!._id, idx)}
                      >
                        <IconCreditCard className="h-3.5 w-3.5 mr-1" />
                        Thu Tiền Đợt Này
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedContract(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL TẠO PHIẾU BẢO HÀNH ─── */}
      <Dialog open={openCreateWarranty} onOpenChange={setOpenCreateWarranty}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kích Hoạt Bảo Hành Điện Tử Mới</DialogTitle>
            <DialogDescription>Tạo hồ sơ bảo hành kèm mã Serial Number truy vết.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Tên Sản Phẩm:</Label>
              <Input
                value={warrantyForm.ten_sp}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, ten_sp: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mã Serial Number:</Label>
              <Input
                value={warrantyForm.serial_number}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, serial_number: e.target.value })}
                className="font-mono text-xs uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tên Khách Hàng:</Label>
              <Input
                value={warrantyForm.khach_hang_ten}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, khach_hang_ten: e.target.value })}
                placeholder="VD: Hoàng Tuấn Anh"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Số Điện Thoại:</Label>
              <Input
                value={warrantyForm.so_dien_thoai}
                onChange={(e) => setWarrantyForm({ ...warrantyForm, so_dien_thoai: e.target.value })}
                placeholder="VD: 0912345678"
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenCreateWarranty(false)}>Hủy</Button>
            <Button size="sm" onClick={handleCreateWarranty}>Kích Hoạt Bảo Hành</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL LỊCH SỬ BẢO DƯỠNG / SỬA CHỮA ─── */}
      <Dialog open={openMaintenanceModal} onOpenChange={setOpenMaintenanceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconTool className="h-5 w-5 text-primary" />
              Lịch Sử Bảo Dưỡng: {selectedWarranty?.ma_bao_hanh}
            </DialogTitle>
            <DialogDescription>
              {selectedWarranty?.ten_sp} — KH: {selectedWarranty?.khach_hang_ten} ({selectedWarranty?.so_dien_thoai})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Lịch sử cũ */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto border rounded p-2">
              {(selectedWarranty?.lich_su_bao_tri || []).map((t, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded border text-xs">
                  <div className="flex justify-between font-medium">
                    <span>{t.noi_dung}</span>
                    <span className="text-muted-foreground">{new Date(t.ngay).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Kỹ thuật: {t.ky_thuat_vien} | Chi phí: {formatVND(t.chi_phi)}
                  </div>
                </div>
              ))}
              {(selectedWarranty?.lich_su_bao_tri || []).length === 0 && (
                <div className="text-center py-4 text-muted-foreground italic">
                  Chưa có lần bảo dưỡng nào được ghi nhận.
                </div>
              )}
            </div>

            {/* Form ghi nhận thêm */}
            <div className="space-y-2 border-t pt-3">
              <div className="font-semibold text-slate-800">Ghi nhận lần bảo dưỡng mới:</div>
              <div className="space-y-1">
                <Label className="text-xs">Nội dung công việc:</Label>
                <Input
                  value={maintenanceForm.noi_dung}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, noi_dung: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Kỹ thuật viên:</Label>
                  <Input
                    value={maintenanceForm.ky_thuat_vien}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, ky_thuat_vien: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Chi phí phát sinh (nếu có):</Label>
                  <Input
                    type="number"
                    value={maintenanceForm.chi_phi}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, chi_phi: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenMaintenanceModal(false)}>Đóng</Button>
            <Button size="sm" onClick={handleAddMaintenance}>Lưu Nhật Ký</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
