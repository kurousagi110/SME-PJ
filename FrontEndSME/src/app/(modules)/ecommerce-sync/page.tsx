"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconBrandShopee,
  IconRefresh,
  IconPlus,
  IconLink,
  IconCoin,
  IconPlugConnected,
} from "@tabler/icons-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useProductList } from "@/hooks/use-product";
import {
  fetchEcommerceSyncOverviewAction,
  upsertEcommerceChannelAction,
  upsertEcommerceMappingAction,
  syncChannelInventoryAction,
  settleChannelPayoutAction,
  type EcommerceSyncOverview,
  type EcommerceChannel,
} from "@/app/actions/ecommerce-sync";

const fmtVnd = (n: number) => `${Math.round(n || 0).toLocaleString("vi-VN")} đ`;

export default function EcommerceSyncPage() {
  const [data, setData] = useState<EcommerceSyncOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: prodRes } = useProductList({ page: 1, limit: 100, name: "" });
  const products = (prodRes?.data?.items || []) as { _id: string; ma_sp: string; ten_sp: string; so_luong?: number }[];

  // Channel Dialog
  const [channelDialog, setChannelDialog] = useState(false);
  const [chForm, setChForm] = useState({
    platform: "shopee",
    shop_id: "",
    shop_name: "",
    platform_fee_pct: 11,
    payment_fee_pct: 3,
    default_buffer_stock: 2,
  });

  // Mapping Dialog
  const [mapDialog, setMapDialog] = useState(false);
  const [mapForm, setMapForm] = useState({
    channel_id: "",
    channel_sku: "",
    san_pham_id: "",
    buffer_stock: 2,
    max_publish_qty: 0,
  });

  // Settle Payout Dialog
  const [settleChannel, setSettleChannel] = useState<EcommerceChannel | null>(null);
  const [settleForm, setSettleForm] = useState({
    gross_sales: 50000000,
    return_amount: 2000000,
    shop_voucher_cost: 1500000,
    shipping_subsidy: 500000,
    settlement_ref: "",
  });

  const loadData = async () => {
    setLoading(true);
    const res = await fetchEcommerceSyncOverviewAction();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || "Không thể tải dữ liệu đồng bộ TMĐT");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveChannel = async () => {
    if (!chForm.shop_id.trim() || !chForm.shop_name.trim()) {
      toast.error("Vui lòng nhập mã gian hàng và tên gian hàng");
      return;
    }
    const res = await upsertEcommerceChannelAction(chForm);
    if (res.success) {
      toast.success("Đã lưu kết nối gian hàng TMĐT");
      setChannelDialog(false);
      setChForm({ ...chForm, shop_id: "", shop_name: "" });
      loadData();
    } else toast.error(res.error);
  };

  const handleSaveMapping = async () => {
    if (!mapForm.channel_id || !mapForm.channel_sku.trim() || !mapForm.san_pham_id) {
      toast.error("Vui lòng chọn gian hàng, SKU sàn và sản phẩm nội bộ");
      return;
    }
    const res = await upsertEcommerceMappingAction(mapForm);
    if (res.success) {
      toast.success("Đã lưu ánh xạ SKU sàn ↔ Sản phẩm SME");
      setMapDialog(false);
      setMapForm({ ...mapForm, channel_sku: "" });
      loadData();
    } else toast.error(res.error);
  };

  const handleSettlePayout = async () => {
    if (!settleChannel) return;
    const res = await settleChannelPayoutAction(settleChannel._id, settleForm);
    if (res.success) {
      toast.success(
        `Đã quyết toán tiền sàn! Thực nhận: ${fmtVnd(res.data?.settlement?.net_payout || 0)} (đã tạo Phiếu Thu Sổ Quỹ)`
      );
      setSettleChannel(null);
      loadData();
    } else toast.error(res.error);
  };

  const channels = data?.channels || [];
  const mappings = data?.mappings || [];
  const logs = data?.logs || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconBrandShopee className="size-6 text-primary" />
            Đồng Bộ Sàn TMĐT & Cổng Tích Hợp (Omnichannel Hub)
          </h1>
          <p className="text-sm text-muted-foreground">
            Kết nối Shopee / TikTok Shop / Lazada, đồng bộ tồn kho an toàn (chống bán âm kho) và quyết toán tiền sàn trực tiếp về Sổ Quỹ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <IconRefresh className="size-4 mr-1.5" />
            Làm mới
          </Button>
          <Button variant="outline" onClick={() => setMapDialog(true)}>
            <IconLink className="size-4 mr-1.5" />
            Ánh Xạ SKU
          </Button>
          <Button onClick={() => setChannelDialog(true)}>
            <IconPlus className="size-4 mr-1.5" />
            Kết Nối Gian Hàng
          </Button>
        </div>
      </div>

      {/* Adapter Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IconPlugConnected className="size-4 text-primary" />
              Adapter Hóa Đơn Điện Tử (NĐ 123 / TT 78)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs flex items-center justify-between">
            <div>
              Provider: <b className="uppercase">{data?.adapters?.einvoice?.provider || "mock"}</b> · Mẫu số: <b>{data?.adapters?.einvoice?.series || "1C26TMM"}</b>
            </div>
            <Badge variant={data?.adapters?.einvoice?.configured_for_live ? "default" : "secondary"}>
              {data?.adapters?.einvoice?.configured_for_live ? "Live Ready" : "Mock Preview"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IconPlugConnected className="size-4 text-primary" />
              Adapter Hãng Vận Chuyển & COD Webhook
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs flex items-center justify-between">
            <div>
              Hãng mặc định: <b>{data?.adapters?.logistics?.default_carrier || "GHN"}</b> · Webhook: <code>/api/v1/shipping/webhook</code>
            </div>
            <Badge variant={data?.adapters?.logistics?.mode === "live" ? "default" : "secondary"}>
              {(data?.adapters?.logistics?.mode || "sandbox").toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Gian Hàng TMĐT ({channels.length})</TabsTrigger>
          <TabsTrigger value="mappings">Ánh Xạ SKU & Tồn Đệm ({mappings.length})</TabsTrigger>
          <TabsTrigger value="logs">Nhật Ký Đồng Bộ ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sàn TMĐT</TableHead>
                    <TableHead>Mã Shop / Tên gian hàng</TableHead>
                    <TableHead className="text-right">Phí sàn / TT</TableHead>
                    <TableHead className="text-right">Tồn đệm mặc định</TableHead>
                    <TableHead>Đồng bộ gần nhất</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell><Badge variant="outline" className="uppercase">{c.platform}</Badge></TableCell>
                      <TableCell>
                        <div className="font-medium">{c.shop_name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{c.shop_id}</div>
                      </TableCell>
                      <TableCell className="text-right text-xs">{c.platform_fee_pct}% + {c.payment_fee_pct}%</TableCell>
                      <TableCell className="text-right font-mono">{c.default_buffer_stock} SP</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.last_synced_at ? new Date(c.last_synced_at).toLocaleString("vi-VN") : "Chưa đồng bộ"}
                      </TableCell>
                      <TableCell className="text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={async () => {
                            const r = await syncChannelInventoryAction(c._id);
                            if (r.success) { toast.success(r.message || "Đồng bộ thành công"); loadData(); }
                            else toast.error(r.error);
                          }}
                        >
                          <IconRefresh className="size-3.5 mr-1" />
                          Đẩy tồn kho
                        </Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => setSettleChannel(c)}>
                          <IconCoin className="size-3.5 mr-1" />
                          Quyết toán
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && channels.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa kết nối gian hàng TMĐT nào.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU Sàn</TableHead>
                    <TableHead>Sản phẩm SME</TableHead>
                    <TableHead className="text-right">Tồn đệm (Buffer)</TableHead>
                    <TableHead className="text-right">Tồn vật lý</TableHead>
                    <TableHead className="text-right">Tồn đã đẩy lên sàn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell className="font-mono font-bold text-primary">{m.channel_sku}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{m.ten_sp}</div>
                        <div className="text-xs font-mono text-muted-foreground">{m.ma_sp}</div>
                      </TableCell>
                      <TableCell className="text-right">{m.buffer_stock}</TableCell>
                      <TableCell className="text-right">{m.last_physical_qty ?? "—"}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{m.last_pushed_qty ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && mappings.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có ánh xạ SKU nào.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nhật Ký Đồng Bộ Tồn Kho, Đơn Hàng & Quyết Toán</CardTitle>
              <CardDescription>30 sự kiện đồng bộ gần nhất trên tất cả các sàn.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Sàn / Shop</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Tóm tắt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l, idx) => (
                    <TableRow key={l._id || idx}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("vi-VN")}</TableCell>
                      <TableCell className="text-xs font-medium">{l.shop_name} ({l.platform})</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{l.action}</Badge></TableCell>
                      <TableCell className="text-xs">{l.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Thêm Gian Hàng */}
      <Dialog open={channelDialog} onOpenChange={setChannelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Kết Nối Gian Hàng TMĐT</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Sàn TMĐT</Label>
              <Select value={chForm.platform} onValueChange={(v) => setChForm({ ...chForm, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shopee">Shopee</SelectItem>
                  <SelectItem value="tiktok">TikTok Shop</SelectItem>
                  <SelectItem value="lazada">Lazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Mã Shop *</Label><Input placeholder="VD: SHP-001" value={chForm.shop_id} onChange={(e) => setChForm({ ...chForm, shop_id: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Tên Gian Hàng *</Label><Input placeholder="VD: Nội Thất SME Official" value={chForm.shop_name} onChange={(e) => setChForm({ ...chForm, shop_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5"><Label>Phí sàn (%)</Label><Input type="number" step="0.5" value={chForm.platform_fee_pct} onChange={(e) => setChForm({ ...chForm, platform_fee_pct: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Phí TT (%)</Label><Input type="number" step="0.5" value={chForm.payment_fee_pct} onChange={(e) => setChForm({ ...chForm, payment_fee_pct: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Tồn đệm</Label><Input type="number" value={chForm.default_buffer_stock} onChange={(e) => setChForm({ ...chForm, default_buffer_stock: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelDialog(false)}>Hủy</Button>
            <Button onClick={handleSaveChannel}>Lưu gian hàng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ánh Xạ SKU */}
      <Dialog open={mapDialog} onOpenChange={setMapDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ánh Xạ SKU Sàn ↔ Sản Phẩm Nội Bộ</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Gian hàng</Label>
              <Select value={mapForm.channel_id} onValueChange={(v) => setMapForm({ ...mapForm, channel_id: v })}>
                <SelectTrigger><SelectValue placeholder="Chọn gian hàng..." /></SelectTrigger>
                <SelectContent>
                  {channels.map((c) => <SelectItem key={c._id} value={c._id}>{c.shop_name} ({c.platform})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Mã SKU trên sàn *</Label><Input placeholder="VD: SHP-BAN-GO-1M2" value={mapForm.channel_sku} onChange={(e) => setMapForm({ ...mapForm, channel_sku: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-1.5">
              <Label>Sản phẩm SME tương ứng *</Label>
              <Select value={mapForm.san_pham_id} onValueChange={(v) => setMapForm({ ...mapForm, san_pham_id: v })}>
                <SelectTrigger><SelectValue placeholder="Chọn sản phẩm..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p._id} value={p._id}>{p.ma_sp} — {p.ten_sp} (Tồn: {p.so_luong ?? 0})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tồn kho đệm (Buffer)</Label><Input type="number" value={mapForm.buffer_stock} onChange={(e) => setMapForm({ ...mapForm, buffer_stock: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Giới hạn đẩy tối đa (0 = KGH)</Label><Input type="number" value={mapForm.max_publish_qty} onChange={(e) => setMapForm({ ...mapForm, max_publish_qty: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapDialog(false)}>Hủy</Button>
            <Button onClick={handleSaveMapping}>Lưu ánh xạ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Quyết Toán Tiền Sàn */}
      <Dialog open={!!settleChannel} onOpenChange={(o) => !o && setSettleChannel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quyết Toán Tiền Sàn — {settleChannel?.shop_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Tổng doanh số Gross (VNĐ)</Label><Input type="number" value={settleForm.gross_sales} onChange={(e) => setSettleForm({ ...settleForm, gross_sales: Number(e.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Đơn hoàn / Trả hàng</Label><Input type="number" value={settleForm.return_amount} onChange={(e) => setSettleForm({ ...settleForm, return_amount: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Voucher Shop trợ giá</Label><Input type="number" value={settleForm.shop_voucher_cost} onChange={(e) => setSettleForm({ ...settleForm, shop_voucher_cost: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Phí hỗ trợ vận chuyển</Label><Input type="number" value={settleForm.shipping_subsidy} onChange={(e) => setSettleForm({ ...settleForm, shipping_subsidy: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Mã kỳ quyết toán</Label><Input placeholder="VD: QT-T11-2026" value={settleForm.settlement_ref} onChange={(e) => setSettleForm({ ...settleForm, settlement_ref: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleChannel(null)}>Hủy</Button>
            <Button onClick={handleSettlePayout}>Xác nhận & Sinh Phiếu Thu Sổ Quỹ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
