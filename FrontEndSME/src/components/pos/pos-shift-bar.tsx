"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconCashRegister, IconDoorEnter, IconDoorExit, IconHistory } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchActivePosShiftAction,
  openPosShiftAction,
  closePosShiftAction,
  fetchPosShiftHistoryAction,
  type PosShiftItem,
} from "@/app/actions/pos-shift";

const fmtVnd = (n: number) => `${Math.round(n || 0).toLocaleString("vi-VN")} đ`;

export function PosShiftBar({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [activeShift, setActiveShift] = useState<PosShiftItem | null>(null);
  const [history, setHistory] = useState<PosShiftItem[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);

  const [openingCash, setOpeningCash] = useState("1000000");
  const [registerName, setRegisterName] = useState("Quầy POS #1");
  const [openingNotes, setOpeningNotes] = useState("");

  const [actualCash, setActualCash] = useState("0");
  const [closingNotes, setClosingNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const loadActive = async () => {
    const res = await fetchActivePosShiftAction();
    if (res.success) {
      setActiveShift(res.data || null);
      if (res.data?.summary) {
        setActualCash(String(res.data.summary.expected_cash || 0));
      }
    }
  };

  useEffect(() => {
    loadActive();
  }, [refreshTrigger]);

  const handleOpenShift = async () => {
    setBusy(true);
    const res = await openPosShiftAction({
      opening_cash: Number(openingCash) || 0,
      register_name: registerName,
      notes: openingNotes,
    });
    if (res.success && res.data) {
      setActiveShift(res.data);
      setOpenDialog(false);
      toast.success(`Đã mở ca thu ngân ${res.data.ma_ca}`);
    } else {
      toast.error(res.error || "Mở ca thất bại");
    }
    setBusy(false);
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    setBusy(true);
    const res = await closePosShiftAction(activeShift._id, {
      actual_cash: Number(actualCash) || 0,
      notes: closingNotes,
    });
    if (res.success && res.data) {
      const variance = res.data.summary?.variance || 0;
      toast.success(
        `Đã kết ca ${res.data.ma_ca} — Chênh lệch quỹ: ${variance === 0 ? "Khớp 100%" : fmtVnd(variance)}`
      );
      setActiveShift(null);
      setCloseDialog(false);
      setClosingNotes("");
    } else {
      toast.error(res.error || "Kết ca thất bại");
    }
    setBusy(false);
  };

  const openHistory = async () => {
    setHistoryDialog(true);
    const res = await fetchPosShiftHistoryAction(20);
    if (res.success && res.items) setHistory(res.items);
  };

  const expectedCash = activeShift?.summary?.expected_cash ?? 0;
  const previewVariance = (Number(actualCash) || 0) - expectedCash;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-card text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <IconCashRegister className="size-4 text-primary" />
          {activeShift ? (
            <>
              <Badge variant="default" className="text-[11px]">
                Ca đang mở: {activeShift.ma_ca}
              </Badge>
              <span className="text-muted-foreground">
                Đầu ca: <b className="text-foreground">{fmtVnd(activeShift.summary.opening_cash)}</b>
              </span>
              <span className="text-muted-foreground">
                Đơn: <b className="text-foreground">{activeShift.summary.order_count}</b>
              </span>
              <span className="text-muted-foreground">
                Tiền mặt: <b className="text-emerald-600">{fmtVnd(activeShift.summary.cash_sales)}</b>
              </span>
              <span className="text-muted-foreground">
                CK/QR: <b className="text-blue-600">{fmtVnd(activeShift.summary.transfer_sales)}</b>
              </span>
              <span className="text-muted-foreground">
                Két lý thuyết: <b className="text-foreground">{fmtVnd(expectedCash)}</b>
              </span>
            </>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Chưa mở ca thu ngân — Mở ca để theo dõi kiểm quỹ cuối ngày.
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!activeShift ? (
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setOpenDialog(true)}>
              <IconDoorEnter className="size-3.5 mr-1" />
              Mở ca
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => {
                setActualCash(String(expectedCash));
                setCloseDialog(true);
              }}
            >
              <IconDoorExit className="size-3.5 mr-1" />
              Kết ca & Kiểm quỹ
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openHistory}>
            <IconHistory className="size-3.5 mr-1" />
            Lịch sử ca
          </Button>
        </div>
      </div>

      {/* Dialog Mở Ca */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mở Ca Thu Ngân POS</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Tên quầy</Label>
              <Input value={registerName} onChange={(e) => setRegisterName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tiền mặt quỹ đầu ca (VNĐ)</Label>
              <Input
                type="number"
                min={0}
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú nhận ca</Label>
              <Input
                placeholder="VD: Nhận bàn giao từ ca sáng..."
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Hủy</Button>
            <Button onClick={handleOpenShift} disabled={busy}>
              {busy ? "Đang mở..." : "Xác nhận mở ca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Kết Ca & Kiểm Quỹ */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kết Ca & Kiểm Quỹ ({activeShift?.ma_ca})</DialogTitle>
          </DialogHeader>
          {activeShift && (
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg border p-3 space-y-1.5 bg-muted/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiền đầu ca:</span>
                  <b>{fmtVnd(activeShift.summary.opening_cash)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thu tiền mặt ({activeShift.summary.order_count} đơn):</span>
                  <b className="text-emerald-600">+{fmtVnd(activeShift.summary.cash_sales)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thu chuyển khoản / VietQR:</span>
                  <b className="text-blue-600">{fmtVnd(activeShift.summary.transfer_sales)}</b>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="font-medium">Tiền mặt lý thuyết trong két:</span>
                  <b className="text-base">{fmtVnd(expectedCash)}</b>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tiền mặt thực kiểm cuối ca (VNĐ)</Label>
                <Input
                  type="number"
                  min={0}
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center text-sm px-3 py-2 rounded-md border">
                <span>Chênh lệch kiểm quỹ:</span>
                <b
                  className={
                    previewVariance === 0
                      ? "text-emerald-600"
                      : previewVariance > 0
                        ? "text-blue-600"
                        : "text-destructive"
                  }
                >
                  {previewVariance === 0
                    ? "Khớp 100% (0 đ)"
                    : `${previewVariance > 0 ? "+" : ""}${fmtVnd(previewVariance)}`}
                </b>
              </div>

              <div className="space-y-1.5">
                <Label>Ghi chú bàn giao ca</Label>
                <Input
                  placeholder="Giải trình chênh lệch (nếu có)..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleCloseShift} disabled={busy}>
              {busy ? "Đang chốt..." : "Xác nhận kết ca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Lịch sử ca */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lịch Sử Ca Thu Ngân POS</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã ca</TableHead>
                  <TableHead>Thu ngân</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tổng bán</TableHead>
                  <TableHead className="text-right">Két lý thuyết</TableHead>
                  <TableHead className="text-right">Thực kiểm</TableHead>
                  <TableHead className="text-right">Chênh lệch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-mono text-xs">{s.ma_ca}</TableCell>
                    <TableCell>{s.cashier_name}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "open" ? "default" : "secondary"}>
                        {s.status === "open" ? "Đang mở" : "Đã chốt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtVnd(s.summary.total_sales)}</TableCell>
                    <TableCell className="text-right">{fmtVnd(s.summary.expected_cash)}</TableCell>
                    <TableCell className="text-right">
                      {s.status === "closed" ? fmtVnd(s.actual_cash || 0) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {s.status === "closed" ? fmtVnd(s.summary.variance) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
