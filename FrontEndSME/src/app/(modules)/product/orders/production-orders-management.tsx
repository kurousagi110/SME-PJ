"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { useMyProfile } from "@/hooks/use-account";
import { myProfile } from "@/app/actions/auth";

import {
  useProductionReceipts,
  useProductionNeeds,
  useUpdateProdReceiptStatus,
} from "@/hooks/use-production-receipts";

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

import type {
  ProductionReceipt,
  ProdReceiptStatus,
} from "@/app/actions/production-receipts";

type MeUser = {
  _id: string;
  ho_ten?: string;
  chuc_vu?: any;
  phong_ban?: any;
};

function pickTenDeep(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return pickTenDeep(v[0]);
  if (typeof v === "object") {
    const direct = v.ten ?? v.name ?? v.title ?? v.label ?? v.value ?? v.text;
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
  return {
    _id: String(user._id),
    ho_ten: user.ho_ten,
    chuc_vu: user.chuc_vu,
    phong_ban: user.phong_ban,
  };
}

function StatusBadge({ s }: { s: ProdReceiptStatus }) {
  if (s === "draft") return <Badge variant="secondary">Nháp</Badge>;
  if (s === "confirmed") return <Badge>Đã duyệt</Badge>;
  if (s === "completed") return <Badge variant="outline">Hoàn thành</Badge>;
  return <Badge variant="destructive">Hủy</Badge>;
}

function fmtVNDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

export default function ProductionOrdersManagement() {
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
  const myPhongBan = pickTenDeep(me?.phong_ban);
  const myChucVu = pickTenDeep(me?.chuc_vu);

  // rule quyền
  const isDirectorDepartment =
    myPhongBan === "Phòng giám đốc" ||
    myPhongBan === "Phòng kế toán" ||
    myPhongBan === "Phòng nhân sự";
  const canConfirm =
    isDirectorDepartment ||
    myChucVu === "Giám đốc" ||
    myChucVu === "Trưởng phòng" ||
    myChucVu === "Tổng giám đốc";
  const canComplete =
    isDirectorDepartment ||
    myChucVu === "Giám đốc" ||
    myChucVu === "Trưởng phòng" ||
    myChucVu === "Tổng giám đốc";
  const canCancel =
    isDirectorDepartment ||
    myChucVu === "Kế toán" ||
    myChucVu === "Trưởng phòng" ||
    myChucVu === "Tổng giám đốc" ||
    myChucVu === "Giám đốc";

  /* ===== filters + paging ===== */
  const [q, setQ] = React.useState("");
  const [trangThai, setTrangThai] = React.useState<"ALL" | ProdReceiptStatus>(
    "ALL"
  );
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const listQuery = useProductionReceipts({
    q,
    trang_thai: trangThai,
    page,
    limit,
  });
  const items = listQuery.data?.items ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  const [selected, setSelected] = React.useState<ProductionReceipt | null>(
    null
  );
  const [openView, setOpenView] = React.useState(false);

  const needsQuery = useProductionNeeds(selected?._id, openView);
  const mutStatus = useUpdateProdReceiptStatus();

  const openViewDialog = (o: ProductionReceipt) => {
    setSelected(o);
    setOpenView(true);
  };

  const setStatus = async (o: ProductionReceipt, next: ProdReceiptStatus) => {
    if (next === "confirmed" && !canConfirm)
      return toast.error("Bạn không có quyền duyệt");
    if (next === "completed" && !canComplete)
      return toast.error("Bạn không có quyền hoàn thành");
    if (next === "cancelled" && !canCancel)
      return toast.error("Bạn không có quyền hủy");

    try {
      await mutStatus.mutateAsync({ id: o._id, trang_thai: next });
      toast.success("Cập nhật trạng thái thành công");
    } catch (e: any) {
      toast.error(e?.message || "Cập nhật trạng thái thất bại");
    }
  };

  const sumQtyTP = (o: ProductionReceipt) =>
    (o.san_pham || []).reduce((s, x) => s + (Number(x?.so_luong) || 0), 0);

  return (
    <div className="p-6 space-y-5">
      {/* header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xl font-semibold">Đơn nhập sản xuất</div>
          <div className="text-sm text-muted-foreground"></div>
          <div className="text-xs text-muted-foreground mt-1"></div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="w-full sm:w-[320px]"
            placeholder="Tìm mã chứng từ / tên SP..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={trangThai}
            onValueChange={(v: any) => {
              setTrangThai(v);
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
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Hủy</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setQ("");
              setTrangThai("ALL");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã chứng từ</TableHead>
              <TableHead>Ngày lập</TableHead>
              <TableHead>Người nhập</TableHead>
              <TableHead>Thành phẩm</TableHead>
              <TableHead className="text-right">Tổng SL</TableHead>
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
                  <TableCell>{o.nguoi_lap_ten || "-"}</TableCell>
                  <TableCell>
                    {(o.san_pham || []).slice(0, 1).map((x) => (
                      <span key={x.san_pham_id}>
                        {x.ten_sp}{" "}
                        <span className="text-muted-foreground">
                          ({x.ma_sp})
                        </span>
                      </span>
                    ))}
                    {(o.san_pham || []).length > 1 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        +{(o.san_pham || []).length - 1} SP
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">{sumQtyTP(o)}</TableCell>
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

                        {o.trang_thai === "draft" ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => setStatus(o, "confirmed")}
                              disabled={!canConfirm || mutStatus.isPending}
                            >
                              Duyệt
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={() => setStatus(o, "cancelled")}
                              disabled={!canCancel || mutStatus.isPending}
                            >
                              Hủy
                            </DropdownMenuItem>
                          </>
                        ) : null}

                        {o.trang_thai === "confirmed" ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => setStatus(o, "completed")}
                              disabled={!canComplete || mutStatus.isPending}
                            >
                              Hoàn thành
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={() => setStatus(o, "cancelled")}
                              disabled={!canCancel || mutStatus.isPending}
                            >
                              Hủy
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Trang trước
        </Button>
        <div className="text-sm text-muted-foreground">
          Trang <b>{page}</b> / <b>{totalPages}</b>
        </div>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Trang sau
        </Button>
      </div>

      {/* view dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn nhập sản xuất</DialogTitle>
          </DialogHeader>

          {!selected ? null : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Mã chứng từ
                  </div>
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
                  <div className="text-sm text-muted-foreground">Ngày lập</div>
                  <div className="font-medium">
                    {fmtVNDate(selected.created_at || selected.ngay_dat)}
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

                <div>
                  <div className="text-sm text-muted-foreground">Ghi chú</div>
                  <div className="font-medium">{selected.ghi_chu || "-"}</div>
                </div>
              </div>

              {/* TP table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thành phẩm</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selected.san_pham || []).map((x) => (
                      <TableRow key={x.san_pham_id}>
                        <TableCell className="font-medium">
                          {x.ten_sp}{" "}
                          <span className="text-muted-foreground">
                            ({x.ma_sp})
                          </span>
                        </TableCell>
                        <TableCell>{x.don_vi}</TableCell>
                        <TableCell className="text-right">
                          {x.so_luong}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* NL needs + stock */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b text-sm font-medium">
                  Nguyên liệu cần
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nguyên liệu</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead className="text-right">Số lượng cần</TableHead>
                      <TableHead className="text-right">Tồn kho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center p-4">
                          Đang tính nhu cầu...
                        </TableCell>
                      </TableRow>
                    ) : needsQuery.isError ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center p-4 text-red-600"
                        >
                          {(needsQuery.error as any)?.message ||
                            "Không lấy được nhu cầu"}
                        </TableCell>
                      </TableRow>
                    ) : (needsQuery.data?.items?.length || 0) === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center p-4 text-muted-foreground"
                        >
                          Không có nhu cầu BOM (hoặc chưa khai báo BOM)
                        </TableCell>
                      </TableRow>
                    ) : (
                      needsQuery.data!.items.map((n: any) => {
                        const thiếu = (n.ton_kho ?? 0) < (n.so_luong_can ?? 0);
                        return (
                          <TableRow key={n.nguyen_lieu_id}>
                            <TableCell className="font-medium">
                              {n.ten_nl || "-"}{" "}
                              <span className="text-muted-foreground">
                                ({n.ma_nl || "-"})
                              </span>
                              {thiếu ? (
                                <span className="ml-2 text-xs text-red-600">
                                  (thiếu)
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell>{n.don_vi || "-"}</TableCell>
                            <TableCell className="text-right">
                              {n.so_luong_can}
                            </TableCell>
                            <TableCell className="text-right">
                              {n.ton_kho}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
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
