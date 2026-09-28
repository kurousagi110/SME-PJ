"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { useCreateDieuChinhKho } from "@/hooks/use-dieu-chinh-kho";
import { useMaterialCatalog } from "@/hooks/use-material";
import { useProductList } from "@/hooks/use-product";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INIT = {
  loai: "",
  item_id: "",
  ma_hang: "",
  ten_hang: "",
  ton_kho_truoc: 0,
  kieu: "",       // "tang" | "giam" | "hu_hong"
  so_luong: "",
  ly_do: "",
};

export function TaoPhieuDieuChinhKhoDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(INIT);
  const [comboOpen, setComboOpen] = useState(false);

  const createMutation = useCreateDieuChinhKho();

  // Luôn fetch cả hai, React Query cache sẽ giúp không gọi lại nếu đã có
  const { data: materialData, isLoading: loadingMaterial } = useMaterialCatalog({
    name: "",
    page: 1,
    limit: 500,
  });

  const { data: productData, isLoading: loadingProduct } = useProductList({
    name: "",
    page: 1,
    limit: 500,
  });

  const items = useMemo(() => {
    if (form.loai === "nguyen_lieu") return materialData?.items ?? [];
    if (form.loai === "san_pham")   return productData?.data?.items ?? [];
    return [];
  }, [form.loai, materialData, productData]);

  const isLoadingItems =
    (form.loai === "nguyen_lieu" && loadingMaterial) ||
    (form.loai === "san_pham"   && loadingProduct);

  const getItemCode = (item: any) => item.ma_nl ?? item.ma_sp ?? "";
  const getItemName = (item: any) => item.ten_nl ?? item.ten_sp ?? "";

  const handleSelectLoai = (v: string) => {
    setForm({ ...INIT, loai: v });
  };

  const handleSelectItem = (item: any) => {
    setForm((f) => ({
      ...f,
      item_id:      item._id,
      ma_hang:      getItemCode(item),
      ten_hang:     getItemName(item),
      ton_kho_truoc: item.so_luong ?? 0,
    }));
    setComboOpen(false);
  };

  const handleClose = () => {
    setForm(INIT);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.loai || !form.item_id || !form.kieu || !form.so_luong || !form.ly_do) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const qty = parseInt(form.so_luong, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Số lượng phải là số nguyên dương");
      return;
    }

    const so_luong_dieu_chinh = form.kieu === "tang" ? qty : -qty;
    const ly_do =
      form.kieu === "hu_hong" ? `[Hư hỏng] ${form.ly_do}` : form.ly_do;

    createMutation.mutate(
      {
        loai: form.loai,
        item_id: form.item_id,
        ma_hang: form.ma_hang,
        ten_hang: form.ten_hang,
        so_luong_dieu_chinh,
        ton_kho_truoc: form.ton_kho_truoc,
        ly_do,
      },
      {
        onSuccess: () => {
          toast.success("Tạo phiếu điều chỉnh kho thành công");
          handleClose();
        },
      }
    );
  };

  const selectedLabel = form.ma_hang
    ? `${form.ma_hang} — ${form.ten_hang}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo phiếu điều chỉnh kho</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Loại hàng */}
          <div className="space-y-1">
            <Label>
              Loại hàng <span className="text-red-500">*</span>
            </Label>
            <Select value={form.loai} onValueChange={handleSelectLoai}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại hàng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nguyen_lieu">Nguyên liệu</SelectItem>
                <SelectItem value="san_pham">Sản phẩm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Combobox chọn hàng hóa */}
          <div className="space-y-1">
            <Label>
              Hàng hóa <span className="text-red-500">*</span>
            </Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  disabled={!form.loai}
                  className="w-full justify-between font-normal"
                >
                  {isLoadingItems
                    ? "Đang tải..."
                    : (selectedLabel ?? "Tìm và chọn hàng hóa...")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tìm theo mã hoặc tên..." />
                  <CommandList>
                    {isLoadingItems ? (
                      <CommandEmpty>Đang tải danh sách...</CommandEmpty>
                    ) : items.length === 0 ? (
                      <CommandEmpty>Không tìm thấy hàng hóa.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {items.map((item: any) => {
                          const code = getItemCode(item);
                          const name = getItemName(item);
                          return (
                            <CommandItem
                              key={item._id}
                              value={`${code} ${name}`}
                              onSelect={() => handleSelectItem(item)}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 shrink-0 ${
                                  form.item_id === item._id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <span className="font-mono text-xs mr-2 text-muted-foreground">
                                {code}
                              </span>
                              {name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.item_id && (
              <p className="text-xs text-muted-foreground">
                Tồn kho hiện tại: <span className="font-medium">{form.ton_kho_truoc}</span>
              </p>
            )}
          </div>

          {/* Kiểu điều chỉnh / Số lượng */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                Kiểu điều chỉnh <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.kieu}
                onValueChange={(v) => setForm((f) => ({ ...f, kieu: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kiểu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tang">Tăng</SelectItem>
                  <SelectItem value="giam">Giảm</SelectItem>
                  <SelectItem value="hu_hong">Hư hỏng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                Số lượng <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="0"
                value={form.so_luong}
                onChange={(e) =>
                  setForm((f) => ({ ...f, so_luong: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Lý do */}
          <div className="space-y-1">
            <Label>
              Lý do <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Nhập lý do điều chỉnh..."
              rows={3}
              value={form.ly_do}
              onChange={(e) => setForm((f) => ({ ...f, ly_do: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang tạo..." : "Tạo phiếu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
