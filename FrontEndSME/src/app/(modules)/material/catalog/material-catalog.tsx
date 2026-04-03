"use client";

import { MoreHorizontal } from "lucide-react";
// import { IconEdit } from "@tabler/icons-react";
import React, { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  useMaterialCatalog,
  useCreateMaterial,
  useDeleteMaterialById,
  useUpdateMaterialById,
} from "@/hooks/use-material";
import { useMyProfile } from "@/hooks/use-account";
import { useCreateDieuChinhKho } from "@/hooks/use-dieu-chinh-kho";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { DataTable } from "@/components/shared/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

/* ===================== Types ===================== */
type CreateMaterialForm = {
  ma_nl: string;
  ten_nl: string;
  don_vi: string;
  gia_nhap: number | string;
  ton_toi_thieu: number | string;
  mo_ta: string;
};

type UpdateMaterialForm = {
  _id: string;
  ten_nl: string;
  don_vi: string;
  gia_nhap: number | string;
  ton_toi_thieu: number | string;
  mo_ta: string;
};

export default function MaterialCatalog() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  /* ── Điều chỉnh kho modal state ── */
  const [adjustItem,      setAdjustItem]      = useState<any>(null);
  const [adjustDirection, setAdjustDirection] = useState<"add" | "sub">("add");
  const [adjustQty,       setAdjustQty]       = useState<number | "">(1);
  const [adjustReason,    setAdjustReason]    = useState("");

  const createDieuChinhKho = useCreateDieuChinhKho();

  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterialById();
  const deleteMaterial = useDeleteMaterialById();

  const { data: myUser } = useMyProfile();

  const isDirectorDept = useMemo(() => {
    const deptName = (myUser?.phong_ban?.ten || "").trim();
    return deptName === "Phòng giám đốc";
  }, [myUser]);

  /* Computed preview */
  const adjustedStock = useMemo(() => {
    if (!adjustItem) return 0;
    const qty = Number(adjustQty) || 0;
    const delta = adjustDirection === "add" ? qty : -qty;
    return (adjustItem.so_luong ?? 0) + delta;
  }, [adjustItem, adjustQty, adjustDirection]);

  const handleOpenAdjust = (item: any) => {
    setAdjustItem(item);
    setAdjustDirection("add");
    setAdjustQty(1);
    setAdjustReason("");
  };

  const handleSubmitAdjust = () => {
    const qty = Number(adjustQty);
    if (!qty || qty <= 0) { toast.error("Số lượng phải lớn hơn 0"); return; }
    if (!adjustReason.trim()) { toast.error("Vui lòng nhập lý do điều chỉnh"); return; }

    const delta = adjustDirection === "add" ? qty : -qty;
    createDieuChinhKho.mutate(
      {
        loai:                 "nguyen_lieu",
        item_id:              adjustItem._id,
        ma_hang:              adjustItem.ma_nl,
        ten_hang:             adjustItem.ten_nl,
        so_luong_dieu_chinh:  delta,
        ton_kho_truoc:        adjustItem.so_luong ?? 0,
        ly_do:                adjustReason.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Đã gửi yêu cầu điều chỉnh kho, chờ cấp trên duyệt");
          setAdjustItem(null);
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  /* ===================== Fetch & filter ===================== */
  const { data, isLoading } = useMaterialCatalog({
    name: search,
    page,
    limit,
  });

  const materialList = data?.items || [];
  const pagination = {
    page,
    limit,
    total: (data as any)?.total ?? 0,
    totalPages: (data as any)?.totalPages ?? 1,
  };

  /* ===================== Forms ===================== */
  const createForm = useForm<CreateMaterialForm>({
    mode: "onChange",
    defaultValues: {
      ma_nl: "",
      ten_nl: "",
      don_vi: "",
      gia_nhap: 0,
      ton_toi_thieu: 10,
      mo_ta: "",
    },
  });

  const updateForm = useForm<UpdateMaterialForm>({
    mode: "onChange",
    defaultValues: {
      _id: "",
      ten_nl: "",
      don_vi: "",
      gia_nhap: 0,
      ton_toi_thieu: 10,
      mo_ta: "",
    },
  });

  const {
    formState: { errors: createErrors, isSubmitting: creating },
  } = createForm;

  const {
    formState: { errors: updateErrors, isSubmitting: updating },
  } = updateForm;

  /* ===================== Helpers ===================== */
  const parseNumber = (v: any, fallback = 0) => {
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : fallback;
  };

  /* ===================== Handlers ===================== */
  const handleCreate = (values: CreateMaterialForm) => {
    if (!isDirectorDept) {
      toast.error("Chỉ Phòng giám đốc mới được tạo mới danh mục nguyên liệu");
      return;
    }

    const payload = {
      ...values,
      ma_nl: values.ma_nl.trim(),
      ten_nl: values.ten_nl.trim(),
      don_vi: values.don_vi.trim(),
      mo_ta: (values.mo_ta || "").trim(),
      gia_nhap: parseNumber(values.gia_nhap, 0),
      ton_toi_thieu: parseNumber(values.ton_toi_thieu, 0),
    };

    createMaterial.mutate(payload, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        toast.success("Tạo nguyên liệu thành công");
      },
      onError: (err: any) => {
        toast.error(err?.message || "Tạo nguyên liệu thất bại");
      },
    });
  };

  const handleOpenUpdate = (material: any) => {
    updateForm.reset({
      _id: material._id,
      ten_nl: material.ten_nl ?? "",
      gia_nhap: material.gia_nhap ?? 0,
      ton_toi_thieu: material.ton_toi_thieu ?? 10,
      mo_ta: material.mo_ta ?? "",
      don_vi: material.don_vi ?? "",
    });
    setIsUpdateModalOpen(true);
  };

  const handleUpdate = (values: UpdateMaterialForm) => {
    const payload = {
      ...values,
      ten_nl: values.ten_nl.trim(),
      don_vi: values.don_vi.trim(),
      mo_ta: (values.mo_ta || "").trim(),
      gia_nhap: parseNumber(values.gia_nhap, 0),
      ton_toi_thieu: parseNumber(values.ton_toi_thieu, 0),
    };

    updateMaterial.mutate(
      { id: payload._id, data: payload },
      {
        onSuccess: () => {
          setIsUpdateModalOpen(false);
          toast.success("Cập nhật nguyên liệu thành công");
        },
        onError: (err: any) => {
          toast.error(err?.message || "Cập nhật nguyên liệu thất bại");
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMaterial.mutate(id, {
      onSuccess: () => toast.success("Xóa nguyên liệu thành công"),
      onError: (err: any) => toast.error(err?.message || "Xóa thất bại"),
    });
  };

  /* ===================== Columns ===================== */
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const base: ColumnDef<any>[] = [
      { accessorKey: "ma_nl", header: "Mã nguyên liệu", size: 160 },
      { accessorKey: "ten_nl", header: "Tên nguyên liệu" },
      { accessorKey: "mo_ta", header: "Mô tả" },
      { accessorKey: "don_vi", header: "Đơn vị", size: 100 },
      {
        accessorKey: "gia_nhap",
        header: () => <div className="text-right">Giá nhập</div>,
        cell: ({ getValue }) => (
          <div className="text-right">
            {(getValue<number>() ?? 0).toLocaleString("vi-VN")}
          </div>
        ),
      },
      {
        id: "adjust_action",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleOpenAdjust(row.original)}>
                  ⚖️ Điều chỉnh kho
                </DropdownMenuItem>
                {isDirectorDept ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleOpenUpdate(row.original)}>
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(row.original._id)}
                      className="text-red-500"
                    >
                      Xóa
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ];

    return base;
  }, [isDirectorDept, handleOpenUpdate, handleDelete, handleOpenAdjust]);

  /* ===================== Render ===================== */
  return (
    <div className="p-6 space-y-5">
      {/* FILTER + BUTTON CREATE */}
      <div className="flex justify-between items-center">
        <Input
          placeholder="Tìm theo tên..."
          className="w-1/3"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <div className="flex items-center gap-3">
          {isDirectorDept ? (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              + Tạo mới nguyên liệu
            </Button>
          ) : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={materialList}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        loading={isLoading}
      />

      {/* CREATE MODAL */}
      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          if (open && !isDirectorDept) {
            toast.error(
              "Chỉ Phòng giám đốc mới được tạo mới danh mục nguyên liệu"
            );
            return;
          }
          setIsCreateModalOpen(open);
          if (!open) createForm.reset();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo mới nguyên liệu</DialogTitle>
          </DialogHeader>

          <form id="create" onSubmit={createForm.handleSubmit(handleCreate)}>
            <div className="grid grid-cols-2 gap-4">
              {/* ma_nl */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ma_nl">Mã nguyên liệu</Label>
                <Input
                  id="ma_nl"
                  placeholder="VD: NL001"
                  {...createForm.register("ma_nl", {
                    required: "Vui lòng nhập mã nguyên liệu",
                    setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                    minLength: { value: 2, message: "Tối thiểu 2 ký tự" },
                    maxLength: { value: 30, message: "Tối đa 30 ký tự" },
                    pattern: {
                      value: /^[A-Za-z0-9_-]+$/,
                      message:
                        "Chỉ được dùng chữ/số/_/- (không dấu, không khoảng trắng)",
                    },
                  })}
                />
                {createErrors.ma_nl ? (
                  <p className="text-xs text-red-500">
                    {createErrors.ma_nl.message}
                  </p>
                ) : null}
              </div>

              {/* ten_nl */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ten_nl">Tên nguyên liệu</Label>
                <Input
                  id="ten_nl"
                  placeholder="VD: Gỗ MDF"
                  {...createForm.register("ten_nl", {
                    required: "Vui lòng nhập tên nguyên liệu",
                    setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                    minLength: { value: 2, message: "Tối thiểu 2 ký tự" },
                    maxLength: { value: 100, message: "Tối đa 100 ký tự" },
                  })}
                />
                {createErrors.ten_nl ? (
                  <p className="text-xs text-red-500">
                    {createErrors.ten_nl.message}
                  </p>
                ) : null}
              </div>

              {/* mo_ta */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mo_ta">Mô tả</Label>
                <Input
                  id="mo_ta"
                  placeholder="(không bắt buộc)"
                  {...createForm.register("mo_ta", {
                    setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                    maxLength: { value: 255, message: "Tối đa 255 ký tự" },
                  })}
                />
                {createErrors.mo_ta ? (
                  <p className="text-xs text-red-500">
                    {createErrors.mo_ta.message}
                  </p>
                ) : null}
              </div>

              {/* don_vi */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="don_vi">Đơn vị</Label>
                <Input
                  id="don_vi"
                  placeholder="VD: m2, kg, cái..."
                  {...createForm.register("don_vi", {
                    required: "Vui lòng nhập đơn vị",
                    setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                    minLength: { value: 1, message: "Không được để trống" },
                    maxLength: { value: 20, message: "Tối đa 20 ký tự" },
                  })}
                />
                {createErrors.don_vi ? (
                  <p className="text-xs text-red-500">
                    {createErrors.don_vi.message}
                  </p>
                ) : null}
              </div>

              {/* gia_nhap */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gia_nhap">Giá nhập</Label>
                <Input
                  id="gia_nhap"
                  type="number"
                  step="1"
                  min={0}
                  {...createForm.register("gia_nhap", {
                    required: "Vui lòng nhập giá nhập",
                    valueAsNumber: true,
                    min: { value: 0, message: "Giá nhập phải ≥ 0" },
                    validate: (v) =>
                      Number.isFinite(Number(v)) || "Giá nhập không hợp lệ",
                  })}
                />
                {createErrors.gia_nhap ? (
                  <p className="text-xs text-red-500">
                    {createErrors.gia_nhap.message}
                  </p>
                ) : null}
              </div>

              {/* ton_toi_thieu */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ton_toi_thieu">Tồn kho tối thiểu</Label>
                <Input
                  id="ton_toi_thieu"
                  type="number"
                  step="1"
                  min={0}
                  {...createForm.register("ton_toi_thieu", {
                    required: "Vui lòng nhập tồn kho tối thiểu",
                    valueAsNumber: true,
                    min: { value: 0, message: "Tồn kho tối thiểu phải ≥ 0" },
                    validate: (v) =>
                      Number.isFinite(Number(v)) ||
                      "Tồn kho tối thiểu không hợp lệ",
                  })}
                />
                {createErrors.ton_toi_thieu ? (
                  <p className="text-xs text-red-500">
                    {createErrors.ton_toi_thieu.message}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  creating ||
                  createMaterial.isPending ||
                  !createForm.formState.isValid
                }
              >
                Tạo mới
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADJUST MODAL */}
      <Dialog open={!!adjustItem} onOpenChange={(open) => { if (!open) setAdjustItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
          </DialogHeader>

          {adjustItem ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                <div><span className="font-medium">Mã:</span> {adjustItem.ma_nl}</div>
                <div><span className="font-medium">Tên:</span> {adjustItem.ten_nl}</div>
                <div><span className="font-medium">Tồn hiện tại:</span> {adjustItem.so_luong ?? 0} {adjustItem.don_vi}</div>
              </div>

              {/* Direction toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={adjustDirection === "add" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setAdjustDirection("add")}
                >
                  + Nhập thêm
                </Button>
                <Button
                  type="button"
                  variant={adjustDirection === "sub" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setAdjustDirection("sub")}
                >
                  - Xuất bớt
                </Button>
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <Label>Số lượng điều chỉnh</Label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value === "" ? "" : Math.abs(Number(e.target.value)))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <Label>Lý do điều chỉnh</Label>
                <Textarea
                  rows={3}
                  placeholder="Nhập lý do điều chỉnh..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>

              {/* Preview */}
              <div className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                Tồn kho sau điều chỉnh:{" "}
                <span className={`font-semibold ${adjustedStock < 0 ? "text-red-600" : "text-foreground"}`}>
                  {adjustedStock} {adjustItem.don_vi}
                </span>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustItem(null)}>Hủy</Button>
            <Button
              onClick={handleSubmitAdjust}
              disabled={createDieuChinhKho.isPending}
            >
              Gửi yêu cầu duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPDATE MODAL */}
      <Dialog
        open={isUpdateModalOpen}
        onOpenChange={(open) => {
          setIsUpdateModalOpen(open);
          if (!open) updateForm.reset();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cập nhật nguyên liệu</DialogTitle>
          </DialogHeader>

          <form onSubmit={updateForm.handleSubmit(handleUpdate)}>
            <input type="hidden" {...updateForm.register("_id")} />

            <div className="space-y-4">
              {/* ten_nl */}
              <div className="flex gap-2 flex-col">
                <Label htmlFor="u_ten_nl">Tên nguyên liệu</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="u_ten_nl"
                    {...updateForm.register("ten_nl", {
                      required: "Vui lòng nhập tên nguyên liệu",
                      setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                      minLength: { value: 2, message: "Tối thiểu 2 ký tự" },
                      maxLength: { value: 100, message: "Tối đa 100 ký tự" },
                    })}
                  />
                </div>
                {updateErrors.ten_nl ? (
                  <p className="text-xs text-red-500">
                    {updateErrors.ten_nl.message}
                  </p>
                ) : null}
              </div>

              {/* mo_ta */}
              <div className="flex gap-2 flex-col">
                <Label htmlFor="u_mo_ta">Mô tả</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="u_mo_ta"
                    {...updateForm.register("mo_ta", {
                      setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                      maxLength: { value: 255, message: "Tối đa 255 ký tự" },
                    })}
                  />
                </div>
                {updateErrors.mo_ta ? (
                  <p className="text-xs text-red-500">
                    {updateErrors.mo_ta.message}
                  </p>
                ) : null}
              </div>

              {/* don_vi */}
              <div className="flex gap-2 flex-col">
                <Label htmlFor="u_don_vi">Đơn vị</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="u_don_vi"
                    {...updateForm.register("don_vi", {
                      required: "Vui lòng nhập đơn vị",
                      setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                      minLength: { value: 1, message: "Không được để trống" },
                      maxLength: { value: 20, message: "Tối đa 20 ký tự" },
                    })}
                  />
                </div>
                {updateErrors.don_vi ? (
                  <p className="text-xs text-red-500">
                    {updateErrors.don_vi.message}
                  </p>
                ) : null}
              </div>

              {/* gia_nhap */}
              <div className="flex gap-2 flex-col">
                <Label htmlFor="u_gia_nhap">Giá nhập</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="u_gia_nhap"
                    type="number"
                    step="1"
                    min={0}
                    {...updateForm.register("gia_nhap", {
                      required: "Vui lòng nhập giá nhập",
                      valueAsNumber: true,
                      min: { value: 0, message: "Giá nhập phải ≥ 0" },
                      validate: (v) =>
                        Number.isFinite(Number(v)) || "Giá nhập không hợp lệ",
                    })}
                  />
                </div>
                {updateErrors.gia_nhap ? (
                  <p className="text-xs text-red-500">
                    {updateErrors.gia_nhap.message}
                  </p>
                ) : null}
              </div>

              {/* ton_toi_thieu */}
              <div className="flex gap-2 flex-col">
                <Label htmlFor="u_ton_toi_thieu">Tồn kho tối thiểu</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="u_ton_toi_thieu"
                    type="number"
                    step="1"
                    min={0}
                    {...updateForm.register("ton_toi_thieu", {
                      required: "Vui lòng nhập tồn kho tối thiểu",
                      valueAsNumber: true,
                      min: { value: 0, message: "Tồn kho tối thiểu phải ≥ 0" },
                      validate: (v) =>
                        Number.isFinite(Number(v)) ||
                        "Tồn kho tối thiểu không hợp lệ",
                    })}
                  />
                </div>
                {updateErrors.ton_toi_thieu ? (
                  <p className="text-xs text-red-500">
                    {updateErrors.ton_toi_thieu.message}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  updating ||
                  updateMaterial.isPending ||
                  !updateForm.formState.isValid
                }
              >
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
