"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  IconBrandShopee,
  IconBrandTiktok,
  IconShoppingCart,
  IconCalculator,
  IconArrowRight,
  IconAlertTriangle,
  IconShieldCheck,
  IconBuildingStore,
  IconSparkles,
  IconPackage,
  IconTruckReturn,
  IconPercentage,
  IconTag,
  IconRefresh,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchEcommercePoliciesAction,
  calculateEcommercePricingAction,
  compareEcommerceChannelsAction,
  fetchEcommerceMatrixAction,
  type EcommercePolicy,
  type PricingBreakdown,
  type OmnichannelComparison,
  type ProductPricingMatrixItem,
} from "@/app/actions/ecommerce-planning";
import { useProductList } from "@/hooks/use-product";

export function EcommercePlanningTab() {
  const [activeSubTab, setActiveSubTab] = useState<"calculator" | "matrix" | "campaign">("calculator");

  // State cho bộ tính giá
  const [selectedProductId, setSelectedProductId] = useState<string>("custom");
  const [listPrice, setListPrice] = useState<number>(2500000);
  const [cogs, setCogs] = useState<number>(1450000);
  const [channel, setChannel] = useState<"shopee" | "tiktok" | "lazada">("shopee");

  // Tùy chỉnh phí
  const [affiliatePct, setAffiliatePct] = useState<number>(0);
  const [packCost, setPackCost] = useState<number>(15000);
  const [returnRatePct, setReturnRatePct] = useState<number>(4);

  // Kết quả
  const [singleResult, setSingleResult] = useState<PricingBreakdown | null>(null);
  const [omniResult, setOmniResult] = useState<OmnichannelComparison | null>(null);
  const [matrixItems, setMatrixItems] = useState<ProductPricingMatrixItem[]>([]);
  const [matrixLoading, setMatrixLoading] = useState<boolean>(false);

  // Danh sách sản phẩm thực tế từ kho
  const { data: productData } = useProductList({ page: 1, limit: 100 });
  const productList = useMemo(() => {
    return ((productData as any)?.items || []) as any[];
  }, [productData]);

  // Khi chọn sản phẩm từ danh sách
  const handleSelectProduct = (val: string) => {
    setSelectedProductId(val);
    if (val === "custom") return;
    const p = productList.find((item) => String(item._id) === val);
    if (p) {
      const price = Number(p.don_gia || 0);
      setListPrice(price);
      // Ước lượng COGS nếu chưa có
      setCogs(Math.round(price * 0.58));
    }
  };

  // Tính toán mỗi khi thay đổi tham số
  useEffect(() => {
    async function calculate() {
      const single = await calculateEcommercePricingAction({
        gia_niem_yet: listPrice,
        gia_von: cogs,
        kenh_ban: channel,
        custom_policy: {
          phi_affiliate_koc_pct: channel === "tiktok" ? affiliatePct : 0,
          phi_dong_goi_co_dinh: packCost,
          ty_le_hoan_du_kien_pct: returnRatePct,
        },
      });
      if (single.success && single.data) setSingleResult(single.data);

      const omni = await compareEcommerceChannelsAction({
        gia_niem_yet: listPrice,
        gia_von: cogs,
      });
      if (omni.success && omni.data) setOmniResult(omni.data);
    }
    calculate();
  }, [listPrice, cogs, channel, affiliatePct, packCost, returnRatePct]);

  // Load ma trận giá các sản phẩm
  const loadMatrix = async () => {
    setMatrixLoading(true);
    const res = await fetchEcommerceMatrixAction();
    if (res.success) setMatrixItems(res.items);
    setMatrixLoading(false);
  };

  useEffect(() => {
    if (activeSubTab === "matrix" && matrixItems.length === 0) {
      loadMatrix();
    }
  }, [activeSubTab]);

  const toVND = (n: number) => Math.round(n || 0).toLocaleString("vi-VN") + " đ";

  const renderMarginBadge = (margin: number) => {
    if (margin >= 20) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          {margin}% · Rất an toàn
        </Badge>
      );
    }
    if (margin >= 10) {
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">
          {margin}% · Ổn định
        </Badge>
      );
    }
    if (margin > 0) {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
          {margin}% · Biên mỏng
        </Badge>
      );
    }
    return (
      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
        {margin}% · Bị Lỗ
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner Giới thiệu */}
      <div className="rounded-xl border border-border/80 bg-gradient-to-r from-orange-500/10 via-rose-500/5 to-purple-500/10 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 text-white font-bold text-sm shadow-xs">
                🛒
              </span>
              <h2 className="text-lg font-bold text-foreground">
                Kế Hoạch Bán Hàng & Định Giá Sàn TMĐT (Shopee, TikTok Shop, Lazada)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Hệ thống tự động tính trừ đầy đủ phí sàn, chi phí đóng gói xốp nổ, hoa hồng KOC và khấu hao rủi ro đơn hoàn. Đảm bảo doanh nghiệp luôn có lãi ròng thực tế trước khi tung giá lên mạng.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tabs
              value={activeSubTab}
              onValueChange={(v) => setActiveSubTab(v as any)}
              className="w-auto"
            >
              <TabsList className="bg-background/80 border shadow-2xs">
                <TabsTrigger value="calculator" className="text-xs">
                  🧮 Tính Giá Khấu Hao
                </TabsTrigger>
                <TabsTrigger value="matrix" className="text-xs">
                  📊 Ma Trận Toàn Kho
                </TabsTrigger>
                <TabsTrigger value="campaign" className="text-xs">
                  🎯 Kế Hoạch Mega Sale
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: BỘ TÍNH GIÁ & KHẤU HAO THỜI GIAN THỰC */}
      {activeSubTab === "calculator" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái: Form nhập tham số */}
            <Card className="lg:col-span-5 shadow-xs border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <IconCalculator className="h-4 w-4 text-primary" />
                  Thông Số Sản Phẩm & Kênh Bán
                </CardTitle>
                <CardDescription className="text-xs">
                  Chọn sản phẩm sẵn có hoặc nhập thủ công giá vốn và giá niêm yết
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {/* Chọn sản phẩm từ kho */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Chọn sản phẩm trong kho:</Label>
                  <Select value={selectedProductId} onValueChange={handleSelectProduct}>
                    <SelectTrigger size="sm" className="w-full text-xs">
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="custom">-- Nhập tùy chỉnh tự do --</SelectItem>
                      {productList.map((p) => (
                        <SelectItem key={p._id} value={String(p._id)}>
                          [{p.ma_sp}] {p.ten_sp} ({toVND(p.don_gia)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kênh bán */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Sàn thương mại điện tử:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={channel === "shopee" ? "default" : "outline"}
                      className={`text-xs flex items-center justify-center gap-1.5 ${
                        channel === "shopee" ? "bg-orange-600 hover:bg-orange-700 text-white" : ""
                      }`}
                      onClick={() => setChannel("shopee")}
                    >
                      <IconBrandShopee size={15} />
                      Shopee
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={channel === "tiktok" ? "default" : "outline"}
                      className={`text-xs flex items-center justify-center gap-1.5 ${
                        channel === "tiktok" ? "bg-zinc-900 hover:bg-black text-white dark:bg-zinc-800" : ""
                      }`}
                      onClick={() => setChannel("tiktok")}
                    >
                      <IconBrandTiktok size={15} />
                      TikTok Shop
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={channel === "lazada" ? "default" : "outline"}
                      className={`text-xs flex items-center justify-center gap-1.5 ${
                        channel === "lazada" ? "bg-blue-800 hover:bg-blue-900 text-white" : ""
                      }`}
                      onClick={() => setChannel("lazada")}
                    >
                      <IconBuildingStore size={15} />
                      Lazada
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Giá niêm yết bán trên sàn:</Label>
                    <Input
                      type="number"
                      value={listPrice}
                      onChange={(e) => setListPrice(Number(e.target.value))}
                      className="h-8 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Giá vốn sản xuất (COGS):</Label>
                    <Input
                      type="number"
                      value={cogs}
                      onChange={(e) => setCogs(Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Tham số nâng cao */}
                <div className="pt-3 border-t space-y-3">
                  <span className="font-semibold text-muted-foreground block text-2xs uppercase tracking-wider">
                    Khấu hao chi phí vận hành & rủi ro:
                  </span>

                  {channel === "tiktok" && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <IconSparkles size={13} className="text-purple-500" />
                        Hoa hồng Affiliate KOC:
                      </span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={affiliatePct}
                          onChange={(e) => setAffiliatePct(Number(e.target.value))}
                          className="h-7 w-16 text-right text-xs"
                        />
                        <span>%</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <IconPackage size={13} className="text-blue-500" />
                      Phí đóng gói (hộp/xốp nổ):
                    </span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={packCost}
                        onChange={(e) => setPackCost(Number(e.target.value))}
                        className="h-7 w-24 text-right text-xs"
                      />
                      <span>đ</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <IconTruckReturn size={13} className="text-rose-500" />
                      Tỷ lệ hoàn hàng dự trù:
                    </span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={returnRatePct}
                        onChange={(e) => setReturnRatePct(Number(e.target.value))}
                        className="h-7 w-16 text-right text-xs"
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cột phải: Kết quả chi tiết khấu hao & thực nhận */}
            <div className="lg:col-span-7 space-y-4">
              {singleResult && (
                <Card className="border-border/80 shadow-xs">
                  <CardHeader className="pb-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <span>Kết Quả Khấu Hao & Lợi Nhuận: {singleResult.kenh_ten}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Dòng tiền thực tế sau khi trừ mọi chi phí sàn và rủi ro
                        </CardDescription>
                      </div>
                      {renderMarginBadge(singleResult.margin_pct)}
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-5 text-xs">
                    {/* 3 KPI Số tiền chính */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-muted/40 border">
                        <span className="text-muted-foreground block text-2xs uppercase font-semibold">
                          Giá Niêm Yết
                        </span>
                        <div className="text-base font-bold mt-1 text-foreground">
                          {toVND(singleResult.gia_niem_yet)}
                        </div>
                        <span className="text-2xs text-muted-foreground">Giá khách nhìn thấy</span>
                      </div>

                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <span className="text-blue-600 dark:text-blue-400 block text-2xs uppercase font-semibold">
                          Sàn Trả Về Ví (Payout)
                        </span>
                        <div className="text-base font-bold mt-1 text-blue-700 dark:text-blue-300">
                          {toVND(singleResult.doanh_thu_thuc_nhan)}
                        </div>
                        <span className="text-2xs text-blue-600/80">Đã trừ phí thanh toán & sàn</span>
                      </div>

                      <div
                        className={`p-3 rounded-xl border ${
                          singleResult.loi_nhuan_rong >= 0
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : "bg-rose-500/10 border-rose-500/20"
                        }`}
                      >
                        <span
                          className={`block text-2xs uppercase font-semibold ${
                            singleResult.loi_nhuan_rong >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          Lãi Ròng Bỏ Túi
                        </span>
                        <div
                          className={`text-base font-bold mt-1 ${
                            singleResult.loi_nhuan_rong >= 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {toVND(singleResult.loi_nhuan_rong)}
                        </div>
                        <span className="text-2xs font-medium">Biên ròng: {singleResult.margin_pct}%</span>
                      </div>
                    </div>

                    {/* Chi tiết khấu hao */}
                    <div className="space-y-2 border rounded-xl p-3.5 bg-card">
                      <span className="font-semibold text-foreground block text-xs border-b pb-2">
                        Bóc tách chi phí & Phí sàn ({singleResult.chi_tiet_phi.ty_le_phi_san_pct}% giá niêm yết):
                      </span>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">• Phí thanh toán thẻ/ví (4%):</span>
                          <span className="font-medium text-rose-600">
                            -{toVND(singleResult.chi_tiet_phi.phi_thanh_toan)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">• Hoa hồng cố định sàn:</span>
                          <span className="font-medium text-rose-600">
                            -{toVND(singleResult.chi_tiet_phi.phi_hoa_hong)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">• Gói Freeship / Voucher Xtra:</span>
                          <span className="font-medium text-rose-600">
                            -{toVND(singleResult.chi_tiet_phi.phi_dich_vu)}
                          </span>
                        </div>
                        {singleResult.chi_tiet_phi.phi_affiliate > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">• Hoa hồng KOC Affiliate:</span>
                            <span className="font-medium text-purple-600">
                              -{toVND(singleResult.chi_tiet_phi.phi_affiliate)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">• Vật tư đóng gói (thùng/xốp):</span>
                          <span className="font-medium text-amber-600">
                            -{toVND(singleResult.chi_tiet_phi.phi_dong_goi)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">• Khấu hao rủi ro hoàn hàng:</span>
                          <span className="font-medium text-amber-600">
                            -{toVND(singleResult.chi_tiet_phi.rui_ro_hoan_hang)}
                          </span>
                        </div>
                        <div className="flex justify-between col-span-2 pt-2 border-t font-semibold">
                          <span>Tổng số tiền khấu trừ sàn & đóng gói:</span>
                          <span className="text-rose-600 font-bold">
                            -{toVND(singleResult.chi_tiet_phi.tong_khau_hao)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bảng so sánh nhanh 4 kênh bán */}
              {omniResult && (
                <Card className="border-border/80 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                      So Sánh Cùng Sản Phẩm Trên 4 Kênh Bán
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 text-xs">
                          <TableHead className="w-36">Kênh Bán</TableHead>
                          <TableHead className="text-right">Giá Niêm Yết</TableHead>
                          <TableHead className="text-right">Tổng Phí Sàn</TableHead>
                          <TableHead className="text-right">Thực Nhận</TableHead>
                          <TableHead className="text-right">Lãi Ròng</TableHead>
                          <TableHead className="text-center">Biên %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        <TableRow className="bg-emerald-500/5 hover:bg-emerald-500/10 font-semibold">
                          <TableCell className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <IconBuildingStore size={14} />
                            Trực tiếp (POS)
                          </TableCell>
                          <TableCell className="text-right">{toVND(omniResult.direct.gia_niem_yet)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">0 đ</TableCell>
                          <TableCell className="text-right">{toVND(omniResult.direct.doanh_thu_thuc_nhan)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{toVND(omniResult.direct.loi_nhuan_rong)}</TableCell>
                          <TableCell className="text-center">{omniResult.direct.margin_pct}%</TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell className="flex items-center gap-1.5 text-orange-600 font-medium">
                            <IconBrandShopee size={14} />
                            Shopee
                          </TableCell>
                          <TableCell className="text-right">{toVND(omniResult.shopee.gia_niem_yet)}</TableCell>
                          <TableCell className="text-right text-rose-600">-{toVND(omniResult.shopee.chi_tiet_phi.tong_phi_san)}</TableCell>
                          <TableCell className="text-right">{toVND(omniResult.shopee.doanh_thu_thuc_nhan)}</TableCell>
                          <TableCell className="text-right font-semibold">{toVND(omniResult.shopee.loi_nhuan_rong)}</TableCell>
                          <TableCell className="text-center">{omniResult.shopee.margin_pct}%</TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell className="flex items-center gap-1.5 font-medium">
                            <IconBrandTiktok size={14} />
                            TikTok Shop
                          </TableCell>
                          <TableCell className="text-right">{toVND(omniResult.tiktok.gia_niem_yet)}</TableCell>
                          <TableCell className="text-right text-rose-600">-{toVND(omniResult.tiktok.chi_tiet_phi.tong_phi_san)}</TableCell>
                          <TableCell className="text-right">{toVND(omniResult.tiktok.doanh_thu_thuc_nhan)}</TableCell>
                          <TableCell className="text-right font-semibold">{toVND(omniResult.tiktok.loi_nhuan_rong)}</TableCell>
                          <TableCell className="text-center">{omniResult.tiktok.margin_pct}%</TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-medium">
                            <IconBuildingStore size={14} />
                            Lazada
                          </TableCell>
                          <TableCell className="text-right">{toVND(omniResult.lazada.gia_niem_yet)}</TableCell>
                          <TableCell className="text-right text-rose-600">-{toVND(omniResult.lazada.chi_tiet_phi.tong_phi_san)}</TableCell>
                          <TableCell className="text-right">{toVND(omniResult.lazada.doanh_thu_thuc_nhan)}</TableCell>
                          <TableCell className="text-right font-semibold">{toVND(omniResult.lazada.loi_nhuan_rong)}</TableCell>
                          <TableCell className="text-center">{omniResult.lazada.margin_pct}%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: MA TRẬN TOÀN BỘ SẢN PHẨM TRÊN SÀN */}
      {activeSubTab === "matrix" && (
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Ma Trận Tỷ Suất Lợi Nhuận Toàn Bộ Sản Phẩm Trên Các Sàn</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Tự động đối chiếu giá niêm yết hiện tại để phát hiện những mặt hàng nào có nguy cơ lỗ khi bán online.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={loadMatrix} disabled={matrixLoading}>
              <IconRefresh className={`h-4 w-4 mr-1 ${matrixLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="w-24">Mã SP</TableHead>
                  <TableHead>Tên Sản Phẩm</TableHead>
                  <TableHead className="text-right">Giá Bán</TableHead>
                  <TableHead className="text-right">Giá Vốn Ước Tính</TableHead>
                  <TableHead className="text-right font-semibold text-emerald-700">Lãi POS</TableHead>
                  <TableHead className="text-right font-semibold text-orange-600">Lãi Shopee</TableHead>
                  <TableHead className="text-right font-semibold">Lãi TikTok</TableHead>
                  <TableHead className="text-right font-semibold text-blue-700">Lãi Lazada</TableHead>
                  <TableHead className="text-center">Đánh Giá</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {matrixItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-semibold">{item.ma_sp}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{item.ten_sp}</TableCell>
                    <TableCell className="text-right font-bold">{toVND(item.gia_niem_yet)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{toVND(item.gia_von_uoc_tinh)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {toVND(item.channels.direct.loi_nhuan_rong)}
                      <span className="block text-2xs text-muted-foreground">({item.channels.direct.margin_pct}%)</span>
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {toVND(item.channels.shopee.loi_nhuan_rong)}
                      <span className="block text-2xs text-muted-foreground">({item.channels.shopee.margin_pct}%)</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {toVND(item.channels.tiktok.loi_nhuan_rong)}
                      <span className="block text-2xs text-muted-foreground">({item.channels.tiktok.margin_pct}%)</span>
                    </TableCell>
                    <TableCell className="text-right text-blue-700 font-medium">
                      {toVND(item.channels.lazada.loi_nhuan_rong)}
                      <span className="block text-2xs text-muted-foreground">({item.channels.lazada.margin_pct}%)</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {renderMarginBadge(item.channels.shopee.margin_pct)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* SUBTAB 3: KẾ HOẠCH TỒN KHO MEGA SALE */}
      {activeSubTab === "campaign" && (
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <IconSparkles className="h-4 w-4 text-purple-600" />
              Lập Kế Hoạch Cung Ứng Cho Chiến Dịch Mega Sale Sàn (Ngày Đôi 9/9, 11/11, Lương Về)
            </CardTitle>
            <CardDescription className="text-xs">
              Trong các đợt Mega Sale, lượng đơn online thường tăng gấp 3x - 5x ngày thường. Bảng này giúp tính toán trước số lượng NVL cần sản xuất và ngân sách dự toán để không bị đứt hàng.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-card space-y-2">
                <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Shopee Super Mega Day (9/9 - 11/11)
                </span>
                <p className="text-muted-foreground text-xs">
                  Dự kiến nhu cầu: <strong>+350%</strong> so với ngày thường. Cần chuẩn bị tồn kho trước 20 ngày.
                </p>
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Mức giảm giá sàn đề xuất:</span>
                  <span className="text-rose-600">Tối đa 12% để bảo toàn lãi</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-card space-y-2">
                <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white" />
                  TikTok Shop Mega Live Marathon
                </span>
                <p className="text-muted-foreground text-xs">
                  Dự kiến nhu cầu: Tập trung vào 2 - 3 sản phẩm chủ lực (Hero SKU). Đơn hàng bùng nổ theo phiên Live.
                </p>
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Tỷ lệ hoàn dự phòng:</span>
                  <span className="text-amber-600">Tính sẵn 8% đơn hoàn</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-card space-y-2">
                <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Chiến Dịch Lương Về (Payday 25 - 28)
                </span>
                <p className="text-muted-foreground text-xs">
                  Dự kiến nhu cầu: <strong>+180%</strong>. Khách hàng sẵn sàng chi tiêu cho các món nội thất lớn.
                </p>
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Khuyến nghị MRP:</span>
                  <span className="text-emerald-600">Đặt NVL từ ngày 10 hàng tháng</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
