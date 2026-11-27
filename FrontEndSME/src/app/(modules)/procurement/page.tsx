"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconClipboardCheck,
  IconScale,
  IconTrophy,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
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
import {
  fetchPurchaseRequestsAction,
  createPurchaseRequestAction,
  decidePurchaseRequestAction,
  fetchRfqsAction,
  createRfqFromPrAction,
  submitVendorQuoteAction,
  awardRfqAction,
  fetchVendorScorecardAction,
  runThreeWayMatchAction,
  type PurchaseRequestItem,
  type RfqItem,
  type VendorScoreRow,
  type ThreeWayMatchResult,
} from "@/app/actions/procurement";

const fmtVnd = (n: number) => `${Math.round(n || 0).toLocaleString("vi-VN")} đ`;

export default function ProcurementPage() {
  const [prs, setPrs] = useState<PurchaseRequestItem[]>([]);
  const [rfqs, setRfqs] = useState<RfqItem[]>([]);
  const [scorecard, setScorecard] = useState<VendorScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create PR Dialog
  const [prOpen, setPrOpen] = useState(false);
  const [prForm, setPrForm] = useState({
    title: "",
    department: "Phòng sản xuất",
    priority: "normal",
    item_name: "",
    quantity: 10,
    unit: "tấm",
    estimated_price: 450000,
    reason: "",
  });

  // Add Quote Dialog
  const [quoteRfq, setQuoteRfq] = useState<RfqItem | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    vendor_name: "",
    total_price: 4000000,
    lead_time_days: 3,
    payment_terms_days: 30,
    notes: "",
  });

  // 3-Way Match Calculator
  const [matchInput, setMatchInput] = useState({
    po_qty: 100,
    po_unit_price: 50000,
    received_qty: 100,
    invoiced_qty: 100,
    invoiced_unit_price: 50000,
    price_tolerance_pct: 2,
  });
  const [matchResult, setMatchResult] = useState<ThreeWayMatchResult | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [prRes, rfqRes, scRes] = await Promise.all([
      fetchPurchaseRequestsAction(),
      fetchRfqsAction(),
      fetchVendorScorecardAction(),
    ]);
    if (prRes.success && prRes.items) setPrs(prRes.items);
    if (rfqRes.success && rfqRes.items) setRfqs(rfqRes.items);
    if (scRes.success && scRes.items) setScorecard(scRes.items);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreatePR = async () => {
    if (!prForm.title.trim() || !prForm.item_name.trim()) {
      toast.error("Vui lòng nhập tiêu đề đề xuất và tên vật tư");
      return;
    }
    const res = await createPurchaseRequestAction({
      title: prForm.title,
      department: prForm.department,
      priority: prForm.priority,
      reason: prForm.reason,
      items: [
        {
          item_name: prForm.item_name,
          quantity: prForm.quantity,
          unit: prForm.unit,
          estimated_price: prForm.estimated_price,
        },
      ],
    });
    if (res.success) {
      toast.success(`Đã tạo đề xuất mua hàng ${res.data?.ma_pr || ""}`);
      setPrOpen(false);
      setPrForm({ ...prForm, title: "", item_name: "", reason: "" });
      loadAll();
    } else {
      toast.error(res.error || "Tạo PR thất bại");
    }
  };

  const handleSubmitQuote = async () => {
    if (!quoteRfq || !quoteForm.vendor_name.trim()) {
      toast.error("Vui lòng nhập tên nhà cung cấp");
      return;
    }
    const res = await submitVendorQuoteAction(quoteRfq._id, quoteForm);
    if (res.success) {
      toast.success("Đã cập nhật báo giá nhà cung cấp vào ma trận so sánh");
      setQuoteRfq(null);
      loadAll();
    } else {
      toast.error(res.error || "Thêm báo giá thất bại");
    }
  };

  const handleRunThreeWay = async () => {
    const res = await runThreeWayMatchAction(matchInput);
    if (res.success && res.data) {
      setMatchResult(res.data);
    } else {
      toast.error(res.error || "Đối soát thất bại");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mua Hàng Nâng Cao (PR → RFQ → Vendor Scorecard)</h1>
          <p className="text-sm text-muted-foreground">
            Quy trình mua hàng khép kín: Đề xuất mua (PR) → So sánh báo giá nhiều NCC (RFQ) → 1-Click tạo PO → Chấm điểm NCC & Đối soát 3 chiều.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            <IconRefresh className="size-4 mr-1.5" />
            Làm mới
          </Button>
          <Button onClick={() => setPrOpen(true)}>
            <IconPlus className="size-4 mr-1.5" />
            Tạo Đề Xuất Mua (PR)
          </Button>
        </div>
      </div>

      <Tabs defaultValue="prs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prs" className="gap-1.5">
            <IconClipboardCheck className="size-4" />
            Đề Xuất Mua Hàng PR ({prs.length})
          </TabsTrigger>
          <TabsTrigger value="rfqs" className="gap-1.5">
            <IconScale className="size-4" />
            Ma Trận Báo Giá RFQ ({rfqs.length})
          </TabsTrigger>
          <TabsTrigger value="scorecard" className="gap-1.5">
            <IconTrophy className="size-4" />
            Bảng Điểm NCC & Đối Soát 3 Chiều
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PR */}
        <TabsContent value="prs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Danh Sách Đề Xuất Mua Hàng (Purchase Requests)</CardTitle>
              <CardDescription>Sau khi PR được duyệt, bấm &quot;Mở RFQ&quot; để gọi báo giá cạnh tranh từ nhiều nhà cung cấp.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã PR</TableHead>
                    <TableHead>Tiêu đề / Phòng ban</TableHead>
                    <TableHead>Vật tư yêu cầu</TableHead>
                    <TableHead className="text-right">Dự toán</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prs.map((pr) => (
                    <TableRow key={pr._id}>
                      <TableCell className="font-mono text-xs font-bold">{pr.ma_pr}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{pr.title}</div>
                        <div className="text-xs text-muted-foreground">{pr.department} · {pr.created_by?.ho_ten}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {pr.items.map((it, idx) => (
                          <div key={idx}>{it.item_name} × <b>{it.quantity}</b> {it.unit}</div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtVnd(pr.estimated_budget)}</TableCell>
                      <TableCell>
                        <Badge variant={pr.trang_thai === "approved" || pr.trang_thai === "rfq_created" ? "default" : pr.trang_thai === "rejected" ? "destructive" : "secondary"}>
                          {pr.trang_thai}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {pr.trang_thai === "pending" && (
                          <>
                            <Button size="icon" variant="outline" className="h-7 w-7 text-emerald-600" onClick={async () => {
                              const r = await decidePurchaseRequestAction(pr._id, "approve");
                              if (r.success) { toast.success("Đã duyệt PR"); loadAll(); } else toast.error(r.error);
                            }}>
                              <IconCheck className="size-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-7 w-7 text-destructive" onClick={async () => {
                              const r = await decidePurchaseRequestAction(pr._id, "reject");
                              if (r.success) { toast.success("Đã từ chối PR"); loadAll(); } else toast.error(r.error);
                            }}>
                              <IconX className="size-4" />
                            </Button>
                          </>
                        )}
                        {pr.trang_thai === "approved" && (
                          <Button size="sm" className="h-7 text-xs" onClick={async () => {
                            const r = await createRfqFromPrAction(pr._id);
                            if (r.success) { toast.success(`Đã tạo RFQ ${r.data?.ma_rfq}`); loadAll(); } else toast.error(r.error);
                          }}>
                            Mở RFQ
                          </Button>
                        )}
                        {pr.rfq_code && <Badge variant="outline" className="font-mono text-[10px]">{pr.rfq_code}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && prs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có đề xuất mua hàng nào.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: RFQ MATRIX */}
        <TabsContent value="rfqs" className="space-y-4">
          {rfqs.map((rfq) => (
            <Card key={rfq._id}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="font-mono text-primary">{rfq.ma_rfq}</span>
                    <span>— {rfq.title}</span>
                    <Badge variant={rfq.trang_thai === "awarded" ? "default" : "secondary"}>{rfq.trang_thai}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {rfq.po_code ? `Đã trúng thầu: ${rfq.awarded_vendor} → Sinh PO: ${rfq.po_code}` : "Nhập báo giá từ nhiều NCC để hệ thống tự động chấm điểm & đề xuất chọn thầu tối ưu."}
                  </CardDescription>
                </div>
                {rfq.trang_thai === "open" && (
                  <Button size="sm" variant="outline" onClick={() => setQuoteRfq(rfq)}>
                    <IconPlus className="size-4 mr-1" />
                    Nhập báo giá NCC
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hạng</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead className="text-right">Tổng giá chào</TableHead>
                      <TableHead className="text-right">Giao hàng</TableHead>
                      <TableHead className="text-right">Hạn TT</TableHead>
                      <TableHead className="text-right">Điểm tổng hợp</TableHead>
                      <TableHead className="text-right">Chọn thầu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rfq.ranked_quotes || []).map((q) => (
                      <TableRow key={q.quote_id}>
                        <TableCell>
                          <Badge variant={q.is_recommended ? "default" : "outline"}>#{q.rank}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {q.vendor_name}
                          {q.is_recommended && <Badge className="ml-2 text-[10px]" variant="secondary">Đề xuất</Badge>}
                          {q.is_lowest_price && <Badge className="ml-1 text-[10px]" variant="outline">Giá tốt nhất</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-bold">{fmtVnd(q.total_price)}</TableCell>
                        <TableCell className="text-right">{q.lead_time_days} ngày</TableCell>
                        <TableCell className="text-right">{q.payment_terms_days} ngày</TableCell>
                        <TableCell className="text-right font-bold text-primary">{q.composite_score} / 100</TableCell>
                        <TableCell className="text-right">
                          {rfq.trang_thai === "open" ? (
                            <Button size="sm" className="h-7 text-xs" onClick={async () => {
                              const res = await awardRfqAction(rfq._id, q.vendor_name);
                              if (res.success) {
                                toast.success(`Đã chọn ${q.vendor_name} & sinh PO ${res.poCode}`);
                                loadAll();
                              } else toast.error(res.error);
                            }}>
                              Chọn & Tạo PO
                            </Button>
                          ) : rfq.awarded_vendor === q.vendor_name ? (
                            <Badge>Trúng thầu</Badge>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(rfq.ranked_quotes || []).length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Chưa có nhà cung cấp nào gửi báo giá cho RFQ này.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
          {!loading && rfqs.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Chưa có yêu cầu báo giá (RFQ) nào.</Card>
          )}
        </TabsContent>

        {/* TAB 3: VENDOR SCORECARD & 3-WAY MATCH */}
        <TabsContent value="scorecard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bảng Xếp Hạng Nhà Cung Cấp (Vendor Scorecard)</CardTitle>
                <CardDescription>Tự động tổng hợp từ lịch sử đơn nhập mua hàng trong hệ thống.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead className="text-right">Số PO</TableHead>
                      <TableHead className="text-right">Đúng hạn</TableHead>
                      <TableHead className="text-right">Điểm / Hạng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scorecard.map((v, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{v.vendor_name}</TableCell>
                        <TableCell className="text-right">{v.completed_orders}/{v.total_orders}</TableCell>
                        <TableCell className="text-right">{v.on_time_rate}%</TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold mr-1.5">{v.score}</span>
                          <Badge variant={v.grade === "A" ? "default" : "secondary"}>Hạng {v.grade}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {scorecard.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Chưa có dữ liệu đơn mua hàng.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kiểm Tra Đối Soát 3 Chiều (3-Way Matching)</CardTitle>
                <CardDescription>So khớp PO ↔ Phiếu Nhập Kho (GRN) ↔ Hóa Đơn Nhà Cung Cấp trước khi duyệt chi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">SL trên PO</Label><Input type="number" value={matchInput.po_qty} onChange={(e) => setMatchInput({ ...matchInput, po_qty: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Đơn giá PO (VNĐ)</Label><Input type="number" value={matchInput.po_unit_price} onChange={(e) => setMatchInput({ ...matchInput, po_unit_price: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><Label className="text-xs">SL Thực nhập kho (GRN)</Label><Input type="number" value={matchInput.received_qty} onChange={(e) => setMatchInput({ ...matchInput, received_qty: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><Label className="text-xs">SL trên Hóa đơn NCC</Label><Input type="number" value={matchInput.invoiced_qty} onChange={(e) => setMatchInput({ ...matchInput, invoiced_qty: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Đơn giá Hóa đơn NCC</Label><Input type="number" value={matchInput.invoiced_unit_price} onChange={(e) => setMatchInput({ ...matchInput, invoiced_unit_price: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Ngưỡng lệch giá (%)</Label><Input type="number" value={matchInput.price_tolerance_pct} onChange={(e) => setMatchInput({ ...matchInput, price_tolerance_pct: Number(e.target.value) })} /></div>
                </div>
                <Button className="w-full" onClick={handleRunThreeWay}>Chạy Đối Soát 3 Chiều</Button>
                {matchResult && (
                  <div className={`p-3 rounded-lg border text-xs space-y-1 ${matchResult.approved_for_payment ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : "border-rose-300 bg-rose-50 dark:bg-rose-950/30"}`}>
                    <div className="font-bold">{matchResult.status} — {matchResult.message}</div>
                    <div>PO: {fmtVnd(matchResult.po_total)} · Nhập kho: {fmtVnd(matchResult.received_total)} · Hóa đơn: {fmtVnd(matchResult.invoiced_total)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Tạo PR */}
      <Dialog open={prOpen} onOpenChange={setPrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo Đề Xuất Mua Hàng (PR)</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Tiêu đề đề xuất *</Label><Input placeholder="VD: Mua gỗ MDF phục vụ đơn tháng 12" value={prForm.title} onChange={(e) => setPrForm({ ...prForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Phòng ban</Label><Input value={prForm.department} onChange={(e) => setPrForm({ ...prForm, department: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Mức độ ưu tiên</Label>
                <Select value={prForm.priority} onValueChange={(v) => setPrForm({ ...prForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Bình thường</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                    <SelectItem value="urgent">Khẩn cấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Tên vật tư / hàng hóa *</Label><Input placeholder="VD: Gỗ MDF chống ẩm 17mm" value={prForm.item_name} onChange={(e) => setPrForm({ ...prForm, item_name: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5"><Label>Số lượng</Label><Input type="number" value={prForm.quantity} onChange={(e) => setPrForm({ ...prForm, quantity: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Đơn vị</Label><Input value={prForm.unit} onChange={(e) => setPrForm({ ...prForm, unit: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Giá dự toán</Label><Input type="number" value={prForm.estimated_price} onChange={(e) => setPrForm({ ...prForm, estimated_price: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrOpen(false)}>Hủy</Button>
            <Button onClick={handleCreatePR}>Gửi duyệt PR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Thêm báo giá NCC vào RFQ */}
      <Dialog open={!!quoteRfq} onOpenChange={(o) => !o && setQuoteRfq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nhập Báo Giá NCC — {quoteRfq?.ma_rfq}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Tên nhà cung cấp *</Label><Input placeholder="VD: Công ty Gỗ An Cường" value={quoteForm.vendor_name} onChange={(e) => setQuoteForm({ ...quoteForm, vendor_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Tổng giá chào (VNĐ) *</Label><Input type="number" value={quoteForm.total_price} onChange={(e) => setQuoteForm({ ...quoteForm, total_price: Number(e.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Thời gian giao (ngày)</Label><Input type="number" value={quoteForm.lead_time_days} onChange={(e) => setQuoteForm({ ...quoteForm, lead_time_days: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Hạn công nợ (ngày)</Label><Input type="number" value={quoteForm.payment_terms_days} onChange={(e) => setQuoteForm({ ...quoteForm, payment_terms_days: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteRfq(null)}>Hủy</Button>
            <Button onClick={handleSubmitQuote}>Lưu báo giá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
