"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  IconQrcode,
  IconCopy,
  IconCheck,
  IconBuildingBank,
  IconAlertCircle,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VietQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderCode: string;
  amount: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  onSuccess?: () => void;
}

export function VietQRDialog({
  open,
  onOpenChange,
  orderCode,
  amount,
  bankName = "MBBank (Ngân hàng Quân Đội)",
  accountNumber = "0987654321",
  accountName = "CONG TY TNHH SME ERP",
  onSuccess,
}: VietQRDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // Sinh link ảnh VietQR Napas 247 chính xác
  const qrUrl = `https://img.vietqr.io/image/970422-${accountNumber}-compact2.png?amount=${Math.round(
    amount
  )}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(
    accountName
  )}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-center sm:text-center">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 text-primary">
            <IconQrcode className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Thanh Toán Chuyển Khoản VietQR</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử bất kỳ (Napas 247)
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-2 space-y-4">
          {/* Ảnh mã QR */}
          <div className="relative p-2 bg-white rounded-xl shadow-md border border-slate-200">
            {amount > 0 ? (
              <img
                src={qrUrl}
                alt="Mã QR Napas 247"
                className="w-56 h-auto object-contain mx-auto rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-muted-foreground text-xs">
                Chưa có số tiền hợp lệ
              </div>
            )}
          </div>

          <Badge variant="outline" className="gap-1.5 text-xs font-semibold py-1 px-3 border-emerald-500/40 text-emerald-700 bg-emerald-50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tự động xác nhận khi nhận tiền
          </Badge>

          {/* Chi tiết thông tin chuyển khoản */}
          <div className="w-full space-y-2 bg-muted/40 p-3 rounded-lg text-xs">
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-1">
                <IconBuildingBank className="h-3.5 w-3.5" /> Ngân hàng:
              </span>
              <span className="font-semibold text-foreground">{bankName}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Chủ tài khoản:</span>
              <span className="font-semibold uppercase text-foreground">{accountName}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Số tài khoản:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground">{accountNumber}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(accountNumber, "số tài khoản")}
                  className="hover:text-primary p-0.5"
                >
                  {copied === "số tài khoản" ? (
                    <IconCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <IconCopy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground">Số tiền:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-primary text-sm">
                  {amount.toLocaleString("vi-VN")} đ
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(amount), "số tiền")}
                  className="hover:text-primary p-0.5"
                >
                  {copied === "số tiền" ? (
                    <IconCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <IconCopy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground font-medium">Nội dung CK:</span>
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-200">
                <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                  {orderCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(orderCode, "nội dung chuyển khoản")}
                  className="hover:text-primary p-0.5"
                >
                  {copied === "nội dung chuyển khoản" ? (
                    <IconCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <IconCopy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          <Button
            className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            onClick={() => {
              if (onSuccess) onSuccess();
              onOpenChange(false);
            }}
          >
            <IconCheck className="h-4 w-4" /> Đã nhận tiền thành công
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
