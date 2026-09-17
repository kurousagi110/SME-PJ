"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Package, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProductStockList } from "@/hooks/use-product";
import { useMaterialStockList } from "@/hooks/use-material";

export function StockAlertBadge() {
  const { data: productStockData } = useProductStockList({
    name: "",
    page: 1,
    limit: 100,
  });

  const { data: materialStockData } = useMaterialStockList({
    name: "",
    page: 1,
    limit: 100,
  });

  const lowStockProducts = React.useMemo(() => {
    const items = ((productStockData as any)?.items || []) as any[];
    return items.filter(
      (p) => Number(p.so_luong ?? 0) <= Number(p.ton_toi_thieu ?? 0) && Number(p.ton_toi_thieu ?? 0) > 0
    );
  }, [productStockData]);

  const lowStockMaterials = React.useMemo(() => {
    const items = ((materialStockData as any)?.items || []) as any[];
    return items.filter(
      (m) => Number(m.so_luong ?? 0) <= Number(m.ton_toi_thieu ?? 0) && Number(m.ton_toi_thieu ?? 0) > 0
    );
  }, [materialStockData]);

  const totalAlerts = lowStockProducts.length + lowStockMaterials.length;

  if (totalAlerts === 0) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            title="Kho hàng an toàn"
          >
            <ShieldCheck className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-4">
          <div className="flex items-center gap-2 text-emerald-600 font-medium">
            <ShieldCheck className="h-5 w-5" />
            <span>Kho hàng an toàn</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Tất cả sản phẩm và nguyên vật liệu hiện đang trên mức tồn tối thiểu an toàn.
          </p>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100 hover:text-amber-950 font-medium"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 animate-bounce" />
          <span className="hidden sm:inline text-xs">Cảnh báo kho:</span>
          <Badge
            variant="destructive"
            className="h-5 px-1.5 min-w-[20px] rounded-full text-[11px] font-bold bg-amber-600 hover:bg-amber-700"
          >
            {totalAlerts}
          </Badge>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-88 p-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Cảnh báo tồn kho ({totalAlerts})</span>
          </div>
          <Link
            href="/warehouse"
            className="text-xs text-primary font-medium hover:underline flex items-center"
          >
            Xem kho <ChevronRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y text-xs mt-2">
          {lowStockProducts.map((p) => (
            <div key={p._id} className="py-2 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{p.ten_sp}</p>
                <p className="text-[11px] text-muted-foreground">Mã: {p.ma_sp}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-red-600">{p.so_luong}</span>
                <span className="text-muted-foreground"> / tối thiểu {p.ton_toi_thieu}</span>
              </div>
            </div>
          ))}

          {lowStockMaterials.map((m) => (
            <div key={m._id} className="py-2 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{m.ten_nl}</p>
                <p className="text-[11px] text-muted-foreground">Mã NL: {m.ma_nl} ({m.don_vi})</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-amber-600">{m.so_luong}</span>
                <span className="text-muted-foreground"> / tối thiểu {m.ton_toi_thieu}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 mt-2 border-t text-center">
          <Link href="/warehouse">
            <Button size="sm" variant="outline" className="w-full text-xs">
              <Package className="mr-1.5 h-3.5 w-3.5" /> Chuyển đến trang Kho hàng
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
