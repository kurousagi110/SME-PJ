"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { MoreHorizontal } from "lucide-react";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

import confirmToast from "@/components/confirm-toast";

import {
  useProductList,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/use-product";
import { useMaterialCatalog } from "@/hooks/use-material";
import { useCreateDieuChinhKho } from "@/hooks/use-dieu-chinh-kho";

import { useMyProfile } from "@/hooks/use-account";
import { DataTable } from "@/components/shared/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

/* ===================== Types ===================== */
type CongThucItem = {
  _id: string; // chỉ dùng cho UI key
  ma_nl?: string;
  ten: string; // Dùng thống nhất key 'ten'
  so_luong: number;
  don_vi: string;
};

type CreateProductForm = {
  ma_sp: string;
  ten_sp: string;
  mo_ta: string;
  don_gia: number | string;
};

type UpdateProductForm = {
  _id: string;
  ma_sp: string;
  ten_sp: string;
  mo_ta: string;
  don_gia: number | string;
};

function toNumber(v: any, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export default function ProductCatalog() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  /* ── Điều chỉnh kho modal state ── */
  const [adjustItem,      setAdjustItem]      = useState<any>(null);
  const [adjustDirection, setAdjustDirection] = useState<"add" | "sub">("add");
  const [adjustQty,       setAdjustQty]       = useState<number | "">(1);
  const [adjustReason,    setAdjustReason]    = useState("");
  const createDieuChinhKho = useCreateDieuChinhKho();

  /* ===================== Quyền: chỉ phòng giám đốc ===================== */
  const { data: myUser } = useMyProfile();
  const isDirectorDept = useMemo(() => {
    const deptName = (myUser?.phong_ban?.ten || "").trim();
    return deptName === "Phòng giám đốc";
  }, [myUser]);

  const guardDirector = () => {
    if (!isDirectorDept) {
      toast.error("Chỉ Phòng giám đốc mới được thực hiện thao tác này");
      return false;
    }
    return true;
  };

  /*====================== Hooks ======================*/
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  /* ===================== Fetch nguyên liệu ===================== */
  const { data: materialData } = useMaterialCatalog({
    name: "",
    page: 1,
    limit: 100,
  });

  const materialList = materialData?.items || [];

  /* ===================== Fetch danh sách sản phẩm ===================== */
  const { data: productData, isLoading: isProductLoading } = useProductList({
    name: search,
    page,
    limit,
  });

  const productList = (productData?.data as any)?.items || [];
  const pagination = {
    page,
    limit,
    total: (productData?.data as any)?.total ?? 0,
    totalPages: (productData?.data as any)?.totalPages ?? 1,
  };

  /* =========================================================
      CREATE FORM STATE
  ========================================================= */
  const [c_congThuc, setC_congThuc] = useState<CongThucItem[]>([]);
  const [c_isAddNlOpen, setC_isAddNlOpen] = useState(false);
  const [c_nlSelected, setC_nlSelected] = useState<string>("");
  const [c_nlQty, setC_nlQty] = useState<number>(1);

  const [c_isEditNlOpen, setC_isEditNlOpen] = useState(false);
  const [c_editIndex, setC_editIndex] = useState<number | null>(null);
  const [c_editQty, setC_editQty] = useState<number>(1);

  const createProductForm = useForm<CreateProductForm>({
    mode: "onChange",
    defaultValues: { ma_sp: "", ten_sp: "", mo_ta: "", don_gia: 0 },
  });

  const {
    formState: {
      errors: cErrors,
      isValid: cIsValid,
      isSubmitting: cSubmitting,
    },
  } = createProductForm;

  const c_handleAddNguyenLieu = () => {
    const nl = materialList.find((x: any) => x._id === c_nlSelected);
    const qty = toNumber(c_nlQty, 0);

    if (!nl) {
      toast.error("Vui lòng chọn nguyên liệu");
      return;
    }
    if (qty <= 0) {
      toast.error("Số lượng phải > 0");
      return;
    }

    setC_congThuc((prev) => {
      const idx = prev.findIndex((p) => (p.ma_nl || "") === (nl.ma_nl || ""));
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], so_luong: clone[idx].so_luong + qty };
        return clone;
      }
      return [
        ...prev,
        {
          _id: nl._id, // UI key
          ma_nl: nl.ma_nl,
          // FIX 2: Ưu tiên lấy ten, nếu không có lấy ten_nl
          ten: nl.ten || nl.ten_nl || "Nguyên liệu",
          don_vi: nl.don_vi ?? "",
          so_luong: qty,
        },
      ];
    });

    setC_isAddNlOpen(false);
    setC_nlSelected("");
    setC_nlQty(1);
  };

  const c_handleDeleteNl = (_id: string) => {
    setC_congThuc((prev) => prev.filter((x) => x._id !== _id));
  };

  const c_openEditNl = (index: number) => {
    setC_editIndex(index);
    setC_editQty(c_congThuc[index]?.so_luong ?? 1);
    setC_isEditNlOpen(true);
  };

  const c_handleSaveEditNl = () => {
    if (c_editIndex === null) return;
    const qty = toNumber(c_editQty, 0);
    if (qty <= 0) {
      toast.error("Số lượng phải > 0");
      return;
    }
    setC_congThuc((prev) => {
      const clone = [...prev];
      clone[c_editIndex] = { ...clone[c_editIndex], so_luong: qty };
      return clone;
    });
    setC_isEditNlOpen(false);
    setC_editIndex(null);
    setC_editQty(1);
  };

  const handleConfirmCreate = (values: CreateProductForm) => {
    if (!guardDirector()) return;

    if (c_congThuc.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 nguyên liệu vào công thức");
      return;
    }

    const payload = {
      ...values,
      ma_sp: values.ma_sp.trim(),
      ten_sp: values.ten_sp.trim(),
      mo_ta: (values.mo_ta || "").trim(),
      don_gia: toNumber(values.don_gia, 0),
      // Gửi lên server mảng nguyên liệu với key 'ten'
      nguyen_lieu: c_congThuc.map(({ _id, ...rest }) => rest),
    };

    createProductMutation.mutate(payload as any, {
      onSuccess: () => {
        toast.success("Tạo sản phẩm thành công");
        setIsCreateModalOpen(false);
        createProductForm.reset();
        setC_congThuc([]);
      },
      onError: (err: any) =>
        toast.error(err?.message || "Tạo sản phẩm thất bại"),
    });
  };

  /* =========================================================
      UPDATE (EDIT) FORM STATE
  ========================================================= */
  const [u_congThuc, setU_congThuc] = useState<CongThucItem[]>([]);
  const [u_isAddNlOpen, setU_isAddNlOpen] = useState(false);
  const [u_nlSelected, setU_nlSelected] = useState<string>("");
  const [u_nlQty, setU_nlQty] = useState<number>(1);

  const [u_isEditNlOpen, setU_isEditNlOpen] = useState(false);
  const [u_editIndex, setU_editIndex] = useState<number | null>(null);
  const [u_editQty, setU_editQty] = useState<number>(1);

  const updateProductForm = useForm<UpdateProductForm>({
    mode: "onChange",
    defaultValues: { _id: "", ma_sp: "", ten_sp: "", mo_ta: "", don_gia: 0 },
  });

  const {
    formState: {
      errors: uErrors,
      isValid: uIsValid,
      isSubmitting: uSubmitting,
    },
  } = updateProductForm;

  const openUpdateDialog = (product: any) => {
    if (!guardDirector()) return;

    updateProductForm.reset({
      _id: product._id,
      ma_sp: product.ma_sp ?? "",
      ten_sp: product.ten_sp ?? "",
      mo_ta: product.mo_ta ?? "",
      don_gia: product.don_gia ?? 0,
    });

    // map API -> UI: đảm bảo có ma_nl nếu API có
    const uiCongThuc: CongThucItem[] = (product.nguyen_lieu || []).map(
      (nl: any, idx: number) => ({
        _id: `${product._id}-${idx}`, // UI key tạm
        ma_nl: nl.ma_nl ?? "",
        // FIX 3: Khi load lại, ưu tiên lấy 'ten' (nếu DB đã sửa) hoặc 'ten_nl'
        ten: nl.ten || nl.ten_nl || "",
        don_vi: nl.don_vi ?? "",
        so_luong: toNumber(nl.so_luong, 0),
      })
    );

    setU_congThuc(uiCongThuc);

    setU_isAddNlOpen(false);
    setU_nlSelected("");
    setU_nlQty(1);
    setU_isEditNlOpen(false);
    setU_editIndex(null);
    setU_editQty(1);

    setIsUpdateModalOpen(true);
  };

  const closeUpdateDialog = () => {
    setIsUpdateModalOpen(false);
    updateProductForm.reset();
    setU_congThuc([]);
  };

  const u_handleAddNguyenLieu = () => {
    const nl = materialList.find((x: any) => x._id === u_nlSelected);
    const qty = toNumber(u_nlQty, 0);

    if (!nl) {
      toast.error("Vui lòng chọn nguyên liệu");
      return;
    }
    if (qty <= 0) {
      toast.error("Số lượng phải > 0");
      return;
    }

    setU_congThuc((prev) => {
      const idx = prev.findIndex((p) => (p.ma_nl || "") === (nl.ma_nl || ""));
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], so_luong: clone[idx].so_luong + qty };
        return clone;
      }
      return [
        ...prev,
        {
          _id: nl._id, // UI key
          ma_nl: nl.ma_nl,
          // FIX 4: Mapping cho phần Update
          ten: nl.ten || nl.ten_nl || "Nguyên liệu",
          don_vi: nl.don_vi ?? "",
          so_luong: qty,
        },
      ];
    });

    setU_isAddNlOpen(false);
    setU_nlSelected("");
    setU_nlQty(1);
  };

  const u_handleDeleteNl = (_id: string) => {
    setU_congThuc((prev) => prev.filter((x) => x._id !== _id));
  };

  const u_openEditNl = (index: number) => {
    setU_editIndex(index);
    setU_editQty(u_congThuc[index]?.so_luong ?? 1);
    setU_isEditNlOpen(true);
  };

  const u_handleSaveEditNl = () => {
    if (u_editIndex === null) return;
    const qty = toNumber(u_editQty, 0);
    if (qty <= 0) {
      toast.error("Số lượng phải > 0");
      return;
    }

    setU_congThuc((prev) => {
      const clone = [...prev];
      clone[u_editIndex] = { ...clone[u_editIndex], so_luong: qty };
      return clone;
    });

    setU_isEditNlOpen(false);
    setU_editIndex(null);
    setU_editQty(1);
  };

  const handleConfirmUpdate = (values: UpdateProductForm) => {
    if (!guardDirector()) return;

    if (u_congThuc.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 nguyên liệu vào công thức");
      return;
    }

    const payload = {
      ...values,
      ma_sp: values.ma_sp.trim(),
      ten_sp: values.ten_sp.trim(),
      mo_ta: (values.mo_ta || "").trim(),
      don_gia: toNumber(values.don_gia, 0),
      nguyen_lieu: u_congThuc.map(({ _id, ...rest }) => rest),
    };

    updateProductMutation.mutate(payload as any, {
      onSuccess: () => {
        toast.success("Cập nhật sản phẩm thành công");
        closeUpdateDialog();
      },
      onError: (err: any) => toast.error(err?.message || "Cập nhật thất bại"),
    });
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (!guardDirector()) return;

    confirmToast(
      "Xác nhận xóa sản phẩm",
      <>
        Bạn có chắc chắn muốn xóa sản phẩm{" "}
        <span className="font-semibold">{name}</span> không? Hành động này không
        thể hoàn tác.
      </>,
      () => {
        deleteProductMutation.mutate(id, {
          onSuccess: () => toast.success("Xóa sản phẩm thành công"),
          onError: (err: any) => toast.error(err?.message || "Xóa thất bại"),
        });
      }
    );
  };

  /* ── Điều chỉnh kho handlers ── */
  const adjustedStockProduct = useMemo(() => {
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
        loai:                "san_pham",
        item_id:             adjustItem._id,
        ma_hang:             adjustItem.ma_sp,
        ten_hang:            adjustItem.ten_sp,
        so_luong_dieu_chinh: delta,
        ton_kho_truoc:       adjustItem.so_luong ?? 0,
        ly_do:               adjustReason.trim(),
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

  /* ===================== Columns ===================== */
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const base: ColumnDef<any>[] = [
      { accessorKey: "ma_sp", header: "Mã sản phẩm", size: 140 },
      { accessorKey: "ten_sp", header: "Tên sản phẩm" },
      { accessorKey: "mo_ta", header: "Mô tả" },
      {
        accessorKey: "don_gia",
        header: "Đơn giá",
        cell: ({ getValue }) =>
          (getValue<number>() ?? 0).toLocaleString("vi-VN"),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const s = row.original;
          return (
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
                  <DropdownMenuItem onClick={() => handleOpenAdjust(s)}>
                    ⚖️ Điều chỉnh kho
                  </DropdownMenuItem>
                  {isDirectorDept ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openUpdateDialog(s)}>
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => handleDeleteProduct(s._id, s.ten_sp)}
                      >
                        Xóa
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];
    return base;
  }, [isDirectorDept, openUpdateDialog, handleDeleteProduct, handleOpenAdjust]);

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

        {isDirectorDept ? (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            + Tạo mới sản phẩm
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={productList}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        loading={isProductLoading}
      />

      {/* ======================= */}
      {/* CREATE DIALOG */}
      {/* ======================= */}
      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(v) => {
          if (v && !isDirectorDept) {
            toast.error("Chỉ Phòng giám đốc mới được tạo mới danh mục");
            return;
          }
          setIsCreateModalOpen(v);
          if (!v) {
            createProductForm.reset();
            setC_congThuc([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tạo mới sản phẩm</DialogTitle>
          </DialogHeader>

          <form onSubmit={createProductForm.handleSubmit(handleConfirmCreate)}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Mã sản phẩm</Label>
                <Input
                  id="ma_sp"
                  placeholder="VD: SP001"
                  {...createProductForm.register("ma_sp", {
                    required: "Vui lòng nhập mã sản phẩm",
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
                {cErrors.ma_sp ? (
                  <p className="text-xs text-red-500">
                    {cErrors.ma_sp.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Tên sản phẩm</Label>
                <Input
                  id="ten_sp"
                  placeholder="VD: Bàn làm việc MDF"
                  {...createProductForm.register("ten_sp", {
                    required: "Vui lòng nhập tên sản phẩm",
                    setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                    minLength: { value: 2, message: "Tối thiểu 2 ký tự" },
                    maxLength: { value: 120, message: "Tối đa 120 ký tự" },
                  })}
                />
                {cErrors.ten_sp ? (
                  <p className="text-xs text-red-500">
                    {cErrors.ten_sp.message}
                  </p>
                ) : null}
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Mô tả</Label>
                <Textarea
                  id="mo_ta"
                  placeholder="(không bắt buộc)"
                  {...createProductForm.register("mo_ta", {
                    setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                    maxLength: { value: 1000, message: "Tối đa 1000 ký tự" },
                  })}
                />
                {cErrors.mo_ta ? (
                  <p className="text-xs text-red-500">
                    {cErrors.mo_ta.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Đơn giá</Label>
                <Input
                  type="number"
                  min={0}
                  id="don_gia"
                  {...createProductForm.register("don_gia", {
                    required: "Vui lòng nhập đơn giá",
                    valueAsNumber: true,
                    min: { value: 0, message: "Đơn giá phải ≥ 0" },
                    validate: (v) =>
                      Number.isFinite(Number(v)) || "Đơn giá không hợp lệ",
                  })}
                />
                {cErrors.don_gia ? (
                  <p className="text-xs text-red-500">
                    {cErrors.don_gia.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Công thức */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Công thức</div>
                  <div className="text-sm text-muted-foreground">
                    Thêm nguyên liệu và số lượng.
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setC_isAddNlOpen(true)}
                >
                  + Thêm nguyên liệu
                </Button>
              </div>

              {c_congThuc.length === 0 ? (
                <p className="text-sm text-red-500">
                  * Vui lòng thêm ít nhất 1 nguyên liệu vào công thức
                </p>
              ) : null}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên nguyên liệu</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c_congThuc.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center p-6 text-muted-foreground"
                        >
                          Chưa có công thức.
                        </TableCell>
                      </TableRow>
                    ) : (
                      c_congThuc.map((row, idx) => (
                        <TableRow key={row._id}>
                          <TableCell className="font-medium">
                            {row.ten}
                          </TableCell>
                          <TableCell>{row.don_vi || "-"}</TableCell>
                          <TableCell className="text-right">
                            {row.so_luong}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => c_openEditNl(idx)}
                              >
                                <IconEdit className="h-5 w-5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => c_handleDeleteNl(row._id)}
                              >
                                <IconTrash className="h-5 w-5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
                  cSubmitting ||
                  createProductMutation.isPending ||
                  !cIsValid ||
                  c_congThuc.length === 0
                }
              >
                Xác nhận
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD NL (CREATE) */}
      <Dialog open={c_isAddNlOpen} onOpenChange={setC_isAddNlOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm nguyên liệu</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nguyên liệu</Label>
              <Select value={c_nlSelected} onValueChange={setC_nlSelected}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nguyên liệu..." />
                </SelectTrigger>
                <SelectContent>
                  {materialList.map((nl: any) => (
                    <SelectItem key={nl._id} value={nl._id}>
                      {/* FIX 5: Hiển thị đúng tên */}
                      {nl.ma_nl} - {nl.ten || nl.ten_nl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Số lượng</Label>
              <Input
                type="number"
                min={0}
                value={c_nlQty}
                onChange={(e) => setC_nlQty(toNumber(e.target.value, 1))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setC_isAddNlOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={c_handleAddNguyenLieu}
              disabled={!c_nlSelected || toNumber(c_nlQty, 0) <= 0}
            >
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT QTY (CREATE) */}
      <Dialog open={c_isEditNlOpen} onOpenChange={setC_isEditNlOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa số lượng</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Số lượng</Label>
            <Input
              type="number"
              min={0}
              value={c_editQty}
              onChange={(e) => setC_editQty(toNumber(e.target.value, 1))}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setC_isEditNlOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={c_handleSaveEditNl}
              disabled={toNumber(c_editQty, 0) <= 0}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================= */}
      {/* UPDATE (EDIT) DIALOG */}
      {/* ======================= */}
      <Dialog
        open={isUpdateModalOpen}
        onOpenChange={(v) => {
          if (v && !isDirectorDept) {
            toast.error("Chỉ Phòng giám đốc mới được thực hiện thao tác");
            return;
          }
          v ? setIsUpdateModalOpen(true) : closeUpdateDialog();
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa sản phẩm</DialogTitle>
          </DialogHeader>

          <form onSubmit={updateProductForm.handleSubmit(handleConfirmUpdate)}>
            <input type="hidden" {...updateProductForm.register("_id")} />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Mã sản phẩm</Label>
                <Input
                  {...updateProductForm.register("ma_sp", {
                    required: "Vui lòng nhập mã sản phẩm",
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
                {uErrors.ma_sp ? (
                  <p className="text-xs text-red-500">
                    {uErrors.ma_sp.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Tên sản phẩm</Label>
                <Input
                  {...updateProductForm.register("ten_sp", {
                    required: "Vui lòng nhập tên sản phẩm",
                    setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                    minLength: { value: 2, message: "Tối thiểu 2 ký tự" },
                    maxLength: { value: 120, message: "Tối đa 120 ký tự" },
                  })}
                />
                {uErrors.ten_sp ? (
                  <p className="text-xs text-red-500">
                    {uErrors.ten_sp.message}
                  </p>
                ) : null}
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Mô tả</Label>
                <Textarea
                  {...updateProductForm.register("mo_ta", {
                    setValueAs: (v) => (typeof v === "string" ? v.trim() : v),
                    maxLength: { value: 1000, message: "Tối đa 1000 ký tự" },
                  })}
                />
                {uErrors.mo_ta ? (
                  <p className="text-xs text-red-500">
                    {uErrors.mo_ta.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Đơn giá</Label>
                <Input
                  type="number"
                  min={0}
                  {...updateProductForm.register("don_gia", {
                    required: "Vui lòng nhập đơn giá",
                    valueAsNumber: true,
                    min: { value: 0, message: "Đơn giá phải ≥ 0" },
                    validate: (v) =>
                      Number.isFinite(Number(v)) || "Đơn giá không hợp lệ",
                  })}
                />
                {uErrors.don_gia ? (
                  <p className="text-xs text-red-500">
                    {uErrors.don_gia.message}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Công thức */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Công thức</div>
                  <div className="text-sm text-muted-foreground">
                    Thêm nguyên liệu và số lượng.
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setU_isAddNlOpen(true)}
                >
                  + Thêm nguyên liệu
                </Button>
              </div>

              {u_congThuc.length === 0 ? (
                <p className="text-sm text-red-500">
                  * Vui lòng thêm ít nhất 1 nguyên liệu vào công thức
                </p>
              ) : null}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên nguyên liệu</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {u_congThuc.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center p-6 text-muted-foreground"
                        >
                          Chưa có công thức.
                        </TableCell>
                      </TableRow>
                    ) : (
                      u_congThuc.map((row, idx) => (
                        <TableRow key={row._id}>
                          <TableCell className="font-medium">
                            {row.ten}
                          </TableCell>
                          <TableCell>{row.don_vi || "-"}</TableCell>
                          <TableCell className="text-right">
                            {row.so_luong}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => u_openEditNl(idx)}
                              >
                                <IconEdit className="h-5 w-5" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => u_handleDeleteNl(row._id)}
                              >
                                <IconTrash className="h-5 w-5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={closeUpdateDialog}>
                Hủy
              </Button>

              <Button
                type="submit"
                disabled={
                  uSubmitting ||
                  updateProductMutation.isPending ||
                  !uIsValid ||
                  u_congThuc.length === 0
                }
              >
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD NL (UPDATE) */}
      <Dialog open={u_isAddNlOpen} onOpenChange={setU_isAddNlOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm nguyên liệu</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nguyên liệu</Label>
              <Select value={u_nlSelected} onValueChange={setU_nlSelected}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nguyên liệu..." />
                </SelectTrigger>
                <SelectContent>
                  {materialList.map((nl: any) => (
                    <SelectItem key={nl._id} value={nl._id}>
                      {/* FIX 5: Hiển thị đúng tên */}
                      {nl.ma_nl} - {nl.ten || nl.ten_nl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Số lượng</Label>
              <Input
                type="number"
                min={0}
                value={u_nlQty}
                onChange={(e) => setU_nlQty(toNumber(e.target.value, 1))}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setU_isAddNlOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={u_handleAddNguyenLieu}
              disabled={!u_nlSelected || toNumber(u_nlQty, 0) <= 0}
            >
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT QTY (UPDATE) */}
      <Dialog open={u_isEditNlOpen} onOpenChange={setU_isEditNlOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa số lượng</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Số lượng</Label>
            <Input
              type="number"
              min={0}
              value={u_editQty}
              onChange={(e) => setU_editQty(toNumber(e.target.value, 1))}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setU_isEditNlOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={u_handleSaveEditNl}
              disabled={toNumber(u_editQty, 0) <= 0}
            >
              Lưu
            </Button>
          </DialogFooter>
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
                <div><span className="font-medium">Mã:</span> {adjustItem.ma_sp}</div>
                <div><span className="font-medium">Tên:</span> {adjustItem.ten_sp}</div>
                <div><span className="font-medium">Tồn hiện tại:</span> {adjustItem.so_luong ?? 0} cái</div>
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
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={adjustQty}
                  onChange={(e) =>
                    setAdjustQty(e.target.value === "" ? "" : Math.abs(toNumber(e.target.value, 1)))
                  }
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
                <span className={`font-semibold ${adjustedStockProduct < 0 ? "text-red-600" : "text-foreground"}`}>
                  {adjustedStockProduct} cái
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
    </div>
  );
}
