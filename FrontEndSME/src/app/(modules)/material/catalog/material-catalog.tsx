"use client";

import { MoreHorizontal } from "lucide-react";
// import { IconEdit } from "@tabler/icons-react";
import React, { useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useForm } from "react-hook-form";

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterialById();
  const deleteMaterial = useDeleteMaterialById();

  const { data: myUser } = useMyProfile();

  const isDirectorDept = useMemo(() => {
    const deptName = (myUser?.phong_ban?.ten || "").trim();
    return deptName === "Phòng giám đốc";
  }, [myUser]);

  /* ===================== Fetch & filter ===================== */
  const { data, isLoading } = useMaterialCatalog({
    name: search,
    page,
    limit: 10,
  });

  const materialList = data?.items || [];
  const totalPages = data?.totalPages || 1;

  // NOTE: nếu backend đã filter theo name/search rồi thì đoạn này có thể bỏ
  const filteredList = materialList.filter((item: any) =>
    (item.ten_nl || "").toLowerCase().includes(search.toLowerCase())
  );

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

      {/* TABLE */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã nguyên liệu</TableHead>
              <TableHead>Tên nguyên liệu</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead className="text-right">Giá nhập</TableHead>
              {isDirectorDept ? (
                <TableHead className="text-right">Thao tác</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center p-6">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center p-6">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((s: any) => (
                <TableRow key={s._id}>
                  <TableCell>{s.ma_nl}</TableCell>
                  <TableCell>{s.ten_nl}</TableCell>
                  <TableCell>{s.mo_ta}</TableCell>
                  <TableCell>{s.don_vi}</TableCell>
                  <TableCell className="text-right">{s.gia_nhap}</TableCell>
                  {isDirectorDept ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem onClick={() => handleOpenUpdate(s)}>
                            Chỉnh sửa
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDelete(s._id)}
                            className="text-red-500"
                          >
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center items-center gap-3">
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Trước
        </Button>

        {Array.from({ length: totalPages }).map((_, index) => (
          <Button
            key={index}
            variant={page === index + 1 ? "default" : "outline"}
            onClick={() => setPage(index + 1)}
          >
            {index + 1}
          </Button>
        ))}

        <Button
          variant="outline"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau →
        </Button>
      </div>

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
