"use client";

import { useState, useMemo } from "react";
import {
  useStaffList,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
} from "@/hooks/use-staff";
import { useMyProfile } from "@/hooks/use-account";
import { useDepartmentsAndPositions } from "@/hooks/use-department-position";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Controller, useForm } from "react-hook-form";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";

import { ChevronDown, MoreHorizontal } from "lucide-react";
import confirmToast from "@/components/confirm-toast";
import { toast } from "sonner";

// ... (Giữ nguyên schema validation) ...
const createStaffSchema = z.object({
  ho_ten: z.string().min(1, "Họ tên là bắt buộc"),
  ngay_sinh: z.string().min(1, "Ngày sinh là bắt buộc"),
  tai_khoan: z.string().min(1, "Tên đăng nhập là bắt buộc"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  phong_ban: z.object({
    ten: z.string().min(1, "Phòng ban là bắt buộc"),
    mo_ta: z.string().optional(),
  }),
  chuc_vu: z.object({
    ten: z.string().min(1, "Chức vụ là bắt buộc"),
    mo_ta: z.string().optional(),
    heSoluong: z.number().optional(),
  }),
});

export function StaffTablePage() {
  // ============================
  // STATE FILTERS
  // ============================
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [department, setDepartment] = useState<string | undefined>();
  const [position, setPosition] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const { data: profile } = useMyProfile();

  // ============================
  // HELPERS: CHECK QUYỀN HIỂN THỊ ICON THAO TÁC
  // ============================
  const canShowAction = (targetStaff: any) => {
    // Nếu chưa load xong profile hoặc targetStaff chưa có ID -> ẩn cho chắc
    if (!profile || !profile._id || !targetStaff || !targetStaff._id)
      return false;

    // FIX: Ép kiểu về String để so sánh chính xác ID
    const isSelf = String(profile._id) === String(targetStaff._id);

    // 1. Không bao giờ hiển thị nút thao tác cho chính bản thân mình
    if (isSelf) return false;

    const myRole = profile.chuc_vu?.ten;
    const myDept = profile.phong_ban?.ten;

    // 2. Thư ký: Không được thao tác bất cứ ai
    if (myRole === "Thư ký") return false;

    // 3. Logic cho Phòng Giám Đốc
    if (myDept === "Phòng giám đốc") {
      const targetRole = targetStaff.chuc_vu?.ten;

      // Giám đốc không được sửa Tổng giám đốc (ẩn icon)
      if (myRole === "Giám đốc" && targetRole === "Tổng giám đốc") {
        return false;
      }

      // Còn lại (Tổng giám đốc sửa tất cả, Giám đốc sửa nhân viên khác) -> OK
      return true;
    }

    // 4. Logic cho Trưởng phòng các phòng ban khác
    if (myRole === "Trưởng phòng") {
      // Chỉ được sửa nhân viên cùng phòng ban
      if (myDept === targetStaff.phong_ban?.ten) {
        // Không được sửa một Trưởng phòng khác (nếu có lỗi data)
        if (targetStaff.chuc_vu?.ten === "Trưởng phòng") return false;
        return true;
      }
    }

    // Các trường hợp còn lại (Nhân viên thường...) -> Không hiện icon
    return false;
  };

  // ============================
  // LOGIC PHÂN QUYỀN (CHO FORM CREATE/UPDATE)
  // ============================
  const forbiddenRoles = useMemo(() => {
    const myDept = profile?.phong_ban?.ten;
    const myRole = profile?.chuc_vu?.ten;
    const sensitiveRoles = ["Tổng giám đốc", "Giám đốc", "Thư ký"];

    if (myDept !== "Phòng giám đốc") return sensitiveRoles;
    if (myRole === "Tổng giám đốc") return ["Tổng giám đốc"]; // TGĐ không được tạo thêm 1 TGĐ
    if (myRole === "Giám đốc") return ["Tổng giám đốc", "Giám đốc"];
    if (myRole === "Thư ký") return sensitiveRoles;
    return sensitiveRoles;
  }, [profile]);

  // ============================
  // FETCH DEPARTMENTS + POSITIONS
  // ============================
  const { data: dpData } = useDepartmentsAndPositions();
  const rawDepartmentOptions = dpData?.data?.items || [];

  const allowedDepartmentOptions = useMemo(() => {
    if (profile?.phong_ban?.ten !== "Phòng giám đốc") {
      return rawDepartmentOptions.filter(
        (d: any) => d.ten_phong_ban !== "Phòng giám đốc"
      );
    }
    return rawDepartmentOptions;
  }, [rawDepartmentOptions, profile]);

  const allPositions = Array.from(
    new Map(
      rawDepartmentOptions
        .flatMap((p: any) => p.chuc_vu)
        .map((pos: any) => [pos.ten_chuc_vu, pos])
    ).values()
  );

  const departmentOptions = rawDepartmentOptions;
  const positionOptions = department
    ? departmentOptions.find((d: any) => d.ten_phong_ban === department)
        ?.chuc_vu || []
    : allPositions;

  // ============================
  // QUERY STAFF LIST
  // ============================
  const { data, isLoading } = useStaffList({
    name: search,
    page,
    limit,
    department,
    position,
  });

  const staffList = data?.data?.items || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // ============================
  // MODAL TẠO NHÂN VIÊN
  // ============================
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const createStaff = useCreateStaff();

  const form = useForm<z.infer<typeof createStaffSchema>>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      ho_ten: "",
      ngay_sinh: "",
      tai_khoan: "",
      password: "",
      phong_ban: { ten: "", mo_ta: "" },
      chuc_vu: { ten: "", mo_ta: "", heSoluong: 0 },
    },
  });

  // Filter chức vụ cho Form Create
  const selectedDeptCreate = form.watch("phong_ban").ten;
  const posOptionsForm = useMemo(() => {
    const positions = selectedDeptCreate
      ? departmentOptions.find(
          (d: any) => d.ten_phong_ban === selectedDeptCreate
        )?.chuc_vu || []
      : allPositions;

    return positions.filter(
      (p: any) => !forbiddenRoles.includes(p.ten_chuc_vu)
    );
  }, [selectedDeptCreate, departmentOptions, allPositions, forbiddenRoles]);

  const onSubmit = (values: z.infer<typeof createStaffSchema>) => {
    if (profile?.chuc_vu?.ten === "Thư ký") {
      toast.error("Thư ký không có quyền tạo nhân viên");
      return;
    }
    if (forbiddenRoles.includes(values.chuc_vu.ten)) {
      toast.error("Bạn không có quyền tạo nhân viên với chức vụ này!");
      return;
    }

    const body = {
      ho_ten: values.ho_ten,
      ngay_sinh: values.ngay_sinh,
      tai_khoan: values.tai_khoan,
      password: values.password,
      phong_ban: {
        ten: values.phong_ban.ten,
        mo_ta: values.phong_ban.mo_ta,
      },
      chuc_vu: {
        ten: values.chuc_vu.ten,
        mo_ta: values.chuc_vu.mo_ta,
        heSoluong: values.chuc_vu.heSoluong,
      },
    };
    createStaff.mutate(body, {
      onSuccess: () => {
        setOpenCreateModal(false);
        form.reset();
        toast.success("Tạo nhân viên thành công");
      },
    });
  };

  // ============================
  // MODAL CẬP NHẬT NHÂN VIÊN
  // ============================
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const updateStaff = useUpdateStaff();

  const formUpdate = useForm({
    defaultValues: {
      id: "",
      phong_ban: { ten: "", mo_ta: "" },
      chuc_vu: { ten: "", mo_ta: "", heSoluong: 0 },
    },
  });

  // Filter chức vụ cho Form Update
  const selectedDeptUpdate = formUpdate.watch("phong_ban").ten;
  const posOptionsFormUpdate = useMemo(() => {
    const positions = selectedDeptUpdate
      ? departmentOptions.find(
          (d: any) => d.ten_phong_ban === selectedDeptUpdate
        )?.chuc_vu || []
      : allPositions;

    return positions.filter(
      (p: any) => !forbiddenRoles.includes(p.ten_chuc_vu)
    );
  }, [selectedDeptUpdate, departmentOptions, allPositions, forbiddenRoles]);

  const onSubmitUpdate = (values: any) => {
    if (forbiddenRoles.includes(values.chuc_vu.ten)) {
      toast.error("Bạn không có quyền bổ nhiệm chức vụ này!");
      return;
    }

    const body = {
      id: values.id,
      phong_ban: {
        ten: values.phong_ban.ten,
        mo_ta: values.phong_ban.mo_ta,
      },
      chuc_vu: {
        ten: values.chuc_vu.ten,
        mo_ta: values.chuc_vu.mo_ta,
        heSoluong: values.chuc_vu.heSoluong,
      },
    };

    updateStaff.mutate(body, {
      onSuccess: () => {
        setOpenUpdateModal(false);
        formUpdate.reset();
        toast.success("Cập nhật thành công");
      },
    });
  };

  const handleEdit = (s: any) => {
    setSelectedStaff(s);
    formUpdate.reset({
      id: s._id,
      phong_ban: {
        ten: s.phong_ban?.ten || "",
        mo_ta: s.phong_ban?.mo_ta || "",
      },
      chuc_vu: {
        ten: s.chuc_vu?.ten || "",
        mo_ta: s.chuc_vu?.mo_ta || "",
        heSoluong: s.chuc_vu?.heSoluong || 0,
      },
    });
    setOpenUpdateModal(true);
  };

  // ============================
  // DELETE STAFF
  // ============================
  const deleteStaff = useDeleteStaff();

  const handleDelete = (id: string, name: string) => {
    confirmToast(
      "Xác nhận xóa nhân viên",
      <>
        Bạn có chắc chắn muốn xóa nhân viên{" "}
        <span className="font-semibold">{name}</span> không? Hành động này không
        thể hoàn tác.
      </>,
      () => {
        deleteStaff.mutate(id, {
          onSuccess: () => {
            toast.success("Xóa nhân viên thành công");
          },
        });
      }
    );
  };

  // ============================
  // RENDER UI
  // ============================
  const filteredList = staffList.filter((s: any) =>
    s.ho_ten.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      {/* FILTER HEADER */}
      <div className="flex justify-between items-center">
        <Input
          placeholder="Tìm theo tên..."
          className="w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex items-center gap-3">
          {/* Dropdown Departments */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {department || "Phòng ban"}
                <ChevronDown size={16} className="ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setDepartment(undefined)}>
                Tất cả
              </DropdownMenuItem>
              {departmentOptions.map((d: any) => (
                <DropdownMenuItem
                  key={d._id}
                  onClick={() => {
                    setDepartment(d.ten_phong_ban);
                    setPosition(undefined);
                  }}
                >
                  {d.ten_phong_ban}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown Positions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {position || "Chức vụ"}
                <ChevronDown size={16} className="ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPosition(undefined)}>
                Tất cả
              </DropdownMenuItem>
              {positionOptions.map((p: any) => (
                <DropdownMenuItem
                  key={p._id}
                  onClick={() => setPosition(p.ten_chuc_vu)}
                >
                  {p.ten_chuc_vu}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* BUTTON CREATE: Ẩn nút nếu là Thư ký */}
          {profile?.chuc_vu?.ten !== "Thư ký" &&
            (profile?.phong_ban?.ten === "Phòng giám đốc" ||
              profile?.chuc_vu?.ten === "Trưởng phòng") && (
              <Button
                onClick={() => {
                  setOpenCreateModal(true);
                  if (
                    profile?.chuc_vu?.ten === "Trưởng phòng" &&
                    profile?.phong_ban?.ten !== "Phòng giám đốc"
                  ) {
                    form.setValue("phong_ban", {
                      ten: profile.phong_ban.ten,
                      mo_ta: profile.phong_ban.mo_ta,
                    });
                  } else {
                    form.setValue("phong_ban", { ten: "", mo_ta: "" });
                  }
                }}
              >
                + Thêm nhân viên
              </Button>
            )}
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Ngày sinh</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead className="text-right"></TableHead>
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
              filteredList.map((s: any) => {
                const showAction = canShowAction(s);
                return (
                  <TableRow key={s._id}>
                    <TableCell>{s.ho_ten}</TableCell>
                    <TableCell>{s.ngay_sinh}</TableCell>
                    <TableCell>{s.phong_ban?.ten}</TableCell>
                    <TableCell>{s.chuc_vu?.ten}</TableCell>
                    <TableCell className="text-right">
                      {showAction && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(s)}>
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(s._id, s.ho_ten)}
                              className="text-red-500"
                            >
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
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

      {/* MODAL CREATE */}
      <Dialog
        open={openCreateModal}
        onOpenChange={(open) => {
          setOpenCreateModal(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm nhân viên</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              name="ho_ten"
              control={form.control}
              render={({ field }) => <Input placeholder="Họ tên" {...field} />}
            />
            <Controller
              name="ngay_sinh"
              control={form.control}
              render={({ field }) => <Input type="date" {...field} />}
            />
            <Controller
              name="tai_khoan"
              control={form.control}
              render={({ field }) => (
                <Input placeholder="Tên đăng nhập" {...field} />
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field }) => (
                <Input type="password" placeholder="Mật khẩu" {...field} />
              )}
            />

            <div className="flex items-center gap-3">
              <Controller
                name="phong_ban"
                control={form.control}
                render={({ field }) => (
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          {field.value?.ten || "Phòng ban"}
                          <ChevronDown size={16} className="ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {allowedDepartmentOptions.map((d: any) => (
                          <DropdownMenuItem
                            key={d._id}
                            onClick={() =>
                              field.onChange({
                                ten: d.ten_phong_ban,
                                mo_ta: d.mo_ta,
                              })
                            }
                          >
                            {d.ten_phong_ban}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              />

              <Controller
                name="chuc_vu"
                control={form.control}
                render={({ field }) => (
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          {field.value?.ten || "Chức vụ"}
                          <ChevronDown size={16} className="ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {posOptionsForm.map((p: any) => (
                          <DropdownMenuItem
                            key={p._id}
                            onClick={() =>
                              field.onChange({
                                ten: p.ten_chuc_vu,
                                mo_ta: p.mo_ta,
                                heSoluong: p.he_so_luong,
                              })
                            }
                          >
                            {p.ten_chuc_vu}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setOpenCreateModal(false);
                  form.reset();
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createStaff.isPending}>
                {createStaff.isPending ? "Đang tạo..." : "Tạo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL UPDATE */}
      <Dialog
        open={openUpdateModal}
        onOpenChange={(open) => {
          setOpenUpdateModal(open);
          if (!open) {
            formUpdate.reset();
            setSelectedStaff(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật nhân viên</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-2">
              <div>
                <label className="font-bold">Họ tên: </label>
                <span>{selectedStaff.ho_ten}</span>
              </div>
              <div>
                <label className="font-bold">Ngày sinh: </label>
                <span>{selectedStaff.ngay_sinh}</span>
              </div>
            </div>
          )}

          <form
            onSubmit={formUpdate.handleSubmit(onSubmitUpdate)}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {formUpdate.watch("phong_ban")?.ten || "Phòng ban"}{" "}
                    <ChevronDown size={16} className="ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {allowedDepartmentOptions.map((d: any) => (
                    <DropdownMenuItem
                      key={d._id}
                      onClick={() =>
                        formUpdate.setValue("phong_ban", {
                          ten: d.ten_phong_ban,
                          mo_ta: d.mo_ta,
                        })
                      }
                    >
                      {d.ten_phong_ban}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {formUpdate.watch("chuc_vu")?.ten || "Chức vụ"}{" "}
                    <ChevronDown size={16} className="ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {posOptionsFormUpdate.map((p: any) => (
                    <DropdownMenuItem
                      key={p._id}
                      onClick={() =>
                        formUpdate.setValue("chuc_vu", {
                          ten: p.ten_chuc_vu,
                          mo_ta: p.mo_ta,
                          heSoluong: p.he_so_luong,
                        })
                      }
                    >
                      {p.ten_chuc_vu}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenUpdateModal(false);
                  formUpdate.reset();
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={updateStaff.isPending && openUpdateModal}
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
