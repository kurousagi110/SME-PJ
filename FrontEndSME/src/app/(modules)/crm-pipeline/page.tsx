"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconBriefcase,
  IconPlus,
  IconRefresh,
  IconFileInvoice,
  IconMessagePlus,
  IconPhone,
} from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  fetchCrmPipelineAction,
  createCrmOpportunityAction,
  updateCrmStageAction,
  addCrmActivityAction,
  convertCrmToQuotationAction,
  type CrmOpportunity,
  type CrmPipelineMetrics,
} from "@/app/actions/crm-pipeline";

const STAGES = [
  { code: "lead", label: "Tiềm năng (Lead)", color: "border-t-slate-400" },
  { code: "qualified", label: "Đủ điều kiện", color: "border-t-blue-500" },
  { code: "proposal", label: "Đã gửi Báo giá", color: "border-t-indigo-500" },
  { code: "negotiation", label: "Đàm phán", color: "border-t-amber-500" },
  { code: "won", label: "Chốt thắng (Won)", color: "border-t-emerald-500" },
  { code: "lost", label: "Thất bại (Lost)", color: "border-t-rose-500" },
] as const;

const fmtVnd = (n: number) => `${Math.round(n || 0).toLocaleString("vi-VN")} đ`;

export default function CrmPipelinePage() {
  const [items, setItems] = useState<CrmOpportunity[]>([]);
  const [metrics, setMetrics] = useState<CrmPipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Create Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    source: "Facebook / Web",
    expected_value: 25000000,
    next_follow_up: "",
    notes: "",
  });

  // Activity Drawer / Dialog
  const [selectedOpp, setSelectedOpp] = useState<CrmOpportunity | null>(null);
  const [actType, setActType] = useState("call");
  const [actContent, setActContent] = useState("");
  const [actNextDate, setActNextDate] = useState("");

  const loadData = async () => {
    setLoading(true);
    const res = await fetchCrmPipelineAction(q);
    if (res.success) {
      setItems(res.items || []);
      setMetrics(res.metrics || null);
    } else {
      toast.error(res.error || "Không thể tải phễu cơ hội");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.customer_name.trim()) {
      toast.error("Vui lòng nhập tên cơ hội và tên khách hàng");
      return;
    }
    const res = await createCrmOpportunityAction({
      ...form,
      next_follow_up: form.next_follow_up || undefined,
    });
    if (res.success) {
      toast.success("Đã tạo cơ hội bán hàng mới");
      setCreateOpen(false);
      setForm({
        title: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        source: "Facebook / Web",
        expected_value: 25000000,
        next_follow_up: "",
        notes: "",
      });
      loadData();
    } else {
      toast.error(res.error || "Tạo cơ hội thất bại");
    }
  };

  const handleMoveStage = async (id: string, stage: string) => {
    const res = await updateCrmStageAction(id, stage);
    if (res.success) {
      toast.success(`Đã chuyển cơ hội sang giai đoạn "${stage}"`);
      loadData();
    } else {
      toast.error(res.error || "Cập nhật giai đoạn thất bại");
    }
  };

  const handleConvertQuotation = async (opp: CrmOpportunity) => {
    const res = await convertCrmToQuotationAction(opp._id);
    if (res.success) {
      toast.success(`Đã tạo Báo giá B2B ${res.quotationCode || ""} từ cơ hội ${opp.ma_co_hoi}`);
      loadData();
    } else {
      toast.error(res.error || "Chuyển sang báo giá thất bại");
    }
  };

  const handleAddActivity = async () => {
    if (!selectedOpp || !actContent.trim()) return;
    const res = await addCrmActivityAction(selectedOpp._id, {
      type: actType,
      content: actContent,
      next_follow_up: actNextDate || null,
    });
    if (res.success) {
      toast.success("Đã lưu nhật ký chăm sóc");
      setActContent("");
      setActNextDate("");
      setSelectedOpp(null);
      loadData();
    } else {
      toast.error(res.error || "Lưu nhật ký thất bại");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconBriefcase className="size-6 text-primary" />
            Phễu Cơ Hội Bán Hàng (CRM Sales Pipeline)
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý Kanban từ Lead đến Chốt đơn, dự báo doanh số có trọng số (Weighted Forecast) và chuyển 1-click sang Báo giá B2B.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm cơ hội / khách hàng..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadData()}
            className="w-52 h-9 text-xs"
          />
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <IconRefresh className="size-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <IconPlus className="size-4 mr-1.5" />
            Thêm Cơ Hội
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Giá Trị Phễu Đang Mở</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtVnd(metrics?.open_pipeline_value || 0)}</div>
            <p className="text-xs text-muted-foreground">{metrics?.total_opportunities || 0} cơ hội tổng cộng</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Dự Báo Có Trọng Số (Forecast)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{fmtVnd(metrics?.weighted_forecast_value || 0)}</div>
            <p className="text-xs text-muted-foreground">Tính theo xác suất chốt từng giai đoạn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Đã Chốt Thắng (Won)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{fmtVnd(metrics?.won_value || 0)}</div>
            <p className="text-xs text-muted-foreground">Tỷ lệ chốt thắng: <b>{metrics?.win_rate_pct || 0}%</b></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Nhắc Chăm Sóc Quá Hạn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics?.overdue_follow_ups || 0}</div>
            <p className="text-xs text-muted-foreground">Cơ hội cần gọi lại ngay</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
        {STAGES.map((st) => {
          const colItems = items.filter((i) => i.stage === st.code);
          const colTotal = colItems.reduce((s, i) => s + (i.expected_value || 0), 0);
          return (
            <div key={st.code} className={`rounded-lg border border-t-4 ${st.color} bg-muted/20 p-2.5 flex flex-col gap-2 min-h-[380px]`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{st.label}</span>
                <Badge variant="secondary" className="text-[10px]">{colItems.length}</Badge>
              </div>
              <div className="text-[11px] font-medium text-muted-foreground pb-1 border-b">
                {fmtVnd(colTotal)}
              </div>

              <div className="space-y-2 flex-1">
                {colItems.map((opp) => (
                  <Card key={opp._id} className="p-2.5 space-y-2 shadow-xs">
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-xs font-semibold leading-snug">{opp.title}</div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{opp.probability}%</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <div>👤 {opp.customer_name}</div>
                      {opp.customer_phone && <div className="flex items-center gap-1"><IconPhone className="size-3" /> {opp.customer_phone}</div>}
                    </div>
                    <div className="text-xs font-bold text-primary">{fmtVnd(opp.expected_value)}</div>
                    {opp.quotation_code && (
                      <Badge variant="secondary" className="text-[10px] font-mono">BG: {opp.quotation_code}</Badge>
                    )}

                    <div className="pt-1 border-t space-y-1.5">
                      <Select value={opp.stage} onValueChange={(v) => handleMoveStage(opp._id, v)}>
                        <SelectTrigger className="h-7 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.code} value={s.code} className="text-xs">{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1 px-1.5" onClick={() => setSelectedOpp(opp)}>
                          <IconMessagePlus className="size-3 mr-1" />
                          Nhật ký ({opp.activities?.length || 0})
                        </Button>
                        {!opp.quotation_code && opp.stage !== "lost" && (
                          <Button size="sm" variant="default" className="h-6 text-[10px] px-1.5" onClick={() => handleConvertQuotation(opp)} title="Chuyển sang Báo giá B2B">
                            <IconFileInvoice className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Opportunity Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo Cơ Hội Bán Hàng Mới</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Tên cơ hội / Dự án *</Label>
              <Input placeholder="VD: Cung cấp nội thất văn phòng 50 bộ" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tên khách hàng *</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Số điện thoại</Label>
                <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Giá trị dự kiến (VNĐ)</Label>
                <Input type="number" value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Ngày hẹn gọi lại</Label>
                <Input type="date" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú ban đầu</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate}>Lưu cơ hội</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={!!selectedOpp} onOpenChange={(o) => !o && setSelectedOpp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nhật Ký Chăm Sóc — {selectedOpp?.ma_co_hoi}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="max-h-48 overflow-auto space-y-2 border rounded-md p-2.5 bg-muted/20 text-xs">
              {(selectedOpp?.activities || []).slice().reverse().map((a) => (
                <div key={a.id} className="border-b last:border-0 pb-1.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground">{a.by} ({a.type})</span>
                    <span>{new Date(a.at).toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="mt-0.5">{a.content}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={actType} onValueChange={setActType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Gọi điện tư vấn</SelectItem>
                  <SelectItem value="meeting">Gặp mặt / Khảo sát</SelectItem>
                  <SelectItem value="email">Gửi email / Zalo</SelectItem>
                  <SelectItem value="note">Ghi chú nội bộ</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" className="h-8 text-xs" value={actNextDate} onChange={(e) => setActNextDate(e.target.value)} />
            </div>
            <Textarea rows={2} placeholder="Nội dung trao đổi với khách hàng..." value={actContent} onChange={(e) => setActContent(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOpp(null)}>Đóng</Button>
            <Button onClick={handleAddActivity}>Thêm nhật ký</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
