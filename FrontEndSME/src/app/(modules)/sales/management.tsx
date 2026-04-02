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
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useOrderSale,
  useOrderSaleById,
  useUpdateOrderSaleStatusById,
} from "@/hooks/use-order-sale";

import { useMyProfile } from "@/hooks/use-account";

/* ================= Types (backend) ================= */
type ApiTrangThai = "draft" | "confirmed" | "cancelled" | "completed" | string;

type ApiLine = {
  loai_hang?: string;
  san_pham_id?: string | null;
  ma_sp?: string;
  ten_sp?: string;
  don_vi?: string | null;
  don_gia?: number;
  so_luong?: number;
  thanh_tien?: number;
};

type ApiOrder = {
  _id: string;
  ma_dh: string;
  khach_hang_ten: string;
  nguoi_lap_id?: string;
  ngay_dat?: string; // ISO
  san_pham: ApiLine[];
  tong_tien?: number;
  trang_thai: ApiTrangThai;
  ghi_chu?: string;

  // optional: backend bạn có thể lưu lý do từ chối
  ly_do_tu_choi?: string;
};

type ApiListResult = {
  items: ApiOrder[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/* ================= UI helpers ================= */
const toVND = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("vi-VN") + " đ";

function toVNDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN");
}

function StatusBadge({ s }: { s: ApiTrangThai }) {
  const v = (s || "").toLowerCase();
  if (v === "completed") return <Badge variant="outline">Hoàn thành</Badge>;
  if (v === "confirmed") return <Badge>Đã duyệt</Badge>;
  if (v === "cancelled") return <Badge variant="destructive">Từ chối</Badge>;
  return <Badge variant="secondary">Chờ duyệt</Badge>;
}

/* ================= Page ================= */
export default function OrdersManagement() {
  const { data: profile } = useMyProfile();

  const deptName = (profile?.phong_ban?.ten || "").trim();
  const roleName = (profile?.chuc_vu?.ten || "").trim().toLowerCase();

  const isDirectorDept = deptName === "Phòng giám đốc";
  const isAccountingDept = deptName === "Phòng Kế Toán";
  const isHRDept = deptName === "Phòng Nhân Sự";

  const isManager = roleName.includes("trưởng phòng");

  const canOperateSalesOrders = React.useMemo(() => {
    if (isDirectorDept) return true;
    if ((isAccountingDept || isHRDept) && isManager) return true;
    return false;
  }, [isDirectorDept, isAccountingDept, isHRDept, isManager]);

  const guardOperate = () => {
    if (!canOperateSalesOrders) return false;
    return true;
  };

  // filters
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<
    "draft" | "confirmed" | "cancelled" | "completed" | "ALL"
  >("draft");

  // paging
  const [page, setPage] = React.useState(1);
  const limit = 20;

  // dialogs
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [openView, setOpenView] = React.useState(false);
  const [opencancelled, setOpencancelled] = React.useState(false);
  const [cancelledReason, setcancelledReason] = React.useState("");

  const statusToApi = (s: typeof status) => {
    if (s === "ALL") return undefined;
    if (s === "confirmed") return "confirmed";
    if (s === "cancelled") return "cancelled";
    if (s === "completed") return "completed";
    return "ALL";
  };

  const listQuery = useOrderSale({
    customer_name: q,
    status: statusToApi(status),
    type: "sale",
    page,
    limit,
  });

  const list: ApiListResult = (listQuery.data as any) ?? {
    items: [],
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  };

  const items: ApiOrder[] = Array.isArray(list?.items) ? list.items : [];

  const detailQuery = useOrderSaleById(selectedId);
  const selected: ApiOrder | null = (detailQuery.data as any) ?? null;

  const updateStatusMutation = useUpdateOrderSaleStatusById();

  const openDetail = (id: string) => {
    setSelectedId(id);
    setOpenView(true);
  };

  const approve = async (id: string) => {
    if (!guardOperate()) return;
    try {
      await updateStatusMutation.mutateAsync({
        id,
        data: { trang_thai: "confirmed" },
      } as any);
      setOpenView(false);
    } catch {}
  };

  const completeOrder = async (id: string) => {
    if (!guardOperate()) return;
    try {
      await updateStatusMutation.mutateAsync({
        id,
        data: { trang_thai: "completed" },
      } as any);
      setOpenView(false);
    } catch {}
  };

  const opencancelledDialog = (id: string) => {
    if (!guardOperate()) return;
    setSelectedId(id);
    setcancelledReason("");
    setOpencancelled(true);
  };

  const confirmcancelled = async () => {
    if (!guardOperate()) return;
    if (!selectedId) return;
    const reason = cancelledReason.trim();
    if (!reason) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: selectedId,
        data: { trang_thai: "cancelled", ly_do_tu_choi: reason },
      } as any);
      setOpencancelled(false);
      setOpenView(false);
    } catch {}
  };

  const pendingCount = items.filter(
    (o) => (o.trang_thai || "").toLowerCase() === "draft"
  ).length;

  const onReset = () => {
    setQ("");
    setStatus("draft");
    setPage(1);
  };

  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xl font-semibold">Duyệt đơn bán</div>
          <div className="text-sm text-muted-foreground">
            Đang chờ duyệt: <span className="font-medium">{pendingCount}</span>{" "}
            đơn
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="w-full sm:w-[320px]"
            placeholder="Tìm khách hàng..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Chỉ chờ duyệt</SelectItem>
              <SelectItem value="confirmed">Đã duyệt</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Từ chối</SelectItem>
              <SelectItem value="ALL">Tất cả</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={onReset}
            disabled={listQuery.isLoading}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* List table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Ngày đặt</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead className="text-right">Trạng thái</TableHead>

              {canOperateSalesOrders ? (
                <TableHead className="text-right">Thao tác</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {listQuery.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={canOperateSalesOrders ? 6 : 5}
                  className="text-center p-6 text-muted-foreground"
                >
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canOperateSalesOrders ? 6 : 5}
                  className="text-center p-6 text-muted-foreground"
                >
                  Không có đơn phù hợp
                </TableCell>
              </TableRow>
            ) : (
              items.map((o) => {
                const st = (o.trang_thai || "").toLowerCase();
                const isPending = st === "draft";
                const isConfirmed = st === "confirmed";

                return (
                  <TableRow key={o._id}>
                    <TableCell className="font-medium">{o.ma_dh}</TableCell>
                    <TableCell>{toVNDate(o.ngay_dat)}</TableCell>
                    <TableCell>{o.khach_hang_ten}</TableCell>
                    <TableCell className="text-right">
                      {toVND(Number(o.tong_tien ?? 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge s={o.trang_thai} />
                    </TableCell>

                    {canOperateSalesOrders ? (
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

                            <DropdownMenuItem onClick={() => openDetail(o._id)}>
                              Xem chi tiết
                            </DropdownMenuItem>

                            {/* draft: duyệt / từ chối */}
                            {isPending && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => approve(o._id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Duyệt
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  className="text-red-500"
                                  onClick={() => opencancelledDialog(o._id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Từ chối
                                </DropdownMenuItem>
                              </>
                            )}

                            {isConfirmed && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => completeOrder(o._id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Hoàn thành đơn
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  className="text-red-500"
                                  onClick={() => opencancelledDialog(o._id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  Hủy
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Tổng: <span className="font-medium">{list.total ?? 0}</span> • Trang{" "}
          <span className="font-medium">{list.page ?? page}</span> /{" "}
          <span className="font-medium">{list.totalPages ?? 1}</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={listQuery.isLoading || (list.page ?? page) <= 1}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setPage((p) => Math.min(list.totalPages ?? p + 1, p + 1))
            }
            disabled={
              listQuery.isLoading ||
              (list.page ?? page) >= (list.totalPages ?? 1)
            }
          >
            Sau
          </Button>
        </div>
      </div>

      {/* ===== View Dialog (detail API) ===== */}
      <Dialog
        open={openView}
        onOpenChange={(v) => {
          setOpenView(v);
          if (!v) setSelectedId("");
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn bán</DialogTitle>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="p-6 text-muted-foreground">
              Đang tải chi tiết...
            </div>
          ) : !selected ? (
            <div className="p-6 text-muted-foreground">Không có dữ liệu</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Mã đơn</div>
                  <div className="font-medium">{selected.ma_dh}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ngày đặt</div>
                  <div className="font-medium">
                    {toVNDate(selected.ngay_dat)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Khách hàng
                  </div>
                  <div className="font-medium">{selected.khach_hang_ten}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Trạng thái
                  </div>
                  <div className="font-medium">
                    <StatusBadge s={selected.trang_thai} />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {(selected.san_pham ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center p-6 text-muted-foreground"
                        >
                          Không có dòng sản phẩm
                        </TableCell>
                      </TableRow>
                    ) : (
                      (selected.san_pham ?? []).map((l, idx) => (
                        <TableRow key={idx}>
                          {/* --- ĐOẠN ĐƯỢC SỬA Ở ĐÂY --- */}
                          <TableCell className="font-medium min-w-[200px] max-w-[300px] whitespace-normal break-words">
                            {l.ten_sp || "-"}{" "}
                            <span className="text-muted-foreground">
                              ({l.ma_sp || "-"})
                            </span>
                          </TableCell>
                          {/* --------------------------- */}

                          <TableCell className="text-right">
                            {Number(l.so_luong ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {toVND(Number(l.don_gia ?? 0))}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {toVND(
                              Number(
                                l.thanh_tien ??
                                  Number(l.so_luong ?? 0) *
                                    Number(l.don_gia ?? 0)
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end text-lg font-semibold">
                Tổng tiền:
                <span className="ml-2 text-primary">
                  {toVND(Number(selected.tong_tien ?? 0))}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {/* draft: duyệt / từ chối */}
            {selected &&
            canOperateSalesOrders &&
            String(selected.trang_thai || "").toLowerCase() === "draft" ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setOpenView(false);
                    opencancelledDialog(selected._id);
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  Từ chối
                </Button>

                <Button
                  onClick={() => approve(selected._id)}
                  disabled={updateStatusMutation.isPending}
                >
                  Duyệt
                </Button>
              </>
            ) : null}

            {/* confirmed: hiện nút hoàn thành trong dialog luôn (nếu bạn muốn),
                còn nếu bạn chỉ muốn trong menu "Thao tác" thì xóa block này đi. */}
            {selected &&
            canOperateSalesOrders &&
            String(selected.trang_thai || "").toLowerCase() === "confirmed" ? (
              <Button
                onClick={() => completeOrder(selected._id)}
                disabled={updateStatusMutation.isPending}
              >
                Hoàn thành đơn
              </Button>
            ) : null}

            <Button variant="ghost" onClick={() => setOpenView(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== cancelled Dialog ===== */}
      <Dialog open={opencancelled} onOpenChange={setOpencancelled}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Từ chối đơn</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Mã đơn:{" "}
              <span className="font-medium">
                {selected?.ma_dh ||
                  items.find((x) => x._id === selectedId)?.ma_dh ||
                  "-"}
              </span>
            </div>

            <Textarea
              value={cancelledReason}
              onChange={(e) => setcancelledReason(e.target.value)}
              placeholder="Nhập lý do..."
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpencancelled(false)}>
              Hủy
            </Button>

            <Button
              variant="destructive"
              onClick={confirmcancelled}
              disabled={
                !canOperateSalesOrders ||
                !cancelledReason.trim() ||
                !selectedId ||
                updateStatusMutation.isPending
              }
            >
              {updateStatusMutation.isPending
                ? "Đang xử lý..."
                : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
