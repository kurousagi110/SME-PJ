"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconBuildingWarehouse,
  IconArrowsExchange,
  IconPlus,
  IconRefresh,
  IconTruckDelivery,
  IconCheck,
  IconX,
  IconEdit,
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
import {
  fetchWarehousesAction,
  createWarehouseAction,
  fetchWarehouseStocksAction,
  syncInitialWarehouseStocksAction,
  updateStockBinAction,
  fetchStockTransfersAction,
  createStockTransferAction,
  dispatchStockTransferAction,
  receiveStockTransferAction,
  cancelStockTransferAction,
  type WarehouseItem,
  type WarehouseStockItem,
  type StockTransferItem,
} from "@/app/actions/warehouses";

const TRANSFER_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Nháp", variant: "outline" },
  in_transit: { label: "Đang vận chuyển", variant: "secondary" },
  received: { label: "Đã nhập kho đích", variant: "default" },
  cancelled: { label: "Đã hủy", variant: "destructive" },
};

export default function MultiWarehousePage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [stocks, setStocks] = useState<WarehouseStockItem[]>([]);
  const [transfers, setTransfers] = useState<StockTransferItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedWh, setSelectedWh] = useState<string>("ALL");
  const [stockQ, setStockQ] = useState("");

  // Create Warehouse Dialog
  const [whDialog, setWhDialog] = useState(false);
  const [whForm, setWhForm] = useState({ code: "", name: "", type: "general", address: "", manager_name: "" });

  // Edit Bin Dialog
  const [binTarget, setBinTarget] = useState<WarehouseStockItem | null>(null);
  const [binInput, setBinInput] = useState("");
  const [minStockInput, setMinStockInput] = useState(5);

  // Create Transfer Dialog
  const [transferDialog, setTransferDialog] = useState(false);
  const [fromWh, setFromWh] = useState("KHO-TONG");
  const [toWh, setToWh] = useState("KHO-SHOWROOM");
  const [selectedStockKey, setSelectedStockKey] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [transferNote, setTransferNote] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const [wRes, sRes, tRes] = await Promise.all([
      fetchWarehousesAction(),
      fetchWarehouseStocksAction({
        warehouseCode: selectedWh === "ALL" ? "" : selectedWh,
        q: stockQ,
      }),
      fetchStockTransfersAction(),
    ]);
    if (wRes.success && wRes.items) setWarehouses(wRes.items);
    if (sRes.success && sRes.items) setStocks(sRes.items);
    if (tRes.success && tRes.items) setTransfers(tRes.items);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWh]);

  const handleCreateWarehouse = async () => {
    if (!whForm.code.trim() || !whForm.name.trim()) {
      toast.error("Vui lòng nhập mã kho và tên kho");
      return;
    }
    const res = await createWarehouseAction({
      ...whForm,
      code: whForm.code.trim().toUpperCase(),
    });
    if (res.success) {
      toast.success(`Đã tạo kho ${whForm.code.trim().toUpperCase()}`);
      setWhDialog(false);
      setWhForm({ code: "", name: "", type: "general", address: "", manager_name: "" });
      loadAll();
    } else {
      toast.error(res.error || "Tạo kho thất bại");
    }
  };

  const handleSyncInitial = async () => {
    const res = await syncInitialWarehouseStocksAction();
    if (res.success) {
      toast.success(res.message || "Đã đồng bộ tồn kho ban đầu");
      loadAll();
    } else {
      toast.error(res.error || "Đồng bộ thất bại");
    }
  };

  const handleSaveBin = async () => {
    if (!binTarget) return;
    const res = await updateStockBinAction({
      warehouse_code: binTarget.warehouse_code,
      item_type: binTarget.item_type,
      item_id: binTarget.item_id,
      bin_location: binInput,
      min_stock: minStockInput,
    });
    if (res.success) {
      toast.success("Đã cập nhật vị trí kệ (Bin Location)");
      setBinTarget(null);
      loadAll();
    } else {
      toast.error(res.error || "Cập nhật thất bại");
    }
  };

  const sourceCandidates = stocks.filter((s) => s.warehouse_code === fromWh && s.so_luong > 0);

  const handleCreateTransfer = async () => {
    const chosen = sourceCandidates.find((s) => `${s.item_type}:${s.item_id}` === selectedStockKey);
    if (!chosen) {
      toast.error("Vui lòng chọn mặt hàng cần chuyển từ kho nguồn");
      return;
    }
    const res = await createStockTransferAction({
      from_warehouse: fromWh,
      to_warehouse: toWh,
      items: [
        {
          item_id: chosen.item_id,
          item_type: chosen.item_type,
          item_code: chosen.item_code,
          item_name: chosen.item_name,
          unit: chosen.unit,
          quantity: transferQty,
          from_bin: chosen.bin_location,
        },
      ],
      ghi_chu: transferNote,
    });
    if (res.success && res.data) {
      toast.success(`Đã tạo phiếu chuyển kho ${res.data.ma_phieu}`);
      setTransferDialog(false);
      setTransferNote("");
      setTransferQty(1);
      loadAll();
    } else {
      toast.error(res.error || "Tạo phiếu chuyển kho thất bại");
    }
  };

  const inTransitCount = transfers.filter((t) => t.trang_thai === "in_transit").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản Lý Đa Kho & Điều Chuyển Nội Bộ</h1>
          <p className="text-sm text-muted-foreground">
            Phân bổ tồn kho theo từng chi nhánh/xưởng, định vị kệ (Bin Location) và điều chuyển hàng hóa nội bộ có kiểm soát hao hụt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleSyncInitial}>
            <IconRefresh className="size-4 mr-1.5" />
            Đồng bộ danh mục
          </Button>
          <Button variant="outline" onClick={() => setWhDialog(true)}>
            <IconPlus className="size-4 mr-1.5" />
            Thêm Kho Mới
          </Button>
          <Button onClick={() => setTransferDialog(true)}>
            <IconArrowsExchange className="size-4 mr-1.5" />
            Tạo Phiếu Chuyển Kho
          </Button>
        </div>
      </div>

      {/* Thẻ tổng quan từng kho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {warehouses.map((w) => (
          <Card
            key={w._id}
            className={`cursor-pointer transition-colors ${selectedWh === w.code ? "border-primary ring-1 ring-primary" : ""}`}
            onClick={() => setSelectedWh(selectedWh === w.code ? "ALL" : w.code)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">{w.code}</Badge>
                <IconBuildingWarehouse className="size-4 text-primary" />
              </div>
              <CardTitle className="text-sm mt-1">{w.name}</CardTitle>
              <CardDescription className="text-xs truncate">{w.address || w.manager_name || "—"}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs flex items-center justify-between pt-0">
              <span><b>{w.sku_count ?? 0}</b> SKU</span>
              <span>Tồn: <b>{(w.total_qty ?? 0).toLocaleString("vi-VN")}</b></span>
              {(w.low_stock_count ?? 0) > 0 && (
                <Badge variant="destructive" className="text-[10px]">{w.low_stock_count} sắp hết</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="stocks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stocks">Tồn Kho & Vị Trí Kệ ({stocks.length})</TabsTrigger>
          <TabsTrigger value="transfers">
            Điều Chuyển Kho Nội Bộ ({transfers.length}{inTransitCount > 0 ? ` · ${inTransitCount} đang đi` : ""})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TỒN KHO & BIN LOCATION */}
        <TabsContent value="stocks">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Tồn Kho Phân Bổ {selectedWh !== "ALL" ? `— ${selectedWh}` : "(Tất cả kho)"}
                </CardTitle>
                <CardDescription>Click nút sửa để gán vị trí kệ (VD: A1-02) và tồn tối thiểu cho từng kho.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Tìm mã, tên, vị trí kệ..."
                  value={stockQ}
                  onChange={(e) => setStockQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadAll()}
                  className="w-56 h-8 text-xs"
                />
                <Button size="sm" variant="outline" className="h-8" onClick={loadAll}>Lọc</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kho</TableHead>
                    <TableHead>Vị trí kệ (Bin)</TableHead>
                    <TableHead>Mã hàng</TableHead>
                    <TableHead>Tên hàng hóa</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Tồn tại kho</TableHead>
                    <TableHead className="text-right">Ngưỡng tối thiểu</TableHead>
                    <TableHead className="text-right">Sửa Bin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{s.warehouse_code}</Badge></TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{s.bin_location || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{s.item_code}</TableCell>
                      <TableCell className="font-medium text-sm">{s.item_name}</TableCell>
                      <TableCell className="text-xs">{s.item_type === "nguyen_lieu" ? "NVL" : "Thành phẩm"}</TableCell>
                      <TableCell className="text-right font-bold">
                        {s.so_luong.toLocaleString("vi-VN")} {s.unit || ""}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{s.min_stock ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setBinTarget(s);
                            setBinInput(s.bin_location || "");
                            setMinStockInput(s.min_stock ?? 5);
                          }}
                        >
                          <IconEdit className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && stocks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Chưa có dữ liệu tồn kho phân bổ. Bấm &quot;Đồng bộ danh mục&quot; để khởi tạo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ĐIỀU CHUYỂN KHO */}
        <TabsContent value="transfers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Danh Sách Phiếu Điều Chuyển Kho Nội Bộ</CardTitle>
              <CardDescription>Quy trình: Nháp → Xuất chuyển (trừ kho nguồn) → Xác nhận nhập kho đích (cộng kho đích).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Tuyến điều chuyển</TableHead>
                    <TableHead>Mặt hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => {
                    const st = TRANSFER_BADGE[t.trang_thai] || TRANSFER_BADGE.draft;
                    return (
                      <TableRow key={t._id}>
                        <TableCell className="font-mono text-xs font-bold">{t.ma_phieu}</TableCell>
                        <TableCell className="text-xs font-medium">
                          <Badge variant="outline">{t.from_warehouse}</Badge> → <Badge variant="outline">{t.to_warehouse}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.items.map((it, idx) => (
                            <div key={idx}>
                              {it.item_name || it.item_code} × <b>{it.quantity}</b>
                              {it.loss_qty ? <span className="text-destructive ml-1">(hao hụt {it.loss_qty})</span> : null}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {t.trang_thai === "draft" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={async () => {
                                const res = await dispatchStockTransferAction(t._id);
                                if (res.success) {
                                  toast.success(`Đã xuất hàng cho phiếu ${t.ma_phieu}`);
                                  loadAll();
                                } else toast.error(res.error || "Xuất kho thất bại");
                              }}
                            >
                              <IconTruckDelivery className="size-3.5 mr-1" />
                              Xuất chuyển
                            </Button>
                          )}
                          {t.trang_thai === "in_transit" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={async () => {
                                const res = await receiveStockTransferAction(t._id);
                                if (res.success) {
                                  toast.success(`Đã nhập kho đích phiếu ${t.ma_phieu}`);
                                  loadAll();
                                } else toast.error(res.error || "Nhập kho thất bại");
                              }}
                            >
                              <IconCheck className="size-3.5 mr-1" />
                              Nhận hàng
                            </Button>
                          )}
                          {(t.trang_thai === "draft" || t.trang_thai === "in_transit") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive"
                              onClick={async () => {
                                const res = await cancelStockTransferAction(t._id, "Hủy bởi thủ kho");
                                if (res.success) {
                                  toast.success(`Đã hủy phiếu ${t.ma_phieu}`);
                                  loadAll();
                                } else toast.error(res.error || "Hủy thất bại");
                              }}
                            >
                              <IconX className="size-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && transfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Chưa có phiếu điều chuyển kho nội bộ nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Thêm Kho Mới */}
      <Dialog open={whDialog} onOpenChange={setWhDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm Kho / Chi Nhánh Mới</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mã kho *</Label>
                <Input placeholder="VD: KHO-HCM" value={whForm.code} onChange={(e) => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phân loại</Label>
                <Select value={whForm.type} onValueChange={(v) => setWhForm({ ...whForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finished_goods">Kho Thành phẩm</SelectItem>
                    <SelectItem value="raw_material">Kho NVL / Xưởng</SelectItem>
                    <SelectItem value="retail">Kho Cửa hàng / POS</SelectItem>
                    <SelectItem value="quarantine">Kho QC / Hàng lỗi</SelectItem>
                    <SelectItem value="general">Kho Tổng hợp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tên kho *</Label>
              <Input placeholder="VD: Kho Chi Nhánh TP.HCM" value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ</Label>
              <Input value={whForm.address} onChange={(e) => setWhForm({ ...whForm, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Người phụ trách</Label>
              <Input value={whForm.manager_name} onChange={(e) => setWhForm({ ...whForm, manager_name: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhDialog(false)}>Hủy</Button>
            <Button onClick={handleCreateWarehouse}>Tạo kho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Sửa Vị Trí Kệ (Bin) */}
      <Dialog open={!!binTarget} onOpenChange={(o) => !o && setBinTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cập Nhật Vị Trí Kệ — {binTarget?.item_code}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Mã kệ / Ô lưu trữ (Bin Location)</Label>
              <Input placeholder="VD: A1-02" value={binInput} onChange={(e) => setBinInput(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label>Mức tồn kho tối thiểu tại kho này</Label>
              <Input type="number" min={0} value={minStockInput} onChange={(e) => setMinStockInput(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBinTarget(null)}>Hủy</Button>
            <Button onClick={handleSaveBin}>Lưu vị trí</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tạo Phiếu Điều Chuyển Kho */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo Phiếu Điều Chuyển Kho Nội Bộ</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kho xuất</Label>
                <Select value={fromWh} onValueChange={(v) => { setFromWh(v); setSelectedStockKey(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.code} value={w.code}>{w.code} — {w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kho nhập</Label>
                <Select value={toWh} onValueChange={setToWh}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.code} value={w.code}>{w.code} — {w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Chọn mặt hàng tại {fromWh}</Label>
              <Select value={selectedStockKey} onValueChange={setSelectedStockKey}>
                <SelectTrigger><SelectValue placeholder="Chọn sản phẩm / vật tư..." /></SelectTrigger>
                <SelectContent>
                  {sourceCandidates.map((s) => (
                    <SelectItem key={`${s.item_type}:${s.item_id}`} value={`${s.item_type}:${s.item_id}`}>
                      {s.item_code} — {s.item_name} (Tồn: {s.so_luong})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Số lượng chuyển</Label>
              <Input type="number" min={1} value={transferQty} onChange={(e) => setTransferQty(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú vận chuyển</Label>
              <Input placeholder="VD: Bổ sung hàng cho Showroom..." value={transferNote} onChange={(e) => setTransferNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(false)}>Hủy</Button>
            <Button onClick={handleCreateTransfer}>Lập phiếu chuyển kho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
