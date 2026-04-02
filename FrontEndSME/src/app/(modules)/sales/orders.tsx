"use client";

import * as React from "react";
import { useMemo } from "react";
import { useForm, useFieldArray, useWatch, Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useProductList } from "@/hooks/use-product";
import { useCreateOrderSale } from "@/hooks/use-order-sale";
import { useMyProfile } from "@/hooks/use-account";

/* ================= Types ================= */
type Product = {
  _id: string;
  ma_sp: string;
  ten_sp: string;
  don_gia?: number;

  so_luong?: number; // tồn (nếu backend dùng key này)
  ton_hien_tai?: number; // tồn (nếu backend dùng key này)
};

/* ================= Zod schema ================= */
const numMin0 = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}, z.number().min(0));

const numMin1 = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return 1;
  const n = Number(v);
  return Number.isFinite(n) ? n : 1;
}, z.number().min(1));

const schema = z.object({
  khach_hang_ten: z.string().trim().min(1, "Nhập tên khách hàng"),
  nguoi_lap_id: z.string().default(""),
  thue_rate: numMin0,
  phi_vc: numMin0,
  giam_gia: numMin0,
  ghi_chu: z.string().default(""),
  san_pham: z
    .array(
      z.object({
        san_pham_id: z.string().min(1, "Chọn sản phẩm"),
        ma_sp: z.string().min(1),
        ten_sp: z.string().min(1),
        don_gia: numMin0,
        so_luong: numMin1,
      })
    )
    .min(1),
});

type FormValues = z.infer<typeof schema>;

/* ================= Helpers ================= */
const n0 = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const toVND = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("vi-VN") + " đ";

const getPrice = (p?: Product | null) => n0(p?.don_gia ?? 0);
const getStock = (p?: Product | null) =>
  n0(p?.ton_hien_tai ?? p?.so_luong ?? 0);

export default function Orders() {
  /* ===== Profile (auto set nguoi_lap_id, KHÔNG HIỆN INPUT) ===== */
  const myProfileQuery = useMyProfile();
  const nguoiLapId =
    (myProfileQuery.data as any)?.user?._id ||
    (myProfileQuery.data as any)?._id ||
    (myProfileQuery.data as any)?.id ||
    "";

  /* ===== Product list ===== */
  const productQuery = useProductList({
    name: "",
    status: "active",
    page: 1,
    limit: 500,
  });

  const products: Product[] = useMemo(() => {
    const d: any = productQuery.data;
    const candidates =
      d?.data?.items ?? d?.data?.data?.items ?? d?.data ?? d?.items ?? d;
    return (Array.isArray(candidates) ? candidates : candidates?.items) ?? [];
  }, [productQuery.data]);

  /* ===== Create order hook ===== */
  const createMutation = useCreateOrderSale();

  /* ===== Form ===== */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      khach_hang_ten: "",
      nguoi_lap_id: "",
      thue_rate: 0.1,
      phi_vc: 0,
      giam_gia: 0,
      ghi_chu: "",
      san_pham: [
        {
          san_pham_id: "",
          ma_sp: "",
          ten_sp: "",
          don_gia: 0,
          so_luong: 1,
        },
      ],
    },
    mode: "onChange",
  });

  const { control, register, setValue, handleSubmit, reset, formState } = form;
  const { errors, isValid } = formState;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "san_pham",
  });

  const lines = useWatch({ control, name: "san_pham" }) ?? [];
  const thue_rate = useWatch({ control, name: "thue_rate" });
  const phi_vc = useWatch({ control, name: "phi_vc" });
  const giam_gia = useWatch({ control, name: "giam_gia" });

  React.useEffect(() => {
    if (nguoiLapId) {
      setValue("nguoi_lap_id", nguoiLapId, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [nguoiLapId, setValue]);

  /* ===== Totals ===== */
  const tamTinh = useMemo(() => {
    return (lines ?? []).reduce(
      (sum, l) => sum + n0(l.so_luong) * n0(l.don_gia),
      0
    );
  }, [lines]);

  const tienThue = useMemo(
    () => tamTinh * Math.max(0, n0(thue_rate)),
    [tamTinh, thue_rate]
  );

  const tongThanhToan = useMemo(() => {
    return (
      tamTinh + tienThue + Math.max(0, n0(phi_vc)) - Math.max(0, n0(giam_gia))
    );
  }, [tamTinh, tienThue, phi_vc, giam_gia]);

  const hasOverStock = useMemo(() => {
    return (lines ?? []).some((l) => {
      if (!l?.san_pham_id) return false;
      const p = products.find((x) => x._id === l.san_pham_id) || null;
      const ton = getStock(p);
      return n0(l.so_luong) > ton;
    });
  }, [lines, products]);

  /* ===== Select product ===== */
  const onSelectProduct = (rowIndex: number, productId: string) => {
    const p = products.find((x) => x._id === productId);
    if (!p) return;

    setValue(`san_pham.${rowIndex}.san_pham_id`, p._id, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`san_pham.${rowIndex}.ma_sp`, p.ma_sp, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`san_pham.${rowIndex}.ten_sp`, p.ten_sp, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`san_pham.${rowIndex}.don_gia`, getPrice(p), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`san_pham.${rowIndex}.so_luong`, 1, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  /* ===== Submit ===== */
  const onSubmit = async (values: FormValues) => {
    const payload = {
      khach_hang_ten: values.khach_hang_ten.trim(),
      nguoi_lap_id: values.nguoi_lap_id || "",
      san_pham: values.san_pham.map((l) => ({
        loai_hang: "san_pham",
        san_pham_id: l.san_pham_id,
        ma_sp: l.ma_sp,
        ten_sp: l.ten_sp,
        don_gia: n0(l.don_gia),
        so_luong: n0(l.so_luong),
      })),
      giam_gia: Math.max(0, n0(values.giam_gia)),
      thue_rate: Math.max(0, n0(values.thue_rate)),
      phi_vc: Math.max(0, n0(values.phi_vc)),
      ghi_chu: values.ghi_chu?.trim() || "",
    };

    try {
      await createMutation.mutate(payload as any);
      toast.success("Tạo hóa đơn thành công");
      reset();
    } catch (e: any) {
      toast.error(e?.message || "Tạo hóa đơn thất bại");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Đơn bán / Tạo hóa đơn</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Header */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Khách hàng</Label>
                <Input
                  placeholder="VD: Nguyễn Văn A"
                  {...register("khach_hang_ten")}
                />
                {errors.khach_hang_ten ? (
                  <p className="text-xs text-red-500">
                    {errors.khach_hang_ten.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Ghi chú</Label>
                <Input
                  placeholder="VD: Giao giờ hành chính"
                  {...register("ghi_chu")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Thuế rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("thue_rate")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Phí vận chuyển</Label>
                <Input type="number" min={0} {...register("phi_vc")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Giảm giá</Label>
                <Input type="number" min={0} {...register("giam_gia")} />
              </div>
            </div>

            {/* Lines */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Tồn</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {fields.map((f, idx) => {
                    const row = lines?.[idx];
                    const p = row?.san_pham_id
                      ? products.find((x) => x._id === row.san_pham_id) || null
                      : null;

                    const ton = getStock(p);
                    const overStock =
                      !!row?.san_pham_id && n0(row?.so_luong) > ton;

                    return (
                      <TableRow key={f.id}>
                        <TableCell className="w-[420px]">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={productQuery.isLoading}
                              >
                                {row?.san_pham_id
                                  ? `${row.ten_sp} (${row.ma_sp})`
                                  : productQuery.isLoading
                                  ? "Đang tải..."
                                  : "Chọn sản phẩm"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>

                            <PopoverContent
                              className="w-[420px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Tìm sản phẩm..." />
                                <CommandList>
                                  <CommandEmpty>
                                    Không tìm thấy sản phẩm.
                                  </CommandEmpty>

                                  <CommandGroup>
                                    {products.map((p) => (
                                      <CommandItem
                                        key={p._id}
                                        value={`${p.ten_sp} ${p.ma_sp}`.toLowerCase()}
                                        onSelect={() =>
                                          onSelectProduct(idx, p._id)
                                        }
                                        className="flex items-center justify-between"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {p.ten_sp}{" "}
                                            <span className="text-muted-foreground">
                                              ({p.ma_sp})
                                            </span>
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            Tồn: {getStock(p)} • Giá:{" "}
                                            {toVND(getPrice(p))}
                                          </span>
                                        </div>

                                        <Check
                                          className={cn(
                                            "h-4 w-4",
                                            row?.san_pham_id === p._id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          {errors.san_pham?.[idx]?.san_pham_id ? (
                            <p className="text-xs text-red-500 mt-1">
                              {
                                errors.san_pham[idx]?.san_pham_id
                                  ?.message as any
                              }
                            </p>
                          ) : null}
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {row?.san_pham_id ? ton : "-"}
                        </TableCell>

                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            className={cn(
                              "text-right",
                              overStock && "border-red-500"
                            )}
                            {...register(`san_pham.${idx}.so_luong` as const)}
                          />
                          {overStock ? (
                            <div className="text-xs text-red-500 mt-1">
                              Vượt tồn kho
                            </div>
                          ) : null}
                        </TableCell>

                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            className="text-right"
                            {...register(`san_pham.${idx}.don_gia` as const)}
                          />
                        </TableCell>

                        <TableCell className="text-right font-semibold">
                          {toVND(n0(row?.so_luong) * n0(row?.don_gia))}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(idx)}
                            disabled={fields.length === 1}
                          >
                            <IconTrash className="h-5 w-5 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    san_pham_id: "",
                    ma_sp: "",
                    ten_sp: "",
                    don_gia: 0,
                    so_luong: 1,
                  })
                }
              >
                <IconPlus className="mr-2 h-4 w-4" /> Thêm dòng
              </Button>

              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">
                  Tạm tính:{" "}
                  <span className="font-medium text-foreground">
                    {toVND(tamTinh)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Thuế:{" "}
                  <span className="font-medium text-foreground">
                    {toVND(tienThue)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Phí VC:{" "}
                  <span className="font-medium text-foreground">
                    {toVND(Math.max(0, n0(phi_vc)))}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Giảm giá:{" "}
                  <span className="font-medium text-foreground">
                    - {toVND(Math.max(0, n0(giam_gia)))}
                  </span>
                </div>
                <div className="text-lg font-semibold">
                  Tổng thanh toán:{" "}
                  <span className="text-primary">{toVND(tongThanhToan)}</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset()}
                disabled={createMutation.isPending}
              >
                Hủy
              </Button>

              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  productQuery.isLoading ||
                  !isValid ||
                  hasOverStock
                }
              >
                {createMutation.isPending ? "Đang tạo..." : "Tạo hóa đơn"}
              </Button>
            </div>

            {productQuery.isError ? (
              <p className="text-sm text-red-500">
                Lỗi tải sản phẩm:{" "}
                {(productQuery.error as any)?.message || "Unknown"}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
