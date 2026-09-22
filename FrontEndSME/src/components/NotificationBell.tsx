"use client";

import { useState, useEffect } from "react";
import { IconBell, IconCheck, IconInbox } from "@tabler/icons-react";
import { useSocket, Notification } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_LABEL: Record<string, string> = {
  // Bán hàng (Sale & POS)
  SALE_CREATED: "Đơn bán hàng mới",
  SALE_COMPLETED: "Bán lẻ POS",
  SALE_STATUS_UPDATED: "Cập nhật đơn bán",
  SALE_DELETED: "Đã xóa đơn bán",
  DON_BAN_CREATED: "Đơn bán hàng mới",
  DON_BAN_STATUS_UPDATED: "Cập nhật đơn bán",
  DON_BAN_DELETED: "Đã xóa đơn bán",

  // Nhập mua vật tư (Purchase receipt)
  PURCHASE_RECEIPT_CREATED: "Đơn nhập mua mới",
  PURCHASE_RECEIPT_STATUS_UPDATED: "Cập nhật đơn nhập",
  PURCHASE_RECEIPT_DELETED: "Đã xóa đơn nhập",
  DON_NHAP_CREATED: "Đơn nhập mua mới",
  DON_NHAP_STATUS_UPDATED: "Cập nhật đơn nhập",
  DON_NHAP_DELETED: "Đã xóa đơn nhập",

  // Sản xuất & Nhập thành phẩm
  PROD_RECEIPT_CREATED: "Nhập kho thành phẩm",
  PROD_RECEIPT_STATUS_UPDATED: "Cập nhật nhập TP",
  PROD_RECEIPT_DELETED: "Đã xóa nhập TP",
  SX_CREATED: "Lệnh sản xuất mới",
  DON_SAN_XUAT_CREATED: "Lệnh sản xuất mới",
  DON_SAN_XUAT_STATUS_UPDATED: "Cập nhật lệnh SX",
  DON_SAN_XUAT_DELETED: "Đã xóa lệnh SX",

  // Điều chỉnh kho
  DCK_CREATED: "Phiếu điều chỉnh kho",
  DCK_APPROVED: "Phiếu kho đã duyệt",
  DCK_REJECTED: "Phiếu kho bị từ chối",

  // Khác
  DON_HANG_HARD_DELETED: "Xóa vĩnh viễn",
};

const TYPE_COLOR: Record<string, string> = {
  // Xanh lá (Sales & Approved)
  SALE_CREATED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  SALE_COMPLETED: "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400",
  SALE_STATUS_UPDATED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  DON_BAN_CREATED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  DON_BAN_STATUS_UPDATED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  DCK_APPROVED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",

  // Xanh dương (Purchases)
  PURCHASE_RECEIPT_CREATED: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  PURCHASE_RECEIPT_STATUS_UPDATED: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  DON_NHAP_CREATED: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  DON_NHAP_STATUS_UPDATED: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",

  // Tím (Production)
  PROD_RECEIPT_CREATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  PROD_RECEIPT_STATUS_UPDATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  SX_CREATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  DON_SAN_XUAT_CREATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  DON_SAN_XUAT_STATUS_UPDATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",

  // Cam / Vàng (Adjustments)
  DCK_CREATED: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",

  // Đỏ (Deleted / Rejected)
  DCK_REJECTED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  SALE_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  DON_BAN_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  PURCHASE_RECEIPT_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  DON_NHAP_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  PROD_RECEIPT_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  DON_SAN_XUAT_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  DON_HANG_HARD_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
};

function formatTime(dateStr?: string) {
  if (!dateStr) return "Vừa xong";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Vừa xong";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "Vừa xong";
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;

  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useSocket();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl hover:bg-accent/60 transition-colors"
          aria-label="Thông báo"
        >
          <IconBell className="size-4.5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs ring-2 ring-background animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-84 sm:w-92 p-0 rounded-2xl border border-border/70 shadow-xl bg-card/95 backdrop-blur-md overflow-hidden"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-foreground">
              Thông báo
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-medium px-2 py-0.2">
                {unreadCount} mới
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <IconCheck className="size-3.5" />
              <span>Đánh dấu tất cả đã đọc</span>
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                <IconInbox className="size-5" />
              </div>
              <p className="text-xs text-muted-foreground">
                Chưa có thông báo nào
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const label = TYPE_LABEL[n.type] || "Thông báo hệ thống";
              const colorClass =
                TYPE_COLOR[n.type] ||
                "bg-primary/10 border-primary/20 text-primary";
              const message =
                n.message || "Bạn có hoạt động mới trên hệ thống";

              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 transition-colors hover:bg-muted/40 relative ${
                    n.read ? "opacity-60 bg-transparent" : "bg-primary/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${colorClass}`}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground font-normal">
                    {message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

