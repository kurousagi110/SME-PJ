"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconBell, IconCheck, IconInbox, IconArrowRight } from "@tabler/icons-react";
import { useSocket, Notification } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_LABEL: Record<string, string> = {
  SALE_CREATED: "Đơn bán hàng mới",
  SALE_COMPLETED: "Bán lẻ POS",
  SALE_STATUS_UPDATED: "Cập nhật đơn bán",
  SALE_DELETED: "Đã xóa đơn bán",
  DON_BAN_CREATED: "Đơn bán hàng mới",
  DON_BAN_STATUS_UPDATED: "Cập nhật đơn bán",
  DON_BAN_DELETED: "Đã xóa đơn bán",
  PURCHASE_RECEIPT_CREATED: "Đơn nhập mua mới",
  PURCHASE_RECEIPT_STATUS_UPDATED: "Cập nhật đơn nhập",
  PURCHASE_RECEIPT_DELETED: "Đã xóa đơn nhập",
  DON_NHAP_CREATED: "Đơn nhập mua mới",
  DON_NHAP_STATUS_UPDATED: "Cập nhật đơn nhập",
  DON_NHAP_DELETED: "Đã xóa đơn nhập",
  PROD_RECEIPT_CREATED: "Nhập kho thành phẩm",
  PROD_RECEIPT_STATUS_UPDATED: "Cập nhật nhập TP",
  PROD_RECEIPT_DELETED: "Đã xóa nhập TP",
  SX_CREATED: "Lệnh sản xuất mới",
  DON_SAN_XUAT_CREATED: "Lệnh sản xuất mới",
  DON_SAN_XUAT_STATUS_UPDATED: "Cập nhật lệnh SX",
  DON_SAN_XUAT_DELETED: "Đã xóa lệnh SX",
  PRODUCTION_STAGE_CHANGED: "Chuyển công đoạn SX",
  DCK_CREATED: "Phiếu điều chỉnh kho",
  DCK_APPROVED: "Phiếu kho đã duyệt",
  DCK_REJECTED: "Phiếu kho bị từ chối",
  DON_HANG_HARD_DELETED: "Xóa vĩnh viễn",
};

const TYPE_COLOR: Record<string, string> = {
  SALE_CREATED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  SALE_COMPLETED: "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400",
  SALE_STATUS_UPDATED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  DON_BAN_CREATED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  DON_BAN_STATUS_UPDATED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  DCK_APPROVED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  PURCHASE_RECEIPT_CREATED: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  PURCHASE_RECEIPT_STATUS_UPDATED: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  DON_NHAP_CREATED: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  DON_NHAP_STATUS_UPDATED: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  PROD_RECEIPT_CREATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  PROD_RECEIPT_STATUS_UPDATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  SX_CREATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  DON_SAN_XUAT_CREATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  DON_SAN_XUAT_STATUS_UPDATED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  PRODUCTION_STAGE_CHANGED: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  DCK_CREATED: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  DCK_REJECTED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  SALE_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  DON_BAN_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  PURCHASE_RECEIPT_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  DON_NHAP_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  PROD_RECEIPT_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  DON_SAN_XUAT_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  DON_HANG_HARD_DELETED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
};

function resolveNotificationRoute(n: Notification): string {
  const t = String(n.type || "").toUpperCase();
  if (n.data?.url && typeof n.data.url === "string") return n.data.url;
  if (t.includes("DCK")) return "/stock-adjustments";
  if (t.includes("PURCHASE") || t.includes("DON_NHAP")) return "/material/orders";
  if (t.includes("PROD") || t.includes("SX")) return "/product/orders";
  if (t.includes("SALE") || t.includes("DON_BAN")) return "/sales";
  if (t.includes("RMA") || t.includes("RETURN")) return "/returns";
  if (t.includes("CONTRACT")) return "/contracts";
  if (t.includes("PAYROLL") || t.includes("LUONG")) return "/payroll";
  if (t.includes("APPROV") || t.includes("CREATED")) return "/approvals";
  return "/dashboard";
}

function isApprovalNotification(n: Notification): boolean {
  const t = String(n.type || "").toUpperCase();
  return (
    t.includes("CREATED") ||
    t.includes("APPROV") ||
    t.includes("DCK_CREATED") ||
    t.includes("RMA")
  );
}

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

type FilterTab = "all" | "unread" | "approvals";

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } = useSocket();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredNotifications = useMemo(() => {
    if (filterTab === "unread") return notifications.filter((n) => !n.read);
    if (filterTab === "approvals") return notifications.filter(isApprovalNotification);
    return notifications;
  }, [notifications, filterTab]);

  const handleItemClick = (n: Notification) => {
    if (!n.read) {
      markRead(n.id);
    }
    const target = resolveNotificationRoute(n);
    setOpen(false);
    router.push(target);
  };

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
        className="w-84 sm:w-96 p-0 rounded-2xl border border-border/70 shadow-xl bg-card/95 backdrop-blur-md overflow-hidden"
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
              <span>Đọc tất cả</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border/40 bg-muted/15">
          {[
            { key: "all" as const, label: `Tất cả (${notifications.length})` },
            { key: "unread" as const, label: `Chưa đọc (${unreadCount})` },
            { key: "approvals" as const, label: "Cần chú ý" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filterTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
          {filteredNotifications.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                <IconInbox className="size-5" />
              </div>
              <p className="text-xs text-muted-foreground">
                Không có thông báo nào trong mục này
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const label = TYPE_LABEL[n.type] || "Thông báo hệ thống";
              const colorClass =
                TYPE_COLOR[n.type] ||
                "bg-primary/10 border-primary/20 text-primary";
              const message =
                n.message || "Bạn có hoạt động mới trên hệ thống";

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 relative group ${
                    n.read ? "opacity-65 bg-transparent" : "bg-primary/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${colorClass}`}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap flex items-center gap-1">
                      {!n.read && <span className="size-1.5 rounded-full bg-rose-500 inline-block" />}
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs leading-relaxed text-foreground font-normal">
                      {message}
                    </p>
                    <IconArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
