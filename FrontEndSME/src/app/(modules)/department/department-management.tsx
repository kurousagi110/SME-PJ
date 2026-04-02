"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useMyProfile } from "@/hooks/use-account";
import {
  useCreateDepartment,
  useUpdateDepartments,
  useDeleteDepartment,
  useDepartmentsAndPositions,
  useCreatePosition,
  useDeletePosition,
  useUpdatePosition,
  useDepartmentById,
} from "@/hooks/use-department-position";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import confirmToast from "@/components/confirm-toast";
import { Separator } from "@/components/ui/separator";

import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";

import { MoreHorizontal } from "lucide-react";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import { toast } from "sonner";

/* ===================== Zod Schemas ===================== */
export const positionSchema = z.object({
  ten_chuc_vu: z.string().min(1, "Tên chức vụ không được để trống"),
  mo_ta: z.string().optional(),
  he_so_luong: z.number().min(0.1, "Hệ số lương phải ≥ 0.1"),
});

export const createDepartmentSchema = z.object({
  ten_phong_ban: z.string().min(1, "Tên phòng ban không được để trống"),
  mo_ta: z.string().optional(),
  chuc_vu: z.array(positionSchema).min(0),
});

/* ===================== Types ===================== */
type Position = {
  ten_chuc_vu: string;
  mo_ta?: string;
  he_so_luong: number;
};

type DepartmentFormValues = {
  ten_phong_ban: string;
  mo_ta?: string;
  chuc_vu: Position[];
};

export function DepartmentManagement() {
  // ============================
  // STATE FILTERS
  // ============================
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [mode, setMode] = useState<
    "create-department" | "update-department" | "edit-position" | null
  >(null);

  // danh sách chức vụ tạm khi tạo phòng ban
  const [position, setPosition] = useState<Position[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);

  const { data: profile } = useMyProfile();

  const [deptLock, setDeptLock] = useState({
    ten_phong_ban: true,
    mo_ta: true,
  });

  const [posLock, setPosLock] = useState({
    ten_chuc_vu: true,
    mo_ta: true,
    he_so_luong: true,
  });

  // ============================
  // FETCH DEPARTMENTS + POSITIONS
  // ============================
  const { data, isLoading } = useDepartmentsAndPositions({
    name: search,
    page,
    limit,
  });

  const departmentList = data?.data?.items || [];
  const totalPages = data?.data?.totalPages || 1;

  const { data: departmentData } = useDepartmentById(
    selectedDepartment?._id || ""
  );

  // ============================
  // MODALS
  // ============================
  const [openCreateDepartmentModal, setOpenCreateDepartmentModal] =
    useState(false);
  const [openViewDepartmentModal, setOpenViewDepartmentModal] = useState(false);
  const [openUpdateDepartmentModal, setOpenUpdateDepartmentModal] =
    useState(false);
  const [openPositionModal, setOpenPositionModal] = useState(false);

  // ============================
  // MUTATIONS
  // ============================
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartments();
  const deleteDepartment = useDeleteDepartment();

  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  // ============================
  // FORMS
  // ============================
  const createDepartmentForm = useForm<z.infer<typeof createDepartmentSchema>>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      ten_phong_ban: "",
      mo_ta: "",
      chuc_vu: [],
    },
  });

  const updateDepartmentForm = useForm<DepartmentFormValues>({
    defaultValues: {
      ten_phong_ban: "",
      mo_ta: "",
      chuc_vu: [],
    },
  });

  const positionForm = useForm<z.infer<typeof positionSchema>>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      ten_chuc_vu: "",
      mo_ta: "",
      he_so_luong: 0.1,
    },
  });

  // ============================
  // HANDLERS
  // ============================
  const handleCreateDepartment = (
    values: z.infer<typeof createDepartmentSchema>
  ) => {
    const body = {
      ten_phong_ban: values.ten_phong_ban,
      mo_ta: values.mo_ta,
      chuc_vu: position,
    };

    createDepartment.mutate(body, {
      onSuccess: () => {
        toast.success("Thêm phòng ban thành công");
        setOpenCreateDepartmentModal(false);
        setPosition([]);
        createDepartmentForm.reset();
      },
    });
  };

  const handlePositionForm = (values: z.infer<typeof positionSchema>) => {
    const baseBody = {
      ten_chuc_vu: values.ten_chuc_vu,
      mo_ta: values.mo_ta,
      he_so_luong: values.he_so_luong,
    };

    // MODE 1: tạo phòng ban -> thêm chức vụ vào state tạm
    if (mode === "create-department") {
      setPosition((prev) => [...prev, baseBody]);
      positionForm.reset({ ten_chuc_vu: "", mo_ta: "", he_so_luong: 0.1 });
      setOpenPositionModal(false);
      return;
    }

    // MODE 2: update phòng ban -> thêm chức vụ vào phòng ban (API)
    if (mode === "update-department") {
      if (!selectedDepartment?._id) return;

      createPosition.mutate(
        {
          idDepartment: selectedDepartment._id,
          data: baseBody,
        },
        {
          onSuccess: () => {
            toast.success("Thêm chức vụ thành công");
            setOpenPositionModal(false);
            positionForm.reset({
              ten_chuc_vu: "",
              mo_ta: "",
              he_so_luong: 0.1,
            });
          },
        }
      );
      return;
    }

    // MODE 3: edit-position -> chỉ update field nào dirty
    if (mode === "edit-position") {
      if (!selectedDepartment?._id || !selectedPosition?._id) return;

      const { dirtyFields } = positionForm.formState;

      // không sửa gì
      if (
        !dirtyFields.ten_chuc_vu &&
        !dirtyFields.mo_ta &&
        !dirtyFields.he_so_luong
      ) {
        setOpenPositionModal(false);
        return;
      }

      const updateBody: any = {};
      if (dirtyFields.ten_chuc_vu) updateBody.ten_chuc_vu = values.ten_chuc_vu;
      if (dirtyFields.mo_ta) updateBody.mo_ta = values.mo_ta;
      if (dirtyFields.he_so_luong) updateBody.he_so_luong = values.he_so_luong;

      updatePosition.mutate(
        {
          idDepartment: selectedDepartment._id,
          idPosition: selectedPosition._id,
          data: updateBody,
        },
        {
          onSuccess: () => {
            toast.success("Cập nhật chức vụ thành công");
            setSelectedPosition(null);
            setOpenPositionModal(false);
            positionForm.reset({
              ten_chuc_vu: "",
              mo_ta: "",
              he_so_luong: 0.1,
            });
            setPosLock({ ten_chuc_vu: true, mo_ta: true, he_so_luong: true });
          },
        }
      );
    }
  };

  const handleUpdateDepartment = (values: any) => {
    const { dirtyFields } = updateDepartmentForm.formState;

    if (!dirtyFields.ten_phong_ban && !dirtyFields.mo_ta) {
      setOpenUpdateDepartmentModal(false);
      setSelectedDepartment(null);
      setDeptLock({ ten_phong_ban: true, mo_ta: true });
      return;
    }

    const body: any = {};

    // gửi field nào thay đổi; field không thay đổi thì lấy từ current
    body.ten_phong_ban = dirtyFields.ten_phong_ban
      ? values.ten_phong_ban
      : departmentData?.data?.ten_phong_ban;

    body.mo_ta = dirtyFields.mo_ta ? values.mo_ta : departmentData?.data?.mo_ta;

    body.trang_thai = "active";

    updateDepartment.mutate(
      { idDepartment: departmentData?.data?._id, data: body },
      {
        onSuccess: () => {
          toast.success("Cập nhật phòng ban thành công");
          setOpenUpdateDepartmentModal(false);
          setSelectedDepartment(null);
          setDeptLock({ ten_phong_ban: true, mo_ta: true });
        },
      }
    );
  };

  const handleViewDepartment = (s: any) => {
    setSelectedDepartment(s);
    setOpenViewDepartmentModal(true);
  };

  const handleDeleteDepartment = (id: string) => {
    confirmToast(
      "Xác nhận xóa phòng ban",
      "Bạn có chắc muốn xóa phòng ban này không?",
      () => {
        deleteDepartment.mutate(id, {
          onSuccess: () => {
            toast.success("Xóa phòng ban thành công");
          },
        });
      }
    );
  };

  const handleDeletePosition = (id: string) => {
    confirmToast(
      "Xác nhận xóa chức vụ",
      "Bạn có chắc muốn xóa chức vụ này không?",
      () => {
        deletePosition.mutate(
          { idDepartment: selectedDepartment._id, idPosition: id },
          {
            onSuccess: () => {
              toast.success("Xóa chức vụ thành công");
            },
          }
        );
      }
    );
  };

  // ============================
  // FILTER SEARCH CLIENT
  // ============================
  const filteredList = departmentList.filter((s: any) =>
    (s.ten_phong_ban || "").toLowerCase().includes(search.toLowerCase())
  );

  // ============================
  // PERMISSION (button create)
  // ============================
  const canCreateDepartment =
    profile?.phong_ban?.ten === "Phòng giám đốc" ||
    (profile?.chuc_vu?.ten || "").toLowerCase().includes("trưởng phòng");

  return (
    <div className="p-6 space-y-5">
      {/* ======================= */}
      {/* FILTER + BUTTON CREATE */}
      {/* ======================= */}
      <div className="flex justify-between items-center">
        <Input
          placeholder="Tìm theo tên..."
          className="w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <Button
            disabled={!canCreateDepartment}
            onClick={() => {
              setMode("create-department");
              setOpenCreateDepartmentModal(true);
              setPosLock({ ten_chuc_vu: true, mo_ta: true, he_so_luong: true });
            }}
          >
            + Thêm Phòng ban
          </Button>
        </div>
      </div>

      {/* ======================= */}
      {/* TABLE DEPARTMENT */}
      {/* ======================= */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên phòng ban</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Ngày chỉnh sửa</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-6">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-6">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((s: any) => (
                <TableRow key={s._id}>
                  <TableCell>{s.ten_phong_ban}</TableCell>
                  <TableCell>{s.mo_ta}</TableCell>
                  <TableCell>
                    {s.createAt
                      ? format(new Date(s.createAt), "HH:mm:ss dd/MM/yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {s.updateAt
                      ? format(new Date(s.updateAt), "HH:mm:ss dd/MM/yyyy")
                      : "-"}
                  </TableCell>

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

                        <DropdownMenuItem
                          onClick={() => handleViewDepartment(s)}
                        >
                          Xem chi tiết
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setOpenUpdateDepartmentModal(true);
                            setSelectedDepartment(s);
                            setDeptLock({ ten_phong_ban: true, mo_ta: true });

                            updateDepartmentForm.reset(
                              {
                                ten_phong_ban: s.ten_phong_ban,
                                mo_ta: s.mo_ta,
                                chuc_vu: s.chuc_vu || [],
                              },
                              { keepDirty: false, keepTouched: false }
                            );
                          }}
                        >
                          Chỉnh sửa
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleDeleteDepartment(s._id)}
                          className="text-red-500"
                        >
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ======================= */}
      {/* PAGINATION */}
      {/* ======================= */}
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

      {/* ======================= */}
      {/* MODAL CREATE DEPARTMENT */}
      {/* ======================= */}
      <Dialog
        open={openCreateDepartmentModal}
        onOpenChange={(v) => {
          setOpenCreateDepartmentModal(v);
          if (!v) {
            createDepartmentForm.reset();
            setPosition([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm phòng ban</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={createDepartmentForm.handleSubmit(handleCreateDepartment)}
            className="space-y-4"
          >
            <Input
              placeholder="Tên phòng ban"
              {...createDepartmentForm.register("ten_phong_ban")}
            />
            {createDepartmentForm.formState.errors.ten_phong_ban && (
              <p className="text-sm text-red-500">
                {createDepartmentForm.formState.errors.ten_phong_ban.message}
              </p>
            )}

            <Textarea
              placeholder="Mô tả"
              {...createDepartmentForm.register("mo_ta")}
            />
            {createDepartmentForm.formState.errors.mo_ta && (
              <p className="text-sm text-red-500">
                {createDepartmentForm.formState.errors.mo_ta.message}
              </p>
            )}

            <Separator />

            <div className="flex gap-2 items-center">
              <Button
                type="button"
                onClick={() => {
                  setMode("create-department");
                  setOpenPositionModal(true);
                  setPosLock({
                    ten_chuc_vu: true,
                    mo_ta: true,
                    he_so_luong: true,
                  });
                  positionForm.reset(
                    { ten_chuc_vu: "", mo_ta: "", he_so_luong: 0.1 },
                    { keepDirty: false, keepTouched: false }
                  );
                }}
              >
                Thêm chức vụ
              </Button>
              <DialogDescription>
                Thêm một chức vụ vào phòng ban này
              </DialogDescription>
            </div>

            {position.length === 0 && (
              <p className="text-sm text-gray-500">
                Chưa có chức vụ nào được thêm
              </p>
            )}

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {position.map((p: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <p>
                      <span className="font-bold">Tên chức vụ:</span>{" "}
                      {p.ten_chuc_vu}
                    </p>

                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => {
                        setPosition((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                    >
                      <IconTrash className="w-4 h-4" />
                    </Button>
                  </div>
                  <p>Mô tả: {p.mo_ta || "-"}</p>
                  <p>Hệ số lương: {p.he_so_luong}</p>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setOpenCreateDepartmentModal(false);
                  setPosition([]);
                  createDepartmentForm.reset();
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createDepartment.isPending}>
                {createDepartment.isPending ? "Đang thêm..." : "Thêm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================= */}
      {/* MODAL POSITION (ADD/EDIT) */}
      {/* ======================= */}
      <Dialog
        open={openPositionModal}
        onOpenChange={(v) => {
          setOpenPositionModal(v);
          if (!v) {
            positionForm.reset({
              ten_chuc_vu: "",
              mo_ta: "",
              he_so_luong: 0.1,
            });
            setSelectedPosition(null);
            setPosLock({ ten_chuc_vu: true, mo_ta: true, he_so_luong: true });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit-position" ? "Chỉnh sửa chức vụ" : "Thêm chức vụ"}
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={positionForm.handleSubmit(handlePositionForm)}
          >
            {/* ten_chuc_vu */}
            <div
              className={
                mode === "edit-position" ? "flex gap-2 items-center" : ""
              }
            >
              <Input
                placeholder="Tên chức vụ"
                disabled={
                  mode === "edit-position" ? posLock.ten_chuc_vu : false
                }
                {...positionForm.register("ten_chuc_vu")}
              />
              {mode === "edit-position" && (
                <Button
                  type="button"
                  onClick={() =>
                    setPosLock((p) => ({ ...p, ten_chuc_vu: !p.ten_chuc_vu }))
                  }
                  title={posLock.ten_chuc_vu ? "Mở khóa" : "Khóa lại"}
                >
                  <IconEdit className="w-4 h-4" />
                </Button>
              )}
            </div>
            {positionForm.formState.errors.ten_chuc_vu && (
              <p className="text-sm text-red-500">
                {positionForm.formState.errors.ten_chuc_vu.message}
              </p>
            )}

            {/* mo_ta */}
            <div
              className={
                mode === "edit-position" ? "flex gap-2 items-center" : ""
              }
            >
              <Textarea
                placeholder="Mô tả"
                disabled={mode === "edit-position" ? posLock.mo_ta : false}
                {...positionForm.register("mo_ta")}
              />
              {mode === "edit-position" && (
                <Button
                  type="button"
                  onClick={() => setPosLock((p) => ({ ...p, mo_ta: !p.mo_ta }))}
                  title={posLock.mo_ta ? "Mở khóa" : "Khóa lại"}
                >
                  <IconEdit className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* he_so_luong */}
            <div
              className={
                mode === "edit-position" ? "flex gap-2 items-center" : ""
              }
            >
              <Input
                placeholder="Hệ số lương"
                type="number"
                inputMode="decimal"
                step="any"
                disabled={
                  mode === "edit-position" ? posLock.he_so_luong : false
                }
                {...positionForm.register("he_so_luong", {
                  valueAsNumber: true,
                })}
              />
              {mode === "edit-position" && (
                <Button
                  type="button"
                  onClick={() =>
                    setPosLock((p) => ({
                      ...p,
                      he_so_luong: !p.he_so_luong,
                    }))
                  }
                  title={posLock.he_so_luong ? "Mở khóa" : "Khóa lại"}
                >
                  <IconEdit className="w-4 h-4" />
                </Button>
              )}
            </div>
            {positionForm.formState.errors.he_so_luong && (
              <p className="text-sm text-red-500">
                {positionForm.formState.errors.he_so_luong.message}
              </p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setOpenPositionModal(false);
                  positionForm.reset({
                    ten_chuc_vu: "",
                    mo_ta: "",
                    he_so_luong: 0.1,
                  });
                  setSelectedPosition(null);
                  setPosLock({
                    ten_chuc_vu: true,
                    mo_ta: true,
                    he_so_luong: true,
                  });
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createPosition.isPending || updatePosition.isPending}
              >
                {mode === "edit-position"
                  ? updatePosition.isPending
                    ? "Đang cập nhật..."
                    : "Cập nhật"
                  : createPosition.isPending
                  ? "Đang thêm..."
                  : "Thêm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================= */}
      {/* MODAL VIEW DEPARTMENT */}
      {/* ======================= */}
      <Dialog
        open={openViewDepartmentModal}
        onOpenChange={(v) => {
          setOpenViewDepartmentModal(v);
          if (!v) setSelectedDepartment(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông tin phòng ban</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div>
              <label className="font-bold">Tên phòng ban: </label>
              <span>{departmentData?.data?.ten_phong_ban || "-"}</span>
            </div>
            <div>
              <label className="font-bold">Mô tả: </label>
              <span>{departmentData?.data?.mo_ta || "-"}</span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chức vụ</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Hệ số lương</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {(departmentData?.data?.chuc_vu || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center p-6">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                (departmentData?.data?.chuc_vu || []).map((p: any) => (
                  <TableRow key={p._id}>
                    <TableCell>{p.ten_chuc_vu}</TableCell>
                    <TableCell>{p.mo_ta || "-"}</TableCell>
                    <TableCell>{p.he_so_luong}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* ======================= */}
      {/* MODAL UPDATE DEPARTMENT */}
      {/* ======================= */}
      <Dialog
        open={openUpdateDepartmentModal}
        onOpenChange={(v) => {
          setOpenUpdateDepartmentModal(v);
          if (!v) {
            updateDepartmentForm.reset();
            setDeptLock({ ten_phong_ban: true, mo_ta: true });
          }
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => {
            const target = e.detail.originalEvent.target as Element | null;
            if (target?.closest(".group.toast")) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            const target = e.detail.originalEvent.target as Element | null;
            if (target?.closest(".group.toast")) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Chỉnh sửa phòng ban</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={updateDepartmentForm.handleSubmit(handleUpdateDepartment)}
            className="space-y-4"
          >
            {/* ten_phong_ban */}
            <div className="flex gap-2 items-center">
              <Input
                disabled={deptLock.ten_phong_ban}
                {...updateDepartmentForm.register("ten_phong_ban")}
              />
              <Button
                type="button"
                onClick={() =>
                  setDeptLock((p) => ({
                    ...p,
                    ten_phong_ban: !p.ten_phong_ban,
                  }))
                }
                title={deptLock.ten_phong_ban ? "Mở khóa" : "Khóa lại"}
              >
                <IconEdit />
              </Button>
            </div>

            {/* mo_ta */}
            <div className="flex gap-2 items-center">
              <Textarea
                disabled={deptLock.mo_ta}
                {...updateDepartmentForm.register("mo_ta")}
              />
              <Button
                type="button"
                onClick={() =>
                  setDeptLock((p) => ({
                    ...p,
                    mo_ta: !p.mo_ta,
                  }))
                }
                title={deptLock.mo_ta ? "Mở khóa" : "Khóa lại"}
              >
                <IconEdit />
              </Button>
            </div>

            <Separator />

            <div className="flex gap-2 items-center">
              <Button
                type="button"
                onClick={() => {
                  setOpenPositionModal(true);
                  setMode("update-department");

                  setPosLock({
                    ten_chuc_vu: true,
                    mo_ta: true,
                    he_so_luong: true,
                  });

                  positionForm.reset(
                    { ten_chuc_vu: "", mo_ta: "", he_so_luong: 0.1 },
                    { keepDirty: false, keepTouched: false }
                  );
                }}
              >
                Thêm chức vụ
              </Button>
              <DialogDescription>
                Thêm một chức vụ vào phòng ban này
              </DialogDescription>
            </div>

            {(departmentData?.data?.chuc_vu || []).length === 0 ? (
              <p className="text-sm text-gray-500">
                Chưa có chức vụ nào được thêm
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto overflow-x-auto">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[20%]">Chức vụ</TableHead>
                      <TableHead className="w-[40%]">Mô tả</TableHead>
                      <TableHead className="w-[20%] text-center">
                        Hệ số lương
                      </TableHead>
                      <TableHead className="w-[20%] text-center">
                        Hành động
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {(departmentData?.data?.chuc_vu || []).map((p: any) => (
                      <TableRow key={p._id}>
                        <TableCell className="whitespace-normal break-words">
                          {p.ten_chuc_vu}
                        </TableCell>

                        <TableCell className="whitespace-normal break-words">
                          {p.mo_ta || "-"}
                        </TableCell>

                        <TableCell className="text-center">
                          {p.he_so_luong}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => {
                                setMode("edit-position");
                                setOpenPositionModal(true);
                                setSelectedPosition(p);

                                setPosLock({
                                  ten_chuc_vu: true,
                                  mo_ta: true,
                                  he_so_luong: true,
                                });

                                positionForm.reset(p, {
                                  keepDirty: false,
                                  keepTouched: false,
                                });
                              }}
                            >
                              <IconEdit />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => handleDeletePosition(p._id)}
                            >
                              <IconTrash className="text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setOpenUpdateDepartmentModal(false);
                  setSelectedDepartment(null);
                  updateDepartmentForm.reset();
                  setDeptLock({ ten_phong_ban: true, mo_ta: true });
                }}
              >
                Hủy
              </Button>

              <Button type="submit" disabled={updateDepartment.isPending}>
                {updateDepartment.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
