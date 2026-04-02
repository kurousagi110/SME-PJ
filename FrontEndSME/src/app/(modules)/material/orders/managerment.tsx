"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

import { useMyProfile } from "@/hooks/use-account";
import { myProfile } from "@/app/actions/auth";

import {
  usePurchaseReceipts,
  useUpdatePurchaseReceiptStatus,
} from "@/hooks/use-purchase-receipt";

import type {
  PurchaseReceipt,
  PurchaseReceiptStatus,
} from "@/app/actions/receipt-purchase";

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

/* ===================== me helpers (fix theo BE: ten_phong_ban, ten_chuc_vu) ===================== */
type MeUser = {
  _id: string;
  ho_ten?: string;

  // backend có thể trả dạng object hoặc flatten string
  chuc_vu?: any;
  phong_ban?: any;

  chuc_vu_ten?: string;
  phong_ban_ten?: string;
};

function pickTenDeep(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return pickTenDeep(v[0]);
  if (typeof v === "object") {
    const direct =
      v.ten_phong_ban ??
      v.ten_chuc_vu ??
      v.ten ??
      v.name ??
      v.title ??
      v.label ??
      v.value ??
      v.text;

    if (direct != null) return String(direct).trim();
    if (v.data) return pickTenDeep(v.data);
    if (v.item) return pickTenDeep(v.item);
    return "";
  }
  return String(v).trim();
}

function normalizeMe(raw: any): MeUser | null {
  const r = raw?.data ?? raw;
  const user = r?.data?.data ?? r?.data ?? r;
  if (!user?._id) return null;

  // cố gắng lấy tên phòng ban/chức vụ theo nhiều format
  const phong_ban_ten =
    pickTenDeep(user?.phong_ban) ||
    String(user?.phong_ban_ten ?? user?.ten_phong_ban ?? "");

  const chuc_vu_ten =
    pickTenDeep(user?.chuc_vu) ||
    String(user?.chuc_vu_ten ?? user?.ten_chuc_vu ?? "");

  return {
    _id: String(user._id),
    ho_ten: user.ho_ten,
    chuc_vu: user.chuc_vu,
    phong_ban: user.phong_ban,
    phong_ban_ten,
    chuc_vu_ten,
  };
}

function normText(v: any) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/* ===================== UI helpers ===================== */
const toVND = (x: number) => Number(x || 0).toLocaleString("vi-VN") + " đ";

function fmtVNDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

function StatusBadge({ s }: { s: PurchaseReceiptStatus }) {
  if (s === "draft") return <Badge variant="secondary">Nháp</Badge>;
  if (s === "confirmed") return <Badge>Đã duyệt</Badge>;
  if (s === "paid") return <Badge variant="outline">Đã thanh toán</Badge>;
  if (s === "completed")
    return <Badge className="bg-green-600">Hoàn tất</Badge>;
  return <Badge variant="destructive">Hủy</Badge>;
}

export default function OrdersManagerment() {
  /* ===== me ===== */
  // const meQuery = useQuery({
  //   queryKey: ["me-profile"],
  //   queryFn: async () => {
  //     const res = await myProfile();
  //     if (!res?.success) throw new Error("Không lấy được thông tin tài khoản");
  //     const me = normalizeMe(res?.data);
  //     if (!me) throw new Error("Thông tin tài khoản không hợp lệ");
  //     return me;
  //   },
  //   staleTime: 30_000,
  //   retry: 0,
  // });
  const meQuery = useMyProfile();

  const me = meQuery.data;

  const myPhongBanRaw =
    (me?.phong_ban_ten || "").trim() || pickTenDeep(me?.phong_ban);
  const myChucVuRaw =
    (me?.chuc_vu_ten || "").trim() || pickTenDeep(me?.chuc_vu);

  const myPhongBan = normText(myPhongBanRaw);
  const myChucVu = normText(myChucVuRaw);

  const isDirectorDepartment = myPhongBan === normText("Phòng giám đốc");
  const isWarehouseDepartment = myPhongBan === normText("Phòng kho");

  // data BE phòng kho: "Trưởng phòng", "Nhân viên kho"
  const isWarehouseLeader =
    isWarehouseDepartment &&
    (myChucVu === normText("Trưởng phòng") || myChucVu.includes("truong kho")); // fallback nếu sau này đổi tên

  const canConfirm = isDirectorDepartment || isWarehouseLeader;
  const canComplete = isDirectorDepartment || isWarehouseLeader;

  // đồng bộ quyền thao tác trạng thái
  const canPaid = isDirectorDepartment || isWarehouseLeader;
  const canCancel = isDirectorDepartment || isWarehouseLeader;

  /* ===== filters + paging ===== */
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | PurchaseReceiptStatus>(
    "ALL"
  );
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const listQuery = usePurchaseReceipts({ q, trang_thai: status, page, limit });
  const items = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  const mutStatus = useUpdatePurchaseReceiptStatus();

  const [openView, setOpenView] = React.useState(false);
  const [selected, setSelected] = React.useState<PurchaseReceipt | null>(null);

  const openViewDialog = (o: PurchaseReceipt) => {
    setSelected(o);
    setOpenView(true);
  };

  const setTrangThai = async (
    o: PurchaseReceipt,
    next: PurchaseReceiptStatus
  ) => {
    if (next === "confirmed" && !canConfirm) {
      return toast.error(
        "Chỉ Trưởng phòng (Phòng kho) hoặc Phòng giám đốc mới được duyệt đơn"
      );
    }
    if (next === "completed" && !canComplete) {
      return toast.error(
        "Chỉ Trưởng phòng (Phòng kho) hoặc Phòng giám đốc mới được hoàn tất đơn"
      );
    }
    if (next === "paid" && !canPaid) {
      return toast.error("Bạn không có quyền đánh dấu đã thanh toán");
    }
    if (next === "cancelled" && !canCancel) {
      return toast.error("Bạn không có quyền hủy đơn");
    }

    try {
      await mutStatus.mutateAsync({ id: o._id, trang_thai: next });
      toast.success("Cập nhật trạng thái thành công");
    } catch (e: any) {
      toast.error(e?.message || "Cập nhật trạng thái thất bại");
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-xl font-semibold">
          Danh sách đơn nhập nguyên liệu
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="w-full sm:w-[320px]"
            placeholder="Tìm mã đơn / nhà cung cấp..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={status}
            onValueChange={(v: any) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="draft">Nháp</SelectItem>
              <SelectItem value="confirmed">Đã duyệt</SelectItem>
              <SelectItem value="paid">Đã thanh toán</SelectItem>
              <SelectItem value="completed">Hoàn tất</SelectItem>
              <SelectItem value="cancelled">Hủy</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setQ("");
              setStatus("ALL");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Ngày nhập</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
              <TableHead>Người nhập</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {meQuery.isLoading || listQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-6">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center p-6 text-muted-foreground"
                >
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              items.map((o) => (
                <TableRow key={o._id}>
                  <TableCell className="font-medium">{o.ma_dh}</TableCell>
                  <TableCell>{fmtVNDate(o.created_at || o.ngay_dat)}</TableCell>
                  <TableCell>{o.nha_cung_cap_ten || "-"}</TableCell>
                  <TableCell>{o.nguoi_lap_ten || "-"}</TableCell>
                  <TableCell className="text-right">
                    {toVND(o.tong_tien || 0)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge s={o.trang_thai} />
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={mutStatus.isPending}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => openViewDialog(o)}>
                          Xem chi tiết
                        </DropdownMenuItem>

                        {/* draft -> confirmed */}
                        {o.trang_thai === "draft" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setTrangThai(o, "confirmed")}
                              disabled={!canConfirm || mutStatus.isPending}
                            >
                              Duyệt
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={() => setTrangThai(o, "cancelled")}
                              disabled={!canCancel || mutStatus.isPending}
                            >
                              Hủy
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* confirmed -> paid OR completed */}
                        {o.trang_thai === "confirmed" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setTrangThai(o, "paid")}
                              disabled={!canPaid || mutStatus.isPending}
                            >
                              Đánh dấu đã thanh toán
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={() => setTrangThai(o, "cancelled")}
                              disabled={!canCancel || mutStatus.isPending}
                            >
                              Hủy
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* paid -> completed */}
                        {o.trang_thai === "paid" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setTrangThai(o, "completed")}
                              disabled={!canComplete || mutStatus.isPending}
                            >
                              Hoàn tất
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={() => setTrangThai(o, "cancelled")}
                              disabled={!canCancel || mutStatus.isPending}
                            >
                              Hủy
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Trước
        </Button>
        <div className="text-sm text-muted-foreground">
          Trang <b>{page}</b> / <b>{totalPages}</b>
        </div>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Sau
        </Button>
      </div>

      {/* View dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn nhập nguyên liệu</DialogTitle>
          </DialogHeader>

          {!selected ? null : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Mã đơn</div>
                  <div className="font-medium">{selected.ma_dh}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Trạng thái
                  </div>
                  <div className="font-medium">
                    <StatusBadge s={selected.trang_thai} />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Nhà cung cấp
                  </div>
                  <div className="font-medium">
                    {selected.nha_cung_cap_ten || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Người nhập
                  </div>
                  <div className="font-medium">
                    {selected.nguoi_lap_ten || "-"}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nguyên liệu</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selected.san_pham || []).map((it: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {it.ten_nl || "-"}{" "}
                          <span className="text-muted-foreground">
                            ({it.ma_nl || "-"})
                          </span>
                        </TableCell>
                        <TableCell>{it.don_vi || "-"}</TableCell>
                        <TableCell className="text-right">
                          {it.so_luong}
                        </TableCell>
                        <TableCell className="text-right">
                          {toVND(it.don_gia)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {toVND((it.so_luong || 0) * (it.don_gia || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end text-lg font-semibold">
                Tổng tiền:{" "}
                <span className="ml-2 text-primary">
                  {toVND(selected.tong_tien || 0)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setOpenView(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
