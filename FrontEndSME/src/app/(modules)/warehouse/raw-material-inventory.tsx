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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { useMaterialStockList } from "@/hooks/use-material";

type StockStatus = "OK" | "LOW" | "OUT";

type RawMaterial = {
  _id: string;
  ma_nl: string;
  ten_nl: string;
  don_vi: string;
  mo_ta?: string;
  so_luong: number;
  gia_nhap?: number;
  ton_toi_thieu: number;
  status?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type MaterialStockResponse = {
  success: boolean;
  items: RawMaterial[];
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

export default function RawMaterialInventory() {
  // ===== UI state =====
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<"ALL" | "LOW" | "OUT">("ALL");

  // server paging
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);

  // dialog
  const [openView, setOpenView] = React.useState(false);
  const [selected, setSelected] = React.useState<RawMaterial | null>(null);

  // ===== debounce search (đỡ spam API) =====
  const [debouncedQ, setDebouncedQ] = React.useState(q);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // đổi search/limit => về trang 1
  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, limit]);

  // ===== fetch (hook trả thẳng res.data) =====
  const { data, isLoading, isFetching, isError, error, refetch } =
    useMaterialStockList({
      name: debouncedQ,
      page,
      limit,
    });

  const res = data as MaterialStockResponse | undefined;
  const items: RawMaterial[] = res?.items || [];
  const pagination = res?.pagination;

  // ===== filter trạng thái (client-side) =====
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

  const openDetail = (it: RawMaterial) => {
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
      {/* header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xl font-semibold">Kho nguyên liệu</div>
          <div className="text-sm text-muted-foreground">
            Theo dõi tồn kho nguyên liệu, cảnh báo sắp hết/hết hàng
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="w-full sm:w-[320px]"
            placeholder="Tìm mã NL / tên NL..."
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
              Tổng: <b>{pagination?.total ?? filtered.length}</b> nguyên liệu
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
              <TableHead>Mã NL</TableHead>
              <TableHead>Tên nguyên liệu</TableHead>
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
                    <TableCell className="font-medium">{it.ma_nl}</TableCell>
                    <TableCell>{it.ten_nl}</TableCell>
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

      {/* Detail dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết tồn kho nguyên liệu</DialogTitle>
          </DialogHeader>

          {!selected ? null : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Mã NL</div>
                  <div className="font-medium">{selected.ma_nl}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Tên NL</div>
                  <div className="font-medium">{selected.ten_nl}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Đơn vị</div>
                  <div className="font-medium">{selected.don_vi}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Giá nhập</div>
                  <div className="font-medium">
                    {formatVND(selected.gia_nhap)}
                  </div>
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
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-muted-foreground">Trạng thái</div>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge
                    s={statusOf(
                      Number(selected.so_luong || 0),
                      Number(selected.ton_toi_thieu || 0)
                    )}
                  />
                  {selected.status ? (
                    <span className="text-muted-foreground">
                      • {selected.status}
                    </span>
                  ) : null}
                </div>
              </div>

              {selected.mo_ta ? (
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-muted-foreground">Mô tả</div>
                  <div className="font-medium">{selected.mo_ta}</div>
                </div>
              ) : null}
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
