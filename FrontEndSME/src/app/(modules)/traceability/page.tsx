"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconScan,
  IconSearch,
  IconRefresh,
  IconCheck,
  IconClock,
  IconFileCertificate,
  IconLayersLinked,
  IconBoxSeam,
  IconWood,
  IconCurrencyDong,
  IconPrinter,
  IconBarcode,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  fetchLotsAction,
  fetchLotDetailAction,
  ProductionLot,
} from "@/app/actions/traceability";

function toVND(amount: number) {
  return Number(amount || 0).toLocaleString("vi-VN") + " đ";
}

export default function TraceabilityPage() {
  const [loading, setLoading] = React.useState(false);
  const [lots, setLots] = React.useState<ProductionLot[]>([]);
  const [search, setSearch] = React.useState("");

  // Modal Chi Tiết Phả Hệ Lô Hàng
  const [selectedLot, setSelectedLot] = React.useState<ProductionLot | null>(null);
  const [openDetail, setOpenDetail] = React.useState(false);

  const loadLots = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLotsAction({ search: search.trim() || undefined });
      if (res.success && res.data) {
        setLots(res.data);
      } else {
        toast.error(res.error || "Không thể tải danh sách lô");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tải danh sách lô");
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    loadLots();
  }, [loadLots]);

  const handleInspectLot = (lot: ProductionLot) => {
    setSelectedLot(lot);
    setOpenDetail(true);
  };

  const handlePrintLotLabel = () => {
    if (!selectedLot) return;
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <IconScan className="w-7 h-7 text-indigo-600" />
            Tra Cứu Truy Xuất Nguồn Gốc Lô Hàng (Lot Traceability)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Minh bạch chuỗi cung ứng: Truy vết thành phẩm ngược về lệnh sản xuất, cấu trúc BOM gốc và nguyên vật liệu đã xuất dùng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLots}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <IconRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Nhập mã lô (ví dụ: LOT-20260928-...), tên sản phẩm, mã SP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 text-xs w-full"
            />
          </div>
          <Button onClick={loadLots} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs">
            Tìm Kiếm Lô Hàng
          </Button>
        </CardContent>
      </Card>

      {/* Lot List Table */}
      <Card className="border shadow-sm bg-white">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <IconBoxSeam className="w-5 h-5 text-indigo-600" />
            Danh Sách Lô Sản Xuất & Kiểm Định Chất Lượng
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Số Lô (Lot Number)</TableHead>
                  <TableHead className="font-semibold text-xs">Sản Phẩm Thành Phẩm</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Số Lượng SX</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Giá Thành / SP</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Tổng Chi Phí SX</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Kiểm Định QC</TableHead>
                  <TableHead className="font-semibold text-xs">Thời Gian Sản Xuất</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Hành Động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                      Chưa có lô sản xuất nào được ghi nhận hoặc không khớp từ khóa tìm kiếm.
                    </TableCell>
                  </TableRow>
                ) : (
                  lots.map((lot) => (
                    <TableRow key={lot._id} className="hover:bg-slate-50">
                      <TableCell className="font-bold font-mono text-xs text-indigo-600">
                        {lot.ma_lo || "N/A"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-900">{lot.ten_sp || "Sản phẩm"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Mã: {lot.ma_sp || "-"}</div>
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-slate-800">
                        {lot.so_luong_sx} SP
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-700">
                        {toVND(lot.unit_cost)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-slate-900">
                        {toVND(lot.total_cost)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1 w-fit mx-auto">
                          <IconCheck className="w-3 h-3" /> QC Passed
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {new Date(lot.created_at).toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleInspectLot(lot)}
                          className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold"
                        >
                          Cây Phả Hệ Lô
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

      {/* Modal Truy Xuất Phả Hệ Nguồn Gốc Lô Hàng */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-full print:p-0">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <IconLayersLinked className="w-5 h-5 text-indigo-600" />
              Truy Xuất Phả Hệ Lô Hàng: {selectedLot?.ma_lo}
            </DialogTitle>
            <DialogDescription>
              Cấu trúc gia phả khép kín ghi nhận snapshot BOM và nguyên vật liệu thực tế khi sản xuất.
            </DialogDescription>
          </DialogHeader>

          {selectedLot && (
            <div className="space-y-4 py-2 text-xs">
              {/* Thẻ Lô Hàng (Printable Label) */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">MÃ LÔ SẢN XUẤT (LOT NO.)</div>
                    <div className="text-lg font-mono font-bold text-slate-900">{selectedLot.ma_lo}</div>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-bold text-xs">
                    QC PASSED ✓
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><strong>Thành phẩm:</strong> {selectedLot.ten_sp}</div>
                  <div><strong>Mã sản phẩm:</strong> {selectedLot.ma_sp}</div>
                  <div><strong>Số lượng sản xuất:</strong> {selectedLot.so_luong_sx}</div>
                  <div><strong>Ngày sản xuất:</strong> {new Date(selectedLot.created_at).toLocaleString("vi-VN")}</div>
                  <div><strong>Giá thành đơn vị:</strong> {toVND(selectedLot.unit_cost)}</div>
                  <div><strong>Tổng chi phí lô:</strong> {toVND(selectedLot.total_cost)}</div>
                </div>

                {selectedLot.ghi_chu && (
                  <div className="text-slate-500 italic">
                    Ghi chú lệnh: {selectedLot.ghi_chu}
                  </div>
                )}
              </div>

              {/* Phả Hệ Nguyên Liệu Tiêu Hao */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <IconWood className="w-4 h-4 text-amber-700" />
                  Nguyên Vật Liệu Tiêu Hao & Định Mức BOM Tại Thời Điểm SX
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="font-semibold text-[11px]">Nguyên Liệu ID</TableHead>
                        <TableHead className="font-semibold text-[11px] text-center">SL Xuất Dùng</TableHead>
                        <TableHead className="font-semibold text-[11px] text-right">Đơn Giá NVL</TableHead>
                        <TableHead className="font-semibold text-[11px] text-right">Thành Tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!selectedLot.nguyen_lieu_used || selectedLot.nguyen_lieu_used.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-slate-400">
                            Không có chi tiết nguyên liệu
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedLot.nguyen_lieu_used.map((nl, idx) => {
                          const cost = (nl.qty_need || 0) * (nl.don_gia || 0);
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-[11px]">
                                {String(nl.nguyen_lieu_id)}
                              </TableCell>
                              <TableCell className="text-center font-bold">
                                {nl.qty_need}
                              </TableCell>
                              <TableCell className="text-right">
                                {toVND(nl.don_gia)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-slate-800">
                                {toVND(cost)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* BOM Snapshot */}
              {selectedLot.bom_snapshot && selectedLot.bom_snapshot.length > 0 && (
                <div className="space-y-1">
                  <div className="font-bold text-slate-700">Snapshot Cấu Trúc BOM (Định Lượng 1 Đơn Vị SP):</div>
                  <div className="bg-slate-100 p-2.5 rounded text-[11px] font-mono space-y-1">
                    {selectedLot.bom_snapshot.map((b, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>Vật tư: {String(b.nguyen_lieu_id)}</span>
                        <span>Định mức: {b.so_luong} | Hao hụt: {(b.ty_le_hao_hut || 0) * 100}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setOpenDetail(false)}>
              Đóng
            </Button>
            <Button onClick={handlePrintLotLabel} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5">
              <IconPrinter className="w-4 h-4" /> In Tem Lô Hàng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
