"use client";

import { type Icon, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type NavSubItem = {
  title: string;
  url: string;
  icon?: Icon;
  badge?: string;
};

export type NavItem = {
  title: string;
  url?: string;
  icon?: Icon;
  badge?: string;
  items?: NavSubItem[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export function NavMain({
  groups,
}: {
  groups: NavGroup[];
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-0.5 py-1 px-1">
      {groups.map((group, groupIdx) => {
        if (!group.items || group.items.length === 0) return null;

        return (
          <SidebarGroup
            key={group.label}
            className={cn("p-1", groupIdx > 0 && "mt-1.5 pt-1.5 border-t border-sidebar-border/40")}
          >
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75 px-2.5 h-6 flex items-center whitespace-nowrap select-none">
              {group.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive = Boolean(
                    (item.url && item.url !== "#" && pathname === item.url) ||
                      item.items?.some((sub) => pathname === sub.url)
                  );

                  if (item.items?.length) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <Collapsible defaultOpen={isActive} className="group/collapsible">
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              isActive={isActive}
                              className="h-9 px-2.5 text-[13px] font-medium"
                            >
                              {item.icon && (
                                <item.icon className="size-4.5 shrink-0 text-muted-foreground group-hover/collapsible:text-foreground transition-colors" />
                              )}
                              <span className="truncate flex-1 text-left">{item.title}</span>
                              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                {item.badge && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 leading-none whitespace-nowrap">
                                    {item.badge}
                                  </span>
                                )}
                                <IconChevronRight
                                  className={cn(
                                    "size-4 shrink-0 transition-transform duration-200 text-muted-foreground/60",
                                    "group-data-[state=open]/collapsible:rotate-90"
                                  )}
                                />
                              </div>
                            </SidebarMenuButton>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <SidebarMenuSub className="my-0.5 ml-4.5 border-l border-sidebar-border/70 pl-2.5 space-y-0.5">
                              {item.items.map((sub) => (
                                <SidebarMenuSubItem key={sub.title}>
                                  <Link href={sub.url}>
                                    <SidebarMenuButton
                                      isActive={pathname === sub.url}
                                      size="sm"
                                      className="text-xs h-7.5 px-2 font-normal"
                                    >
                                      {sub.icon && <sub.icon className="size-3.5 shrink-0 text-muted-foreground" />}
                                      <span className="truncate flex-1 text-left">{sub.title}</span>
                                      {sub.badge && (
                                        <span className="ml-auto shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground leading-none whitespace-nowrap">
                                          {sub.badge}
                                        </span>
                                      )}
                                    </SidebarMenuButton>
                                  </Link>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <Link href={item.url || "#"}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={pathname === item.url}
                          className="h-9 px-2.5 text-[13px] font-medium"
                        >
                          {item.icon && (
                            <item.icon className="size-4.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate flex-1 text-left">{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 leading-none whitespace-nowrap">
                              {item.badge}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </div>
  );
}
