"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconTrash, IconPlus } from "@tabler/icons-react";

import { useMaterialStockList } from "@/hooks/use-material";
import { useCreatePurchaseReceipt } from "@/hooks/use-purchase-receipt";

type NguyenLieuStock = {
  _id: string;
  ma_nl: string;
  ten_nl: string;
  don_vi: string;
  so_luong: number;
  gia_nhap?: number;
};

type ReceiptItem = {
  nguyen_lieu_id?: string;
  ma_nl?: string;
  ten_nl?: string;
  don_vi?: string;
  so_luong: number;
  don_gia: number;
};

const toNumber = (v: any, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export default function CreateOrder() {
  const [nhaCungCap, setNhaCungCap] = React.useState("");
  const [ghiChu, setGhiChu] = React.useState("");
  const [openPopover, setOpenPopover] = React.useState<number | null>(null);

  const stockQuery = useMaterialStockList({ name: "", page: 1, limit: 200 });
  const nlList: NguyenLieuStock[] = stockQuery.data?.items ?? [];

  const [items, setItems] = React.useState<ReceiptItem[]>([
    { so_luong: 1, don_gia: 0 },
  ]);

  const createMut = useCreatePurchaseReceipt();

  const handleAddRow = () =>
    setItems((prev) => [...prev, { so_luong: 1, don_gia: 0 }]);
  const handleRemoveRow = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSelectNL = (idx: number, nl_id: string) => {
    const nl = nlList.find((x) => x._id === nl_id);
    if (!nl) return;

    setItems((prev) => {
      const clone = [...prev];
      clone[idx] = {
        ...clone[idx],
        nguyen_lieu_id: nl._id,
        ma_nl: nl.ma_nl,
        ten_nl: nl.ten_nl,
        don_vi: nl.don_vi,
        don_gia: clone[idx].don_gia || Number(nl.gia_nhap || 0),
      };
      return clone;
    });
    setOpenPopover(null); // Đóng popover sau khi chọn
  };

  const handleChangeItem = (
    idx: number,
    field: keyof ReceiptItem,
    value: any
  ) => {
    setItems((prev) => {
      const clone = [...prev];
      clone[idx] = { ...clone[idx], [field]: value };
      return clone;
    });
  };

  const tongTien = items.reduce(
    (sum, it) => sum + (it.so_luong || 0) * (it.don_gia || 0),
    0
  );

  const handleSubmit = async () => {
    const ncc = nhaCungCap.trim();
    if (!ncc) return toast.error("Vui lòng nhập tên nhà cung cấp");

    const lines = items
      .filter((it) => it.nguyen_lieu_id && it.so_luong > 0)
      .map((it) => ({
        loai_hang: "nguyen_lieu" as const,
        nguyen_lieu_id: it.nguyen_lieu_id!,
        ma_nl: it.ma_nl,
        ten_nl: it.ten_nl,
        don_vi: it.don_vi,
        don_gia: Number(it.don_gia || 0),
        so_luong: Number(it.so_luong || 0),
      }));

    if (!lines.length) return toast.error("Đơn cần ít nhất 1 dòng nguyên liệu");

    try {
      await createMut.mutateAsync({
        nha_cung_cap_ten: ncc,
        san_pham: lines,
        ghi_chu: ghiChu?.trim() || undefined,
      });

      toast.success("Tạo đơn nhập thành công");
      setNhaCungCap("");
      setGhiChu("");
      setItems([{ so_luong: 1, don_gia: 0 }]);
    } catch (e: any) {
      toast.error(e?.message || "Tạo đơn thất bại");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lên đơn nhập nguyên liệu</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nhà cung cấp</Label>
              <Input
                placeholder="VD: Công ty ABC"
                value={nhaCungCap}
                onChange={(e) => setNhaCungCap(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Ghi chú</Label>
              <Input
                placeholder="(tuỳ chọn)"
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nguyên liệu</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="w-[350px]">
                      <Popover
                        open={openPopover === idx}
                        onOpenChange={(open) =>
                          setOpenPopover(open ? idx : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openPopover === idx}
                            className="w-full justify-between font-normal"
                          >
                            <span className="truncate">
                              {it.nguyen_lieu_id
                                ? nlList.find(
                                    (nl) => nl._id === it.nguyen_lieu_id
                                  )?.ten_nl
                                : stockQuery.isLoading
                                ? "Đang tải..."
                                : "Chọn nguyên liệu..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Tìm mã hoặc tên..." />
                            <CommandList>
                              <CommandEmpty>
                                Không tìm thấy nguyên liệu.
                              </CommandEmpty>
                              <CommandGroup>
                                {nlList.map((nl) => (
                                  <CommandItem
                                    key={nl._id}
                                    value={`${nl.ten_nl} ${nl.ma_nl}`} // Để search được cả 2
                                    onSelect={() => handleSelectNL(idx, nl._id)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        it.nguyen_lieu_id === nl._id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{nl.ten_nl}</span>
                                      <span className="text-xs text-muted-foreground">
                                        Mã: {nl.ma_nl} | Tồn: {nl.so_luong}{" "}
                                        {nl.don_vi}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </TableCell>

                    <TableCell>{it.don_vi || "-"}</TableCell>

                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        className="text-right"
                        value={it.so_luong}
                        onChange={(e) =>
                          handleChangeItem(
                            idx,
                            "so_luong",
                            toNumber(e.target.value, 0)
                          )
                        }
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        className="text-right"
                        value={it.don_gia}
                        onChange={(e) =>
                          handleChangeItem(
                            idx,
                            "don_gia",
                            toNumber(e.target.value, 0)
                          )
                        }
                      />
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {((it.so_luong || 0) * (it.don_gia || 0)).toLocaleString(
                        "vi-VN"
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={items.length === 1}
                      >
                        <IconTrash className="h-5 w-5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleAddRow}>
              <IconPlus className="mr-2 h-4 w-4" /> Thêm dòng
            </Button>

            <div className="text-lg font-semibold">
              Tổng tiền:{" "}
              <span className="text-primary">
                {tongTien.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setNhaCungCap("");
                setGhiChu("");
                setItems([{ so_luong: 1, don_gia: 0 }]);
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending}>
              {createMut.isPending ? "Đang lưu..." : "Lưu đơn nhập"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
