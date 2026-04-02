"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Generic server-side-paginated DataTable
// Built on @tanstack/react-table v8 + Shadcn/UI table primitives
//
// Usage:
//   <DataTable
//     columns={columns}
//     data={rows}
//     pagination={pagination}       // { page, limit, total, totalPages }
//     onPageChange={setPage}
//     loading={isLoading}
//   />
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ServerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  /** Pagination meta returned by the backend. Omit for client-only tables. */
  pagination?: ServerPagination;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  loading?: boolean;
  /** Optional caption shown below the table */
  caption?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function DataTable<TData>({
  columns,
  data,
  pagination,
  onPageChange,
  onLimitChange,
  loading = false,
  caption,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Disable built-in pagination — server handles it
    manualPagination: !!pagination,
    pageCount: pagination?.totalPages ?? -1,
  });

  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? data.length;
  const limit = pagination?.limit ?? data.length;

  return (
    <div className="space-y-4">
      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {caption && (
          <p className="px-4 py-2 text-xs text-muted-foreground">{caption}</p>
        )}
      </div>

      {/* ── Pagination controls ────────────────────────────────────────────── */}
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          {/* Row count summary */}
          <span className="text-muted-foreground">
            {total === 0
              ? "Không có bản ghi"
              : `${(currentPage - 1) * limit + 1}–${Math.min(currentPage * limit, total)} / ${total} bản ghi`}
          </span>

          <div className="flex items-center gap-2">
            {/* Rows-per-page selector */}
            {onLimitChange && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Hiển thị</span>
                <Select
                  value={String(limit)}
                  onValueChange={(v) => onLimitChange(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Page navigation */}
            {onPageChange && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage <= 1}
                  aria-label="Trang đầu"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="px-2 text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                  aria-label="Trang cuối"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
