"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { StockAlertBadge } from "@/components/stock-alert-badge";
import { CommandPalette } from "@/components/command-palette";

export function SiteHeader() {
  const [openCommand, setOpenCommand] = React.useState(false);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        {/* Command palette search trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpenCommand(true)}
          className="hidden sm:flex h-8 w-64 items-center justify-between text-xs text-muted-foreground bg-muted/30 border-muted-foreground/20 hover:bg-muted/60"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Tìm kiếm nhanh...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Mobile search trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpenCommand(true)}
          className="sm:hidden h-8 w-8 text-muted-foreground"
        >
          <Search className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {/* Cảnh báo tồn kho an toàn */}
          <StockAlertBadge />

          <Separator
            orientation="vertical"
            className="mx-1 h-4 data-[orientation=vertical]:h-4"
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
