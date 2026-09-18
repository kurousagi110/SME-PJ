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
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        if (!group.items || group.items.length === 0) return null;

        return (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/80 px-3 h-7">
              {group.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
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
                              className="font-medium"
                            >
                              {item.icon && <item.icon className="text-muted-foreground group-hover/collapsible:text-foreground" />}
                              <span>{item.title}</span>
                              {item.badge && (
                                <span className="ml-auto text-3xs font-semibold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">
                                  {item.badge}
                                </span>
                              )}
                              <IconChevronRight
                                className={cn(
                                  "ml-auto h-4 w-4 transition-transform duration-200 text-muted-foreground",
                                  "group-data-[state=open]/collapsible:rotate-90"
                                )}
                              />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <SidebarMenuSub className="my-1 ml-4 border-l pl-2 space-y-0.5">
                              {item.items.map((sub) => (
                                <SidebarMenuSubItem key={sub.title}>
                                  <Link href={sub.url}>
                                    <SidebarMenuButton
                                      isActive={pathname === sub.url}
                                      size="sm"
                                      className="text-xs h-7"
                                    >
                                      {sub.icon && <sub.icon className="h-3.5 w-3.5" />}
                                      <span>{sub.title}</span>
                                      {sub.badge && (
                                        <span className="ml-auto text-3xs font-medium px-1 rounded-sm bg-muted text-muted-foreground">
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
                          className="font-medium"
                        >
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto text-3xs font-semibold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">
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
