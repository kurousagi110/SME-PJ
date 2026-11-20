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
  IconTruck,
  IconFileText,
  IconFileCheck,
  IconFileInvoice,
  IconArrowBackUp,
  IconScan,
  IconReportAnalytics,
  IconRobot,
  IconLoader2,
  IconSearch,
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
import { Badge } from "@/components/ui/badge";
import { omniSearchAction, type OmniSearchItem } from "@/app/actions/search";

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CATEGORY_BADGE_STYLE: Record<OmniSearchItem["category"], string> = {
  order: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  product: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  material: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  partner: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  contract: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  batch: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export function CommandPalette({ open: controlledOpen, onOpenChange: setControlledOpen }: CommandPaletteProps = {}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [liveResults, setLiveResults] = React.useState<OmniSearchItem[]>([]);
  const [searching, setSearching] = React.useState(false);
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
      if (!nextValue) {
        setSearchQuery("");
        setLiveResults([]);
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

  // Debounced Omni-Search across DB entities
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (!open || q.length < 2) {
      setLiveResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await omniSearchAction(q);
      if (!cancelled) {
        setLiveResults(res.data);
        setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, open]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={searchQuery}
        onValueChange={setSearchQuery}
        placeholder="Tìm nhanh tính năng, mã đơn DH-, sản phẩm, khách hàng, SĐT... (Ctrl + K)"
      />
      <CommandList>
        <CommandEmpty>
          {searching ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <IconLoader2 className="h-4 w-4 animate-spin" /> Đang tìm kiếm dữ liệu...
            </span>
          ) : (
            "Không tìm thấy kết quả phù hợp."
          )}
        </CommandEmpty>

        {/* 0. LIVE OMNI-SEARCH RESULTS */}
        {(searching || liveResults.length > 0) && (
          <>
            <CommandGroup
              heading={
                searching
                  ? "🔍 Đang tìm kiếm trong cơ sở dữ liệu..."
                  : `🔍 Kết quả dữ liệu (${liveResults.length})`
              }
            >
              {liveResults.map((item) => (
                <CommandItem
                  key={`${item.category}-${item.id}`}
                  value={`${item.title} ${item.code} ${item.subtitle} ${searchQuery}`}
                  onSelect={() => runCommand(() => router.push(item.route))}
                  className="cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <IconSearch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${CATEGORY_BADGE_STYLE[item.category]}`}
                  >
                    {item.categoryLabel}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

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
            onSelect={() => runCommand(() => router.push("/approvals"))}
            className="cursor-pointer"
          >
            <IconFileCheck className="mr-2 h-4 w-4 text-indigo-600" />
            <span>Trung tâm Trình ký & Phê duyệt (Approval Hub)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/sales"))}
            className="cursor-pointer"
          >
            <IconPlus className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Tạo đơn bán hàng mới</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/quotations"))}
            className="cursor-pointer"
          >
            <IconFileInvoice className="mr-2 h-4 w-4 text-blue-600" />
            <span>Lập Báo giá B2B (Quote-to-Order)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/planning?tab=ecommerce"))}
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
            onSelect={() => runCommand(() => router.push("/stock-adjustments"))}
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
            onSelect={() => runCommand(() => router.push("/approvals"))}
            className="cursor-pointer"
          >
            <IconFileCheck className="mr-2 h-4 w-4 text-indigo-600" />
            <span>Hộp thư Trình ký & Duyệt việc</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/planning?tab=forecast"))}
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
            onSelect={() => runCommand(() => router.push("/quotations"))}
            className="cursor-pointer"
          >
            <IconFileInvoice className="mr-2 h-4 w-4 text-blue-600" />
            <span>Báo Giá B2B</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/sales"))}
            className="cursor-pointer"
          >
            <IconListDetails className="mr-2 h-4 w-4" />
            <span>Quản lý Đơn Bán Hàng & In Hóa Đơn</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/contracts"))}
            className="cursor-pointer"
          >
            <IconFileText className="mr-2 h-4 w-4 text-teal-600" />
            <span>Quản lý Hợp Đồng B2B & Bảo Hành Sản Phẩm</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/returns"))}
            className="cursor-pointer"
          >
            <IconArrowBackUp className="mr-2 h-4 w-4 text-rose-600" />
            <span>Đổi & Trả Hàng (RMA / QC)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/shipping"))}
            className="cursor-pointer"
          >
            <IconTruck className="mr-2 h-4 w-4 text-orange-600" />
            <span>Vận Chuyển & Giao Hàng (In Tem Vận Đơn A6)</span>
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
            <span>Lệnh sản xuất thành phẩm & Kanban Xưởng</span>
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
            onSelect={() => runCommand(() => router.push("/stock-adjustments"))}
            className="cursor-pointer"
          >
            <IconAdjustments className="mr-2 h-4 w-4 text-amber-600" />
            <span>Kiểm kê & Điều chỉnh kho</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/traceability"))}
            className="cursor-pointer"
          >
            <IconScan className="mr-2 h-4 w-4 text-purple-600" />
            <span>Truy Xuất Lô Hàng (FEFO)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/stock-ledger"))}
            className="cursor-pointer"
          >
            <IconReportAnalytics className="mr-2 h-4 w-4 text-teal-600" />
            <span>Thẻ Kho & Báo cáo Xuất - Nhập - Tồn</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 5. TÀI CHÍNH & NHÂN SỰ */}
        <CommandGroup heading="💰 Tài chính & Nhân sự">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/financial-reports"))}
            className="cursor-pointer"
          >
            <IconReportMoney className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Báo Cáo Tài Chính & Lãi - Lỗ (P&L, COGS, Tuổi Nợ)</span>
          </CommandItem>
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
          <CommandItem
            onSelect={() => runCommand(() => router.push("/automation"))}
            className="cursor-pointer"
          >
            <IconRobot className="mr-2 h-4 w-4 text-indigo-600" />
            <span>Tự Động Hóa Đa Kênh & Bot (Telegram / Zalo)</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
