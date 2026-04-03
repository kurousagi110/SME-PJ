"use client";

import { useState, useEffect } from "react";
import { IconBell } from "@tabler/icons-react";
import { useSocket, Notification } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_LABEL: Record<Notification["type"], string> = {
  DCK_CREATED: "Phiếu điều chỉnh mới",
  DCK_APPROVED: "Phiếu đã duyệt",
  DCK_REJECTED: "Phiếu bị từ chối",
  DON_NHAP_CREATED: "Đơn nhập hàng mới",
  DON_NHAP_STATUS_UPDATED: "Cập nhật trạng thái đơn nhập",
  DON_NHAP_DELETED: "Đã xóa đơn nhập hàng",
  DON_SAN_XUAT_CREATED: "Lệnh sản xuất mới",
  DON_SAN_XUAT_STATUS_UPDATED: "Cập nhật trạng thái lệnh sản xuất",
  DON_SAN_XUAT_DELETED: "Đã xóa lệnh sản xuất",
  DON_BAN_CREATED: "Đơn bán hàng mới",
  DON_BAN_STATUS_UPDATED: "Cập nhật trạng thái đơn bán",
  DON_BAN_DELETED: "Đã xóa đơn bán hàng",
};

const TYPE_COLOR: Record<Notification["type"], string> = {
  DCK_CREATED: "bg-yellow-100 border-yellow-300 text-yellow-800",
  DCK_APPROVED: "bg-green-100 border-green-300 text-green-800",
  DCK_REJECTED: "bg-red-100 border-red-300 text-red-800",
  DON_NHAP_CREATED: "bg-blue-100 border-blue-300 text-blue-800",
  DON_NHAP_STATUS_UPDATED: "bg-blue-100 border-blue-300 text-blue-800",
  DON_NHAP_DELETED: "bg-red-100 border-red-300 text-red-800",
  DON_SAN_XUAT_CREATED: "bg-purple-100 border-purple-300 text-purple-800",
  DON_SAN_XUAT_STATUS_UPDATED: "bg-purple-100 border-purple-300 text-purple-800",
  DON_SAN_XUAT_DELETED: "bg-red-100 border-red-300 text-red-800",
  DON_BAN_CREATED: "bg-green-100 border-green-300 text-green-800",
  DON_BAN_STATUS_UPDATED: "bg-green-100 border-green-300 text-green-800",
  DON_BAN_DELETED: "bg-red-100 border-red-300 text-red-800",
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
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
          className="relative"
          aria-label="Thông báo"
        >
          <IconBell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-semibold text-sm">Thông báo</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-blue-600 hover:underline"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Không có thông báo nào
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`border-b px-4 py-3 transition-colors ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                <div
                  className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold mb-1 ${TYPE_COLOR[n.type]}`}
                >
                  {TYPE_LABEL[n.type]}
                </div>
                <p className="text-sm leading-snug">{n.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatTime(n.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
