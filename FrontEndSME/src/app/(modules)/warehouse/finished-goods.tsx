"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProductStockList } from "@/hooks/use-product";

type StockStatus = "OK" | "LOW" | "OUT";

type ProductStockItem = {
  _id: string;
  ma_sp: string;
  ten_sp: string;
  don_vi: string;
  so_luong: number;
  don_gia?: number;
  ton_toi_thieu: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type ProductStockResponse = {
  success: boolean;
  items: ProductStockItem[];
  pagination: Pagination;
};

function statusOf(onHand: number, min: number): StockStatus {
  if (onHand <= 0) return "OUT";
  if (onHand <= min) return "LOW";
  return "OK";
}

function StatusBadge({ s }: { s: StockStatus }) {
  if (s === "OK") return <Badge>Đủ hàng</Badge>;
  if (s === "LOW") return <Badge variant="secondary">Sắp hết</Badge>;
  return <Badge variant="destructive">Hết hàng</Badge>;
}

function formatVND(v?: number) {
  if (v === undefined || v === null) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("vi-VN") + " ₫";
}

export default function FinishedGoods() {
  // ====== UI state ======
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<"ALL" | "LOW" | "OUT">("ALL");

  // server paging
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);

  // dialog
  const [openView, setOpenView] = React.useState(false);
  const [selected, setSelected] = React.useState<ProductStockItem | null>(null);

  // ====== debounce search ======
  const [debouncedQ, setDebouncedQ] = React.useState(q);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // mỗi lần search đổi -> về page 1
  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, limit]);

  // ====== fetch ======
  const { data, isLoading, isFetching, isError, error, refetch } =
    useProductStockList({
      name: debouncedQ,
      page,
      limit,
    });

  const res = (data as any)?.data ?? data;
  const items: ProductStockItem[] = (res as ProductStockResponse)?.items || [];
  const pagination: Pagination | undefined = (res as ProductStockResponse)
    ?.pagination;

  // ====== client filter theo trạng thái (LOW/OUT) ======
  const filtered = React.useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((it) => {
      const st = statusOf(
        Number(it.so_luong || 0),
        Number(it.ton_toi_thieu || 0)
      );
      return filter === "LOW" ? st === "LOW" : st === "OUT";
    });
  }, [items, filter]);

  const openDetail = (it: ProductStockItem) => {
    setSelected(it);
    setOpenView(true);
  };

  const resetAll = () => {
    setQ("");
    setFilter("ALL");
    setPage(1);
    setLimit(20);
  };

  const totalPages = pagination?.total_pages ?? 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xl font-semibold">Kho thành phẩm</div>
          <div className="text-sm text-muted-foreground">
            Theo dõi tồn kho sản phẩm, cảnh báo sắp hết/hết hàng
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="w-full sm:w-[320px]"
            placeholder="Tìm mã SP / tên SP..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Bộ lọc" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="LOW">Sắp hết</SelectItem>
              <SelectItem value="OUT">Hết hàng</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={resetAll}>
            Reset
          </Button>
        </div>
      </div>

      {/* toolbar: paging */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải...
            </span>
          ) : isError ? (
            <span className="text-destructive">
              Lỗi tải dữ liệu{error ? `: ${(error as any)?.message || ""}` : ""}
            </span>
          ) : (
            <span>
              Tổng: <b>{pagination?.total ?? filtered.length}</b> sản phẩm
              {pagination ? (
                <>
                  {" "}
                  • Trang <b>{pagination.page}</b>/
                  <b>{pagination.total_pages}</b>
                </>
              ) : null}
            </span>
          )}

          {isFetching && !isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang cập nhật...
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              const n = Number(v);
              setLimit(Number.isFinite(n) ? n : 20);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Số dòng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="20">20 / trang</SelectItem>
              <SelectItem value="50">50 / trang</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={!canPrev || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm min-w-[90px] text-center">
              Trang <b>{page}</b>/{totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={!canNext || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              disabled={isLoading}
              onClick={() => refetch()}
            >
              Tải lại
            </Button>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã SP</TableHead>
              <TableHead>Tên sản phẩm</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead className="text-right">Tồn</TableHead>
              <TableHead className="text-right">Tồn tối thiểu</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center p-6 text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải dữ liệu...
                  </span>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center p-6 text-muted-foreground"
                >
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((it) => {
                const onHand = Number(it.so_luong || 0);
                const min = Number(it.ton_toi_thieu || 0);
                const st = statusOf(onHand, min);

                return (
                  <TableRow key={it._id}>
                    <TableCell className="font-medium">{it.ma_sp}</TableCell>
                    <TableCell>{it.ten_sp}</TableCell>
                    <TableCell>{it.don_vi}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {onHand}
                    </TableCell>
                    <TableCell className="text-right">{min}</TableCell>
                    <TableCell>
                      <StatusBadge s={st} />
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDetail(it)}>
                            Xem chi tiết
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog (bản này dùng info từ item) */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết tồn kho thành phẩm</DialogTitle>
          </DialogHeader>

          {!selected ? null : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Mã SP</div>
                  <div className="font-medium">{selected.ma_sp}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tên SP</div>
                  <div className="font-medium">{selected.ten_sp}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Tồn hiện tại
                  </div>
                  <div className="font-semibold">
                    {Number(selected.so_luong || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Tồn tối thiểu
                  </div>
                  <div className="font-medium">
                    {Number(selected.ton_toi_thieu || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Đơn vị</div>
                  <div className="font-medium">{selected.don_vi}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Đơn giá</div>
                  <div className="font-medium">
                    {formatVND(selected.don_gia)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Trạng thái</div>
                <div className="mt-1">
                  <StatusBadge
                    s={statusOf(
                      Number(selected.so_luong || 0),
                      Number(selected.ton_toi_thieu || 0)
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenView(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
