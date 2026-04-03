"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { TaoPhieuDieuChinhKhoDialog } from "./TaoPhieuDieuChinhKhoDialog";
import { Badge }  from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DataTable } from "@/components/shared/DataTable";
import { useMyProfile } from "@/hooks/use-account";
import {
  useDieuChinhKhoList,
  useApproveDieuChinhKho,
  useRejectDieuChinhKho,
} from "@/hooks/use-dieu-chinh-kho";

/* ── helpers ── */
function trangThaiBadge(tt: string) {
  if (tt === "cho_duyet") return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Chờ duyệt</Badge>;
  if (tt === "da_duyet")  return <Badge className="bg-green-100  text-green-800  border-green-300">Đã duyệt</Badge>;
  if (tt === "tu_choi")   return <Badge className="bg-red-100    text-red-800    border-red-300">Từ chối</Badge>;
  return <Badge variant="outline">{tt}</Badge>;
}

function loaiLabel(l: string) {
  return l === "nguyen_lieu" ? "Nguyên liệu" : "Sản phẩm";
}

function fmtQty(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}`;
}

export default function DieuChinhKhoPage() {
  const [filterLoai,    setFilterLoai]    = useState("");
  const [filterTT,      setFilterTT]      = useState("");
  const [page,          setPage]          = useState(1);
  const [limit,         setLimit]         = useState(20);
  const [isCreateOpen,  setIsCreateOpen]  = useState(false);

  const { data: myUser } = useMyProfile();

  /* Senior-role check — mirrors verifyApprover in auth.js */
  const isApprover = useMemo(() => {
    const dept   = (myUser?.phong_ban?.ten || "").trim();
    const chucVu = (myUser?.chuc_vu?.ten   || "").trim();
    const role   = myUser?.role;
    return (
      dept   === "Phòng giám đốc" ||
      chucVu === "Giám đốc" ||
      chucVu === "Thủ kho"  ||
      role   === "admin"
    );
  }, [myUser]);

  const { data, isLoading } = useDieuChinhKhoList({
    loai:       filterLoai  || undefined,
    trang_thai: filterTT    || undefined,
    page,
    limit,
  });

  const items      = data?.items || [];
  const pagination = {
    page,
    limit,
    total:      data?.total      ?? 0,
    totalPages: data?.totalPages ?? 1,
  };

  const approveMutation = useApproveDieuChinhKho();
  const rejectMutation  = useRejectDieuChinhKho();

  const handleApprove = (id: string) => {
    approveMutation.mutate(id, {
      onSuccess: () => toast.success("Đã duyệt phiếu điều chỉnh kho"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id, {
      onSuccess: () => toast.success("Đã từ chối phiếu điều chỉnh kho"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  /* ── columns ── */
  const columns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: "ma_hang",   header: "Mã hàng",   size: 120 },
    { accessorKey: "ten_hang",  header: "Tên hàng" },
    {
      accessorKey: "loai",
      header: "Loại",
      size: 110,
      cell: ({ getValue }) => loaiLabel(getValue<string>()),
    },
    {
      accessorKey: "so_luong_dieu_chinh",
      header: () => <div className="text-right">Điều chỉnh</div>,
      size: 100,
      cell: ({ getValue }) => {
        const n = getValue<number>();
        return (
          <div className={`text-right font-medium ${n > 0 ? "text-green-600" : "text-red-600"}`}>
            {fmtQty(n)}
          </div>
        );
      },
    },
    {
      accessorKey: "ton_kho_truoc",
      header: () => <div className="text-right">Tồn trước</div>,
      size: 100,
      cell: ({ getValue }) => <div className="text-right">{getValue<number>()}</div>,
    },
    { accessorKey: "ly_do",     header: "Lý do" },
    {
      id: "nguoi_tao",
      header: "Người tạo",
      size: 140,
      cell: ({ row }) => row.original.created_by?.ho_ten || row.original.created_by?.tai_khoan || "—",
    },
    {
      accessorKey: "trang_thai",
      header: "Trạng thái",
      size: 120,
      cell: ({ getValue }) => trangThaiBadge(getValue<string>()),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Thao tác</div>,
      size: 160,
      cell: ({ row }) => {
        const s = row.original;
        if (!isApprover || s.trang_thai !== "cho_duyet") return null;
        return (
          <div className="flex gap-1 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-300 hover:bg-green-50"
              disabled={approveMutation.isPending}
              onClick={() => handleApprove(s._id)}
            >
              ✓ Duyệt
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 border-red-300 hover:bg-red-50"
              disabled={rejectMutation.isPending}
              onClick={() => handleReject(s._id)}
            >
              ✗ Từ chối
            </Button>
          </div>
        );
      },
    },
  ], [isApprover, approveMutation.isPending, rejectMutation.isPending]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Điều chỉnh kho</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <IconPlus className="mr-1 h-4 w-4" />
          Tạo phiếu điều chỉnh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={filterLoai || "all"}
          onValueChange={(v) => { setFilterLoai(v === "all" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Loại hàng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="nguyen_lieu">Nguyên liệu</SelectItem>
            <SelectItem value="san_pham">Sản phẩm</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterTT || "all"}
          onValueChange={(v) => { setFilterTT(v === "all" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="cho_duyet">Chờ duyệt</SelectItem>
            <SelectItem value="da_duyet">Đã duyệt</SelectItem>
            <SelectItem value="tu_choi">Từ chối</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={items}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        loading={isLoading}
      />

      <TaoPhieuDieuChinhKhoDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
