"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconDashboard,
  IconPackage,
  IconPackages,
  IconListDetails,
  IconUsers,
  IconBriefcase,
  IconCalendar,
  IconWood,
  IconAdjustments,
  IconClipboardList,
  IconReportMoney,
  IconReceipt2,
  IconUsersGroup,
  IconShoppingCart,
  IconBarcode,
  IconFileSpreadsheet,
  IconTrendingUp,
  IconBrandShopee,
  IconPlus,
} from "@tabler/icons-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: controlledOpen, onOpenChange: setControlledOpen }: CommandPaletteProps = {}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const router = useRouter();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextValue = typeof value === "function" ? value(open) : value;
      if (setControlledOpen) {
        setControlledOpen(nextValue);
      } else {
        setInternalOpen(nextValue);
      }
    },
    [open, setControlledOpen]
  );

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Tìm nhanh tính năng, đơn hàng, kho, nhân sự... (Ctrl + K)" />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả phù hợp.</CommandEmpty>

        {/* 1. THAO TÁC NHANH */}
        <CommandGroup heading="⚡ Thao tác nhanh">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/pos"))}
            className="cursor-pointer"
          >
            <IconShoppingCart className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Mở quầy thu ngân POS bán hàng</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/sales"))}
            className="cursor-pointer"
          >
            <IconPlus className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Tạo đơn bán hàng mới</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/planning"))}
            className="cursor-pointer"
          >
            <IconBrandShopee className="mr-2 h-4 w-4 text-orange-600" />
            <span>Định giá khấu hao sàn TMĐT (Shopee / TikTok Shop)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/cashbook"))}
            className="cursor-pointer"
          >
            <IconReceipt2 className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Lập Phiếu Thu / Phiếu Chi Sổ Quỹ</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/barcode"))}
            className="cursor-pointer"
          >
            <IconBarcode className="mr-2 h-4 w-4 text-sky-600" />
            <span>In tem mã vạch sản phẩm (Barcode Code128)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/check-in"))}
            className="cursor-pointer"
          >
            <IconCalendar className="mr-2 h-4 w-4 text-blue-600" />
            <span>Ghi nhận chấm công hôm nay</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dieu-chinh-kho"))}
            className="cursor-pointer"
          >
            <IconAdjustments className="mr-2 h-4 w-4 text-amber-600" />
            <span>Tạo phiếu kiểm kê điều chỉnh kho</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 2. TỔNG QUAN & KẾ HOẠCH */}
        <CommandGroup heading="📊 Tổng quan & Kế hoạch">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
            className="cursor-pointer"
          >
            <IconDashboard className="mr-2 h-4 w-4 text-primary" />
            <span>Bảng điều khiển Thống kê & So sánh YoY</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/planning"))}
            className="cursor-pointer"
          >
            <IconTrendingUp className="mr-2 h-4 w-4 text-indigo-600" />
            <span>Demand Planning (Dự báo nhu cầu, MRP, ABC)</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 3. KINH DOANH & BÁN HÀNG */}
        <CommandGroup heading="🛒 Kinh doanh & Bán hàng">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/pos"))}
            className="cursor-pointer"
          >
            <IconShoppingCart className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Quầy Bán Hàng Thu Ngân (POS)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/sales"))}
            className="cursor-pointer"
          >
            <IconListDetails className="mr-2 h-4 w-4" />
            <span>Quản lý Đơn Bán Hàng & In Hóa Đơn</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/partners"))}
            className="cursor-pointer"
          >
            <IconUsersGroup className="mr-2 h-4 w-4 text-blue-600" />
            <span>Quản lý Khách Hàng & NCC (Mini CRM)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/barcode"))}
            className="cursor-pointer"
          >
            <IconBarcode className="mr-2 h-4 w-4 text-sky-600" />
            <span>In Tem Mã Vạch (Barcode Generator)</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 4. KHO HÀNG & SẢN XUẤT */}
        <CommandGroup heading="📦 Kho hàng & Sản xuất">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/warehouse"))}
            className="cursor-pointer"
          >
            <IconPackages className="mr-2 h-4 w-4 text-amber-600" />
            <span>Kho Hàng Tổng Hợp & Cảnh Báo An Toàn</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/product/catalog"))}
            className="cursor-pointer"
          >
            <IconPackage className="mr-2 h-4 w-4" />
            <span>Danh mục Sản phẩm & Định mức BOM</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/product/orders"))}
            className="cursor-pointer"
          >
            <IconPackage className="mr-2 h-4 w-4 text-purple-600" />
            <span>Lệnh sản xuất thành phẩm</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/material/catalog"))}
            className="cursor-pointer"
          >
            <IconWood className="mr-2 h-4 w-4 text-amber-700" />
            <span>Danh mục Nguyên vật liệu</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/material/orders"))}
            className="cursor-pointer"
          >
            <IconWood className="mr-2 h-4 w-4 text-amber-700" />
            <span>Đơn nhập mua nguyên vật liệu</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dieu-chinh-kho"))}
            className="cursor-pointer"
          >
            <IconAdjustments className="mr-2 h-4 w-4 text-amber-600" />
            <span>Kiểm kê & Điều chỉnh kho</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 5. TÀI CHÍNH & NHÂN SỰ */}
        <CommandGroup heading="💰 Tài chính & Nhân sự">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/cashbook"))}
            className="cursor-pointer"
          >
            <IconReceipt2 className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Sổ Quỹ Dòng Tiền & Quản Lý Công Nợ</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/payroll"))}
            className="cursor-pointer"
          >
            <IconReportMoney className="mr-2 h-4 w-4 text-purple-600" />
            <span>Bảng Lương Nhân Viên (Payroll)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/check-in"))}
            className="cursor-pointer"
          >
            <IconCalendar className="mr-2 h-4 w-4 text-blue-600" />
            <span>Bảng Chấm Công Hàng Ngày</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/staff"))}
            className="cursor-pointer"
          >
            <IconUsers className="mr-2 h-4 w-4" />
            <span>Danh Sách Nhân Sự & Tài Khoản</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/department"))}
            className="cursor-pointer"
          >
            <IconBriefcase className="mr-2 h-4 w-4 text-zinc-600" />
            <span>Cơ Cấu Phòng Ban & Chức Vụ</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 6. HỆ THỐNG & TIỆN ÍCH */}
        <CommandGroup heading="⚙️ Hệ thống & Tiện ích">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/import"))}
            className="cursor-pointer"
          >
            <IconFileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Nhập Dữ Liệu Excel Hàng Loạt (Bulk Import)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/audit-log"))}
            className="cursor-pointer"
          >
            <IconClipboardList className="mr-2 h-4 w-4 text-rose-600" />
            <span>Nhật Ký Hệ Thống (Audit Log)</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
