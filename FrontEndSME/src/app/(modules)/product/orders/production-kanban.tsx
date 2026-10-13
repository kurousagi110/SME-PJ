"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  IconArrowRight,
  IconBarcode,
  IconCheck,
  IconClock,
  IconAlertTriangle,
  IconRefresh,
  IconFlame,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  fetchKanbanAction,
  updateProductionStageAction,
  fetchScrapReportAction,
  type KanbanOrder,
  type KanbanBoardResponse,
} from "@/app/actions/production";
import { formatVND } from "@/utils/format";

const STAGE_CONFIG: Record<string, { title: string; color: string; badgeClass: string }> = {
  pending: {
    title: "1. Chờ Lên Chuyền",
    color: "bg-slate-100 border-slate-300",
    badgeClass: "bg-slate-200 text-slate-800",
  },
  raw_material_prep: {
    title: "2. Chuẩn Bị NVL",
    color: "bg-amber-50/60 border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  machining: {
    title: "3. Gia Công Cắt / CNC",
    color: "bg-blue-50/60 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  finishing: {
    title: "4. Hoàn Thiện / Sơn Phủ",
    color: "bg-purple-50/60 border-purple-200",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
  },
  assembly_qc: {
    title: "5. Lắp Ráp & QC",
    color: "bg-indigo-50/60 border-indigo-200",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  completed: {
    title: "6. Hoàn Tất / Nhập Kho",
    color: "bg-emerald-50/60 border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
};

const STAGE_KEYS = [
  "pending",
  "raw_material_prep",
  "machining",
  "finishing",
  "assembly_qc",
  "completed",
];

export default function ProductionKanban() {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [boardData, setBoardData] = React.useState<KanbanBoardResponse | null>(null);
  const [scrapData, setScrapData] = React.useState<any>(null);
  const [barcodeInput, setBarcodeInput] = React.useState<string>("");

  // Modal báo phế phẩm
  const [selectedOrder, setSelectedOrder] = React.useState<KanbanOrder | null>(null);
  const [openScrapModal, setOpenScrapModal] = React.useState<boolean>(false);
  const [scrapQty, setScrapQty] = React.useState<number>(1);
  const [scrapReason, setScrapReason] = React.useState<string>("Lỗi phôi gỗ / gãy cạnh");
  const [submittingScrap, setSubmittingScrap] = React.useState<boolean>(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, sRes] = await Promise.all([
        fetchKanbanAction(),
        fetchScrapReportAction(),
      ]);
      if (kRes.success && kRes.data) setBoardData(kRes.data);
      if (sRes.success && sRes.data) setScrapData(sRes.data);
    } catch {
      toast.error("Không thể tải bảng Kanban sản xuất");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Chuyển sang công đoạn tiếp theo
  const handleAdvanceStage = async (order: KanbanOrder) => {
    const curIdx = STAGE_KEYS.indexOf(order.cong_doan_hien_tai || "pending");
    if (curIdx < 0 || curIdx >= STAGE_KEYS.length - 1) {
      toast.info("Lệnh sản xuất đã ở công đoạn hoàn tất cuối cùng");
      return;
    }

    const nextStage = STAGE_KEYS[curIdx + 1];
    try {
      const res = await updateProductionStageAction(order._id, { stage: nextStage });
      if (res.success) {
        toast.success(`Đã chuyển đơn ${order.ma_dh} sang: ${STAGE_CONFIG[nextStage]?.title}`);
        loadData();
      } else {
        toast.error(res.error || "Chuyển bước thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối khi cập nhật tiến độ");
    }
  };

  // Quét mã vạch nhanh để chuyển công đoạn
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim().toUpperCase();
    if (!code) return;

    if (!boardData) return;
    let found: KanbanOrder | null = null;
    for (const stg of STAGE_KEYS) {
      const list = boardData.columns[stg as keyof typeof boardData.columns] || [];
      const match = list.find((o) => o.ma_dh?.toUpperCase() === code);
      if (match) {
        found = match;
        break;
      }
    }

    if (!found) {
      toast.error(`Không tìm thấy lệnh sản xuất có mã: ${code}`);
      return;
    }

    handleAdvanceStage(found);
    setBarcodeInput("");
  };

  // Lưu báo phế phẩm
  const handleSaveScrap = async () => {
    if (!selectedOrder) return;
    setSubmittingScrap(true);
    try {
      const res = await updateProductionStageAction(selectedOrder._id, {
        stage: selectedOrder.cong_doan_hien_tai || "machining",
        scrap_qty: scrapQty,
        scrap_reason: scrapReason,
      });
      if (res.success) {
        toast.success(`Đã ghi nhận ${scrapQty} phế phẩm cho đơn ${selectedOrder.ma_dh}`);
        setOpenScrapModal(false);
        loadData();
      } else {
        toast.error(res.error || "Ghi nhận thất bại");
      }
    } catch {
      toast.error("Lỗi mạng khi lưu phế phẩm");
    } finally {
      setSubmittingScrap(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Stats & Barcode Scanner Bar ─── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <IconTrendingUp className="h-4 w-4 text-emerald-600" />
              Tỷ Lệ Thành Phẩm (Yield Rate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {scrapData?.yieldRate ?? 100}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {scrapData?.totalProduced ?? 0} SP đạt tiêu chuẩn QC
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <IconFlame className="h-4 w-4 text-amber-600" />
              Tỷ Lệ Hao Hụt (Scrap Rate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {scrapData?.scrapRate ?? 0}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {scrapData?.totalScrap ?? 0} phôi lỗi / hao hụt
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <IconBarcode className="h-4 w-4 text-primary" />
              Quét Mã Vạch Lệnh SX Chuyển Bước Tức Thì
            </CardTitle>
            <CardDescription className="text-[11px]">
              Dùng máy quét USB hoặc nhập mã lệnh (VD: TP-20261008-EK1Y) rồi nhấn Enter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <Input
                placeholder="Quét mã vạch tại đây..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="font-mono text-sm uppercase bg-slate-50"
              />
              <Button type="submit" size="sm" className="shrink-0">
                <IconCheck className="h-4 w-4 mr-1" />
                Chuyển Bước
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={loadData}>
                <IconRefresh className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ─── 6 CỘT KANBAN CÔNG ĐOẠN ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 min-h-[500px]">
        {STAGE_KEYS.map((stageKey) => {
          const cfg = STAGE_CONFIG[stageKey];
          const orders = boardData?.columns[stageKey as keyof typeof boardData.columns] || [];

          return (
            <div
              key={stageKey}
              className={`rounded-xl border p-2.5 flex flex-col gap-2.5 ${cfg.color}`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold truncate">{cfg.title}</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                  {orders.length}
                </Badge>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[620px] pr-0.5">
                {orders.map((o) => {
                  const sp = o.san_pham?.[0];
                  const isDone = stageKey === "completed";

                  return (
                    <div
                      key={o._id}
                      className="bg-white rounded-lg p-2.5 shadow-xs border border-slate-200/80 hover:shadow-md transition-shadow space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-primary truncate max-w-[100px]">
                          {o.ma_dh}
                        </span>
                        {o.tong_phe_pham ? (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">
                            -{o.tong_phe_pham} lỗi
                          </Badge>
                        ) : null}
                      </div>

                      <div>
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {sp?.ten_sp || "Sản phẩm xưởng"}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Số lượng: <b className="text-slate-900">{sp?.so_luong || 1}</b> {sp?.don_vi || "cái"}
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-1 border-t border-slate-100">
                        {!isDone ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] px-1.5 text-amber-700 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedOrder(o);
                              setOpenScrapModal(true);
                            }}
                          >
                            <IconAlertTriangle className="h-3 w-3 mr-0.5" />
                            Báo Lỗi
                          </Button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center">
                            <IconCheck className="h-3 w-3 mr-0.5" /> Đã xong
                          </span>
                        )}

                        {!isDone && (
                          <Button
                            size="sm"
                            className="h-7 text-[10px] px-2 ml-auto bg-slate-900 hover:bg-slate-800 text-white"
                            onClick={() => handleAdvanceStage(o)}
                          >
                            Tiếp <IconArrowRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {orders.length === 0 && (
                  <div className="text-center py-8 text-[11px] text-muted-foreground/60 italic">
                    Trống
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── MODAL BÁO PHẾ PHẨM / HAO HỤT ─── */}
      <Dialog open={openScrapModal} onOpenChange={setOpenScrapModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-red-600">
              <IconAlertTriangle className="h-5 w-5" />
              Ghi Nhận Phế Phẩm / Hao Hụt Xưởng
            </DialogTitle>
            <DialogDescription>
              Đơn hàng: <b>{selectedOrder?.ma_dh}</b> — Công đoạn: <b>{STAGE_CONFIG[selectedOrder?.cong_doan_hien_tai || "pending"]?.title}</b>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Số lượng phế phẩm phát sinh (Cái / Tấm):</Label>
              <Input
                type="number"
                min={1}
                value={scrapQty}
                onChange={(e) => setScrapQty(Number(e.target.value) || 1)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nguyên nhân lỗi / hư hỏng:</Label>
              <Input
                value={scrapReason}
                onChange={(e) => setScrapReason(e.target.value)}
                placeholder="VD: Phôi gỗ bị cong vênh, thợ cắt lệch cạnh, sơn bọt khí..."
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenScrapModal(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={submittingScrap}
              onClick={handleSaveScrap}
            >
              {submittingScrap ? "Đang lưu..." : "Xác Nhận Trừ Phế Phẩm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
