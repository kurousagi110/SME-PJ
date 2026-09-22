"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { StockAlertBadge } from "@/components/stock-alert-badge";
import { CommandPalette } from "@/components/command-palette";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const [openCommand, setOpenCommand] = React.useState(false);
  const pathname = usePathname();

  const getBreadcrumbTitle = (path: string) => {
    if (path.startsWith("/dashboard")) return "Bảng Điều Khiển";
    if (path.startsWith("/pos")) return "Quầy Thu Ngân POS";
    if (path.startsWith("/sales")) return "Đơn Bán Hàng";
    if (path.startsWith("/shipping")) return "Vận Chuyển & Giao Hàng";
    if (path.startsWith("/partners")) return "Khách Hàng & Nhà Cung Cấp";
    if (path.startsWith("/barcode")) return "In Mã Vạch Tem";
    if (path.startsWith("/product/catalog")) return "Danh Mục Sản Phẩm";
    if (path.startsWith("/product/orders")) return "Lệnh Sản Xuất";
    if (path.startsWith("/material/catalog")) return "Danh Mục Vật Tư";
    if (path.startsWith("/material/orders")) return "Đơn Nhập Mua Hàng";
    if (path.startsWith("/warehouse")) return "Tồn Kho Tổng Hợp";
    if (path.startsWith("/dieu-chinh-kho")) return "Kiểm Kê Điều Chỉnh";
    if (path.startsWith("/cashbook")) return "Sổ Quỹ & Công Nợ";
    if (path.startsWith("/payroll")) return "Bảng Lương";
    if (path.startsWith("/check-in")) return "Chấm Công";
    if (path.startsWith("/staff")) return "Hồ Sơ Nhân Sự";
    if (path.startsWith("/department")) return "Phòng Ban & Chức Vụ";
    if (path.startsWith("/planning")) return "Demand Planning";
    if (path.startsWith("/import")) return "Nhập Dữ Liệu Excel";
    if (path.startsWith("/audit-log")) return "Nhật Ký Hệ Thống";
    if (path.startsWith("/account")) return "Tài Khoản";
    return "Hệ Thống";
  };

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/50 backdrop-blur-md bg-background/85 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 data-[orientation=vertical]:h-4 text-border/60"
        />

        {/* Current Module Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-foreground truncate">
            {getBreadcrumbTitle(pathname)}
          </span>
        </div>

        {/* Command palette search trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpenCommand(true)}
          className="hidden md:flex ml-3 h-8 w-60 items-center justify-between text-xs text-muted-foreground bg-muted/30 border-muted-foreground/20 hover:bg-muted/50 rounded-lg shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5 text-muted-foreground/70" />
            <span>Tìm kiếm nhanh...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Mobile search trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpenCommand(true)}
          className="md:hidden h-8 w-8 text-muted-foreground"
        >
          <Search className="size-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2.5">
          {/* Live system status pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium select-none">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Trực tuyến
          </div>

          {/* Cảnh báo tồn kho an toàn */}
          <StockAlertBadge />

          <Separator
            orientation="vertical"
            className="mx-0.5 h-4 data-[orientation=vertical]:h-4 text-border/60"
          />

          {/* Chuông thông báo Socket.io */}
          <NotificationBell />
        </div>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandPalette open={openCommand} onOpenChange={setOpenCommand} />
    </header>
  );
}
