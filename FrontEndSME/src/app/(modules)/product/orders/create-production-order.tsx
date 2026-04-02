"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { useMyProfile } from "@/hooks/use-account";
import { myProfile } from "@/app/actions/auth";
import { useSanPhamList, SanPham } from "@/hooks/use-san-pham";
import { useMaterialStockMap } from "@/hooks/use-material-stock";
import { useCreateProductionReceipt } from "@/hooks/use-production-receipts";

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

const n = (v: any, def = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
};

type MeUser = { _id: string; ho_ten?: string };

function normalizeMe(raw: any): MeUser | null {
  const r = raw?.data ?? raw;
  const user = r?.data?.data ?? r?.data ?? r;
  if (!user?._id) return null;
  return { _id: String(user._id), ho_ten: user.ho_ten };
}

export default function CreateProductionOrder() {
  const [openSp, setOpenSp] = React.useState(false);
  const [productId, setProductId] = React.useState<string>("");
  const [soLuongSP, setSoLuongSP] = React.useState<number>(1);
  const [ghiChu, setGhiChu] = React.useState("");

  // Load profile
  const meQuery = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const res = await myProfile();
      if (!res?.success) throw new Error("Không lấy được thông tin tài khoản");
      const me = normalizeMe(res?.data);
      if (!me) throw new Error("Thông tin tài khoản không hợp lệ");
      return me;
    },
    staleTime: 30_000,
  });

  const me = meQuery.data;

  // Load products (limit cao để search client-side mượt hơn)
  const spQuery = useSanPhamList({ page: 1, limit: 500, q: "" });
  const products: SanPham[] = spQuery.data?.items ?? [];

  // Load stock NL
  const stockQuery = useMaterialStockMap();
  const stockMap = stockQuery.data?.map;

  const product = React.useMemo(
    () => products.find((p) => p._id === productId) ?? null,
    [products, productId]
  );

  const needs = React.useMemo(() => {
    if (!product) return [];
    const qty = n(soLuongSP, 0);
    const nl = Array.isArray(product.nguyen_lieu) ? product.nguyen_lieu : [];
    return nl.map((x) => {
      const soLuongCan = Number((n(x.so_luong, 0) * qty).toFixed(4));
      const ton = stockMap?.get(x.ma_nl)?.so_luong ?? null;
      return {
        ma_nl: x.ma_nl,
        ten_nl: x.ten_nl,
        don_vi: x.don_vi,
        dinh_muc_cho_1sp: n(x.so_luong, 0),
        so_luong_can: soLuongCan,
        ton_kho: typeof ton === "number" ? ton : null,
      };
    });
  }, [product, soLuongSP, stockMap]);

  const hasLack = React.useMemo(() => {
    for (const n1 of needs) {
      if (typeof n1.ton_kho === "number" && n1.so_luong_can > n1.ton_kho)
        return true;
    }
    return false;
  }, [needs]);

  const createMut = useCreateProductionReceipt();

  const handleSubmit = async () => {
    if (!me?._id) return toast.error("Chưa có thông tin người lập");
    if (!product) return toast.error("Vui lòng chọn sản phẩm");
    if (n(soLuongSP, 0) <= 0) return toast.error("Số lượng phải > 0");
    if (hasLack) return toast.error("Không đủ tồn kho nguyên liệu");

    try {
      await createMut.mutateAsync({
        nguoi_lap_id: me._id,
        san_pham: [
          {
            loai_hang: "san_pham",
            san_pham_id: product._id,
            ma_sp: product.ma_sp,
            ten_sp: product.ten_sp,
            don_vi: product.don_vi || "cái",
            don_gia: 0,
            so_luong: n(soLuongSP, 0),
          },
        ],
        ghi_chu: ghiChu,
      });

      toast.success("Tạo đơn nhập sản xuất thành công");
      setProductId("");
      setSoLuongSP(1);
      setGhiChu("");
    } catch (e: any) {
      toast.error(e?.message || "Tạo đơn thất bại");
    }
  };

  const loading =
    meQuery.isLoading || spQuery.isLoading || stockQuery.isLoading;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Đơn nhập thành phẩm từ sản xuất</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Form Header */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Người lập</Label>
              <Input
                value={me?.ho_ten || me?._id || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <Label>Ghi chú</Label>
              <Input
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="VD: Sản xuất theo đơn hàng dự án A..."
              />
            </div>
          </div>

          {/* Product Selection + Qty */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-end">
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <Label>Sản phẩm cần sản xuất</Label>
              <Popover open={openSp} onOpenChange={setOpenSp}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between font-normal",
                      !productId && "text-muted-foreground"
                    )}
                  >
                    {productId
                      ? products.find((p) => p._id === productId)?.ten_sp
                      : "Tìm mã hoặc tên sản phẩm..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Gõ tên hoặc mã sản phẩm..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy sản phẩm.</CommandEmpty>
                      <CommandGroup>
                        {products.map((p) => (
                          <CommandItem
                            key={p._id}
                            value={`${p.ten_sp} ${p.ma_sp}`}
                            onSelect={() => {
                              setProductId(p._id);
                              setOpenSp(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                productId === p._id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{p.ten_sp}</span>
                              <span className="text-xs text-muted-foreground">
                                Mã: {p.ma_sp}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Số lượng (Thành phẩm)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={soLuongSP}
                  onChange={(e) => setSoLuongSP(n(e.target.value, 1))}
                  className="text-right"
                />
                <span className="text-sm text-muted-foreground min-w-[40px]">
                  {product?.don_vi || "cái"}
                </span>
              </div>
            </div>
          </div>

          {/* BOM Needs Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Định mức nguyên liệu (BOM)
              </h3>
            </div>

            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nguyên liệu</TableHead>
                    <TableHead>Đơn vị</TableHead>
                    <TableHead className="text-right">Định mức/1 SP</TableHead>
                    <TableHead className="text-right">Tổng cần</TableHead>
                    <TableHead className="text-right">
                      Hiện có trong kho
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!product ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-10 text-muted-foreground italic"
                      >
                        Hãy chọn sản phẩm bên trên để hệ thống tính toán nguyên
                        liệu cần dùng.
                      </TableCell>
                    </TableRow>
                  ) : needs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-10 text-muted-foreground"
                      >
                        Sản phẩm này chưa được cấu hình định mức nguyên liệu.
                      </TableCell>
                    </TableRow>
                  ) : (
                    needs.map((x) => {
                      const lack =
                        typeof x.ton_kho === "number" &&
                        x.so_luong_can > x.ton_kho;
                      return (
                        <TableRow key={x.ma_nl}>
                          <TableCell className="font-medium">
                            {x.ten_nl} <br />
                            <span className="text-[10px] text-muted-foreground">
                              Mã: {x.ma_nl}
                            </span>
                          </TableCell>
                          <TableCell>{x.don_vi}</TableCell>
                          <TableCell className="text-right">
                            {x.dinh_muc_cho_1sp}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {x.so_luong_can.toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold",
                              lack ? "text-red-600" : "text-green-600"
                            )}
                          >
                            {x.ton_kho == null
                              ? "N/A"
                              : x.ton_kho.toLocaleString("vi-VN")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {hasLack && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm">
                <span className="text-lg">⚠️</span>
                <span>
                  Cảnh báo: Kho không đủ nguyên liệu để sản xuất số lượng này.
                  Vui lòng kiểm tra lại.
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setProductId("");
                setSoLuongSP(1);
                setGhiChu("");
              }}
            >
              Làm mới
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                !product ||
                n(soLuongSP, 0) <= 0 ||
                hasLack ||
                createMut.isPending
              }
            >
              {createMut.isPending ? "Đang xử lý..." : "Xác nhận tạo đơn nhập"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
