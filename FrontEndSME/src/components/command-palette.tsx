"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconDashboard,
  IconPackages,
  IconListDetails,
  IconWood,
  IconPackage,
  IconAdjustments,
  IconUsers,
  IconCalendar,
  IconReportMoney,
  IconBriefcase,
  IconClipboardList,
  IconPlus,
  IconReceipt2,
  IconUsersGroup,
  IconShoppingCart,
  IconBarcode,
  IconFileSpreadsheet,
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

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tìm kiếm & Thao tác nhanh (Ctrl + K)"
      description="Tìm kiếm trang làm việc hoặc thao tác nhanh"
    >
      <CommandInput placeholder="Gõ từ khóa tìm kiếm (VD: kho, bán hàng, lương, nhân sự)..." />
      <CommandList className="max-h-[350px]">
        <CommandEmpty>Không tìm thấy kết quả phù hợp.</CommandEmpty>

        {/* THAO TÁC NHANH */}
        <CommandGroup heading="Thao tác nhanh">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/pos"))}
            className="cursor-pointer"
          >
            <IconShoppingCart className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Mở quầy bán hàng nhanh (POS)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/barcode"))}
            className="cursor-pointer"
          >
            <IconBarcode className="mr-2 h-4 w-4 text-sky-600" />
            <span>In tem nhãn mã vạch (Barcode Code128)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/sales"))}
            className="cursor-pointer"
          >
            <IconPlus className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Tạo đơn bán hàng mới</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/check-in"))}
            className="cursor-pointer"
          >
            <IconCalendar className="mr-2 h-4 w-4 text-blue-600" />
            <span>Ghi nhận chấm công hôm nay</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/payroll"))}
            className="cursor-pointer"
          >
            <IconReportMoney className="mr-2 h-4 w-4 text-purple-600" />
            <span>Tính bảng lương tháng</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/import"))}
            className="cursor-pointer"
          >
            <IconFileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Nhập dữ liệu Excel hàng loạt (Bulk Import)</span>
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

        {/* PHÂN HỆ LÀM VIỆC */}
        <CommandGroup heading="Điều hướng phân hệ">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
            className="cursor-pointer"
          >
            <IconDashboard className="mr-2 h-4 w-4" />
            <span>Bảng điều khiển Thống kê</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/pos"))}
            className="cursor-pointer"
          >
            <IconShoppingCart className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Quầy Bán Hàng Thu Ngân (POS)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/barcode"))}
            className="cursor-pointer"
          >
            <IconBarcode className="mr-2 h-4 w-4 text-sky-600" />
            <span>In Tem Mã Vạch (Barcode Generator)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/warehouse"))}
            className="cursor-pointer"
          >
            <IconPlus className="mr-2 h-4 w-4" />
            <span>Xem tồn kho & Cảnh báo an toàn</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/cashbook"))}
            className="cursor-pointer"
          >
            <IconReceipt2 className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Lập Phiếu Thu / Phiếu Chi Sổ Quỹ</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/partners"))}
            className="cursor-pointer"
          >
            <IconUsersGroup className="mr-2 h-4 w-4 text-primary" />
            <span>Thêm Khách Hàng / Nhà Cung Cấp Mới</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/warehouse"))}
            className="cursor-pointer"
          >
            <IconPackages className="mr-2 h-4 w-4" />
            <span>Kho hàng (Thành phẩm & Nguyên vật liệu)</span>
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
            <IconPackage className="mr-2 h-4 w-4" />
            <span>Lệnh sản xuất sản phẩm</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/material/catalog"))}
            className="cursor-pointer"
          >
            <IconWood className="mr-2 h-4 w-4" />
            <span>Danh mục Nguyên vật liệu</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/material/orders"))}
            className="cursor-pointer"
          >
            <IconWood className="mr-2 h-4 w-4" />
            <span>Đơn nhập hàng nguyên vật liệu</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/payroll"))}
            className="cursor-pointer"
          >
            <IconReportMoney className="mr-2 h-4 w-4" />
            <span>Bảng lương nhân viên (Payroll)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/cashbook"))}
            className="cursor-pointer"
          >
            <IconReceipt2 className="mr-2 h-4 w-4" />
            <span>Sổ quỹ & Quản lý Công nợ (Cashbook & Debt)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/partners"))}
            className="cursor-pointer"
          >
            <IconUsersGroup className="mr-2 h-4 w-4" />
            <span>Quản lý Khách Hàng & NCC (Mini CRM)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/import"))}
            className="cursor-pointer"
          >
            <IconFileSpreadsheet className="mr-2 h-4 w-4" />
            <span>Nhập dữ liệu Excel hàng loạt (Bulk Import)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/check-in"))}
            className="cursor-pointer"
          >
            <IconCalendar className="mr-2 h-4 w-4" />
            <span>Bảng Chấm công</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/staff"))}
            className="cursor-pointer"
          >
            <IconUsers className="mr-2 h-4 w-4" />
            <span>Quản lý Nhân sự</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/department"))}
            className="cursor-pointer"
          >
            <IconBriefcase className="mr-2 h-4 w-4" />
            <span>Phòng ban & Chức vụ</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => router.push("/audit-log"))}
            className="cursor-pointer"
          >
            <IconClipboardList className="mr-2 h-4 w-4" />
            <span>Nhật ký hệ thống (Audit Log)</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
