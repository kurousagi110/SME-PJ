"use client";

import React, { useState, useMemo } from "react";
import {
  IconBarcode,
  IconPrinter,
  IconCheck,
  IconSearch,
  IconAdjustmentsHorizontal,
  IconPackage,
  IconWood,
  IconInfoCircle,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useProductList } from "@/hooks/use-product";
import { useMaterialCatalog } from "@/hooks/use-material";
import {
  generateCode128SvgString,
  printBarcodeLabels,
  type BarcodePrintItem,
  type LabelTemplate,
} from "@/lib/barcode";

export default function BarcodePrintPage() {
  const [activeTab, setActiveTab] = useState<"san_pham" | "nguyen_lieu">("san_pham");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>("thermal_35x22");
  const [selectedItems, setSelectedItems] = useState<Map<string, BarcodePrintItem>>(new Map());

  // Data fetching
  const { data: productRes, isLoading: loadingProducts } = useProductList({
    page: 1,
    limit: 100,
    name: "",
  });
  const { data: materialRes, isLoading: loadingMaterials } = useMaterialCatalog({
    page: 1,
    limit: 100,
    name: "",
  });

  const products = useMemo(() => {
    return (productRes?.data?.items || []) as any[];
  }, [productRes]);

  const materials = useMemo(() => {
    return (materialRes?.items || []) as any[];
  }, [materialRes]);

  const filteredItems = useMemo(() => {
    const list = activeTab === "san_pham" ? products : materials;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return list;
    return list.filter(
      (it) =>
        (it.ten_sp || it.ten_nl || it.ten || "").toLowerCase().includes(term) ||
        (it.ma_sp || it.ma_nl || "").toLowerCase().includes(term)
    );
  }, [activeTab, products, materials, searchTerm]);

  const toggleSelect = (item: any) => {
    const id = item._id;
    const code = item.ma_sp || item.ma_nl || item.code || "";
    const name = item.ten_sp || item.ten_nl || item.ten || "";
    const price = item.gia_ban || item.don_gia || item.gia_nhap || 0;
    const unit = item.don_vi || "cái";

    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, { id, code, name, price, unit, count: 1 });
      }
      return next;
    });
  };

  const updateCount = (id: string, count: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, count: Math.max(1, count) });
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      for (const it of filteredItems) {
        const id = it._id;
        const code = it.ma_sp || it.ma_nl || "";
        const name = it.ten_sp || it.ten_nl || it.ten || "";
        const price = it.gia_ban || it.don_gia || 0;
        const unit = it.don_vi || "cái";
        if (!next.has(id)) {
          next.set(id, { id, code, name, price, unit, count: 1 });
        }
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Map());
  };

  const selectedList = useMemo(() => {
    return Array.from(selectedItems.values());
  }, [selectedItems]);

  const totalLabelCount = useMemo(() => {
    return selectedList.reduce((sum, it) => sum + (Number(it.count) || 0), 0);
  }, [selectedList]);

  const handlePrint = () => {
    if (selectedList.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 mặt hàng để in tem mã vạch");
      return;
    }
    printBarcodeLabels(selectedList, selectedTemplate);
    toast.success(`Đang mở cửa sổ in ${totalLabelCount} con tem...`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconBarcode className="h-7 w-7 text-primary" />
            In Tem Mã Vạch (Barcode Generator)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sinh mã vạch chuẩn Code 128 cho thành phẩm và nguyên vật liệu. Hỗ trợ in tem nhiệt cuộn 35x22mm, 50x30mm và decal A4.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="lg"
            className="gap-2 font-semibold shadow"
            disabled={selectedList.length === 0}
            onClick={handlePrint}
          >
            <IconPrinter className="h-5 w-5" />
            In Tem Ngay ({totalLabelCount} tem)
          </Button>
        </div>
      </div>

      {/* Control Bar: Template selection & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-2">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Label className="text-sm font-semibold whitespace-nowrap">Khổ in tem nhãn:</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(val: LabelTemplate) => setSelectedTemplate(val)}
              >
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Chọn khổ giấy in" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thermal_35x22">Cuộn nhiệt 35x22mm (Chuẩn máy in tem)</SelectItem>
                  <SelectItem value="thermal_50x30">Cuộn nhiệt 50x30mm (Tem khổ lớn)</SelectItem>
                  <SelectItem value="a4_30">Decal A4 (30 tem / trang 3x10)</SelectItem>
                  <SelectItem value="a4_65">Decal A4 (65 tem / trang 5x13)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Chọn tất cả ({filteredItems.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={selectedList.length === 0}
              >
                Bỏ chọn
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Đã chọn</div>
              <div className="text-xl font-bold text-primary">{selectedList.length} mặt hàng</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Tổng số tem in</div>
              <div className="text-xl font-bold text-emerald-600">{totalLabelCount} nhãn</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product / Material Selector */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Danh Sách Mặt Hàng</CardTitle>
                <div className="relative w-64">
                  <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo tên hoặc mã SP..."
                    className="pl-8 h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as any)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="san_pham" className="gap-2">
                    <IconPackage className="h-4 w-4" /> Thành phẩm ({products.length})
                  </TabsTrigger>
                  <TabsTrigger value="nguyen_lieu" className="gap-2">
                    <IconWood className="h-4 w-4" /> Nguyên vật liệu ({materials.length})
                  </TabsTrigger>
                </TabsList>

                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 divide-y">
                  {filteredItems.map((item: any) => {
                    const id = item._id;
                    const code = item.ma_sp || item.ma_nl || "";
                    const name = item.ten_sp || item.ten_nl || item.ten || "";
                    const price = item.gia_ban || item.don_gia || item.gia_nhap || 0;
                    const unit = item.don_vi || "cái";
                    const isSelected = selectedItems.has(id);
                    const count = selectedItems.get(id)?.count || 1;

                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                        onClick={() => toggleSelect(item)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isSelected && <IconCheck className="h-3.5 w-3.5" />}
                          </div>

                          <div>
                            <div className="font-semibold text-sm leading-tight flex items-center gap-2">
                              {name}
                              <Badge variant="outline" className="font-mono text-xs">
                                {code}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Đơn giá: {price ? price.toLocaleString("vi-VN") + " đ" : "0 đ"} / {unit}
                              {item.so_luong !== undefined && ` • Tồn: ${item.so_luong}`}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label className="text-xs text-muted-foreground">Số tem:</Label>
                            <Input
                              type="number"
                              min="1"
                              max="999"
                              value={count}
                              onChange={(e) => updateCount(id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-center text-sm font-semibold"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Không tìm thấy mặt hàng nào phù hợp với từ khóa "{searchTerm}".
                    </div>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Label Preview */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Xem Trước Nhãn Tem (Preview)</CardTitle>
                  <CardDescription className="text-xs">
                    Mô phỏng kích thước thực tế khi in ra máy in tem
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {selectedTemplate === "thermal_35x22"
                    ? "35x22mm"
                    : selectedTemplate === "thermal_50x30"
                    ? "50x30mm"
                    : "A4 Decal"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 bg-muted/20 flex flex-col items-center justify-center min-h-[350px]">
              {selectedList.length === 0 ? (
                <div className="text-center text-muted-foreground p-6">
                  <IconBarcode className="h-16 w-16 mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-sm">Chưa có mặt hàng nào được chọn</p>
                  <p className="text-xs mt-1">Tích chọn sản phẩm ở danh sách bên trái để xem trước tem in</p>
                </div>
              ) : (
                <div className="w-full space-y-4 max-h-[520px] overflow-y-auto pr-1">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <IconInfoCircle className="h-3.5 w-3.5" />
                    Hiển thị mẫu của {Math.min(selectedList.length, 3)} món đầu tiên:
                  </div>

                  {selectedList.slice(0, 3).map((it) => {
                    const svgHtml = generateCode128SvgString(it.code, 32, true);
                    return (
                      <div
                        key={it.id}
                        className="bg-white text-black p-3 rounded shadow-sm border border-neutral-300 mx-auto text-center flex flex-col items-center justify-between"
                        style={{
                          width: selectedTemplate.includes("50x30") ? "220px" : "190px",
                          minHeight: selectedTemplate.includes("50x30") ? "130px" : "105px",
                        }}
                      >
                        <div className="text-[11px] font-bold line-clamp-1 w-full text-center">
                          {it.name}
                        </div>
                        <div
                          className="w-full my-1"
                          dangerouslySetInnerHTML={{ __html: svgHtml }}
                        />
                        <div className="text-[11px] font-extrabold text-neutral-900">
                          {it.price ? it.price.toLocaleString("vi-VN") + " đ" : it.code}
                        </div>
                      </div>
                    );
                  })}

                  {selectedList.length > 3 && (
                    <div className="text-center text-xs text-muted-foreground pt-2">
                      ... và {selectedList.length - 3} mặt hàng khác đã được chọn sẵn.
                    </div>
                  )}

                  <div className="pt-4 border-t w-full flex justify-center">
                    <Button onClick={handlePrint} className="gap-2 font-semibold shadow">
                      <IconPrinter className="h-4 w-4" /> In Toàn Bộ {totalLabelCount} Tem
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
