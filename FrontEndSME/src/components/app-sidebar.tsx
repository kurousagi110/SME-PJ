"use client";

import * as React from "react";
import {
  IconDashboard,
  IconPackage,
  IconPackages,
  IconListDetails,
  IconUsers,
  IconBriefcase,
  IconCalendar,
  IconWood,
  IconBlocks,
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
  IconScale,
  IconTruck,
} from "@tabler/icons-react";

import { NavMain, type NavGroup } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useMyProfile } from "@/hooks/use-account";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: profile } = useMyProfile();

  const deptName = (profile?.phong_ban?.ten || "").trim();

  const canSeeSalesMenu = React.useMemo(() => {
    return ["Phòng Kế Toán", "Phòng Nhân Sự", "Phòng giám đốc", "Phòng kinh doanh"].includes(
      deptName
    );
  }, [deptName]);

  const isDirectorDepartment = deptName === "Phòng giám đốc";
  const chucVuName = (profile?.chuc_vu?.ten || "").trim();
  const canSeeAuditLog =
    isDirectorDepartment || chucVuName === "Giám đốc";

  // Nhóm các tính năng khoa học theo luồng nghiệp vụ thực tế
  const navGroups: NavGroup[] = React.useMemo(() => {
    return [
      // 1. TỔNG QUAN & KẾ HOẠCH
      {
        label: "Tổng Quan & Kế Hoạch",
        items: [
          {
            title: "Bảng Điều Khiển",
            url: "/dashboard",
            icon: IconDashboard,
          },
          {
            title: "Demand Planning",
            icon: IconTrendingUp,
            badge: "Mới",
            items: [
              { title: "Dự báo nhu cầu", url: "/planning" },
              { title: "Kế hoạch MRP", url: "/planning" },
              { title: "Phân tích ABC", url: "/planning" },
              { title: "Cảnh báo tồn kho", url: "/planning" },
              { title: "Định giá sàn TMĐT", url: "/planning" },
            ],
          },
        ],
      },

      // 2. KINH DOANH & BÁN HÀNG
      {
        label: "Kinh Doanh & Bán Hàng",
        items: [
          canSeeSalesMenu
            ? {
                title: "Quầy Thu Ngân POS",
                url: "/pos",
                icon: IconShoppingCart,
              }
            : null,
          canSeeSalesMenu
            ? {
                title: "Đơn Bán Hàng",
                url: "/sales",
                icon: IconListDetails,
              }
            : null,
          {
            title: "Vận Chuyển & Giao Hàng",
            url: "/shipping",
            icon: IconTruck,
            badge: "Mới",
          },
          {
            title: "Khách Hàng & NCC",
            url: "/partners",
            icon: IconUsersGroup,
          },
          {
            title: "In Mã Vạch Tem",
            url: "/barcode",
            icon: IconBarcode,
          },
        ].filter(Boolean) as any[],
      },

      // 3. KHO HÀNG & SẢN XUẤT
      {
        label: "Kho & Sản Xuất",
        items: [
          {
            title: "Thành Phẩm",
            icon: IconPackage,
            items: [
              { title: "Danh mục sản phẩm", url: "/product/catalog" },
              { title: "Lệnh sản xuất", url: "/product/orders" },
            ],
          },
          {
            title: "Nguyên Vật Liệu",
            icon: IconWood,
            items: [
              { title: "Danh mục vật tư", url: "/material/catalog" },
              { title: "Đơn nhập mua hàng", url: "/material/orders" },
            ],
          },
          {
            title: "Tồn Kho Tổng Hợp",
            url: "/warehouse",
            icon: IconPackages,
          },
          {
            title: "Kiểm Kê Điều Chỉnh",
            url: "/dieu-chinh-kho",
            icon: IconAdjustments,
          },
        ],
      },

      // 4. TÀI CHÍNH & NHÂN SỰ
      {
        label: "Tài Chính & Nhân Sự",
        items: [
          {
            title: "Sổ Quỹ & Công Nợ",
            url: "/cashbook",
            icon: IconReceipt2,
          },
          {
            title: "Bảng Lương",
            url: "/payroll",
            icon: IconReportMoney,
          },
          {
            title: "Chấm Công",
            url: "/check-in",
            icon: IconCalendar,
          },
          {
            title: "Hồ Sơ Nhân Sự",
            url: "/staff",
            icon: IconUsers,
          },
          isDirectorDepartment
            ? {
                title: "Phòng Ban & Chức Vụ",
                url: "/department",
                icon: IconBriefcase,
              }
            : null,
        ].filter(Boolean) as any[],
      },

      // 5. HỆ THỐNG & TIỆN ÍCH
      {
        label: "Hệ Thống & Tiện Ích",
        items: [
          {
            title: "Nhập Dữ Liệu Excel",
            url: "/import",
            icon: IconFileSpreadsheet,
          },
          canSeeAuditLog
            ? {
                title: "Nhật Ký Hệ Thống",
                url: "/audit-log",
                icon: IconClipboardList,
              }
            : null,
        ].filter(Boolean) as any[],
      },
    ];
  }, [canSeeSalesMenu, isDirectorDepartment, canSeeAuditLog]);

  const data = {
    user: {
      name: profile?.ho_ten || "...",
      chuc_vu: profile?.chuc_vu?.ten || "...",
      phong_ban: profile?.phong_ban?.ten || "...",
      avatar: "/avatars/shadcn.jpg",
    },
    navGroups,
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconBlocks className="!size-5 text-primary" />
                <span className="text-base font-bold tracking-tight">
                  Quản Lý Doanh Nghiệp
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain groups={data.navGroups} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
