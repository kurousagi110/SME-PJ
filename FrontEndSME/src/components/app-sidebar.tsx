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
} from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";
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
    return ["Phòng Kế Toán", "Phòng Nhân Sự", "Phòng giám đốc"].includes(
      deptName
    );
  }, [deptName]);

  const isDirectorDepartment = deptName === "Phòng giám đốc";

  const navMain = React.useMemo(
    () =>
      [
        {
          title: "Thống kê",
          url: "/dashboard",
          icon: IconDashboard,
        },
        {
          title: "Nguyên vật liệu",
          url: "#",
          icon: IconWood,
          items: [
            { title: "Danh mục", url: "/material/catalog" },
            { title: "Đơn nhập hàng", url: "/material/orders" },
          ],
        },
        {
          title: "Sản phẩm",
          url: "#",
          icon: IconPackage,
          items: [
            { title: "Danh mục", url: "/product/catalog" },
            { title: "Đơn sản xuất", url: "/product/orders" },
          ],
        },
        {
          title: "Kho hàng",
          url: "/warehouse",
          icon: IconPackages,
        },

        canSeeSalesMenu
          ? {
              title: "Đơn bán hàng",
              url: "/sales",
              icon: IconListDetails,
            }
          : null,

        isDirectorDepartment
          ? {
              title: "Phòng ban",
              url: "/department",
              icon: IconBriefcase,
            }
          : null,
        {
          title: "Nhân sự",
          url: "/staff",
          icon: IconUsers,
        },
        {
          title: "Chấm công",
          url: "/check-in",
          icon: IconCalendar,
        },
      ].filter(Boolean) as any[],
    [canSeeSalesMenu, isDirectorDepartment]
  );

  const data = {
    user: {
      name: profile?.ho_ten || "...",
      chuc_vu: profile?.chuc_vu?.ten || "...",
      phong_ban: profile?.phong_ban?.ten || "...",
      avatar: "/avatars/shadcn.jpg",
    },
    navMain,
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
              <a href="#">
                <IconBlocks className="!size-5" />
                <span className="text-base font-semibold">
                  Quản Lý Doanh Nghiệp
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
