"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconDiscount2,
  IconAward,
  IconPlus,
  IconTrash,
  IconSearch,
  IconRefresh,
} from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  fetchPromotionsAction,
  createPromotionAction,
  updatePromotionAction,
  deletePromotionAction,
  fetchLoyaltyMembersAction,
  type PromotionItem,
  type LoyaltyMemberItem,
} from "@/app/actions/promotions";

const fmtVnd = (n: number) => `${Math.round(n || 0).toLocaleString("vi-VN")} đ`;

export default function PromotionsPage() {
  const [promos, setPromos] = useState<PromotionItem[]>([]);
  const [members, setMembers] = useState<LoyaltyMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [memberQ, setMemberQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "percent" as "percent" | "fixed" | "freeship",
    value: 10,
    max_discount: 0,
    min_order_amount: 0,
    max_usage: 0,
    per_customer_limit: 0,
    end_date: "",
    description: "",
  });

  const loadAll = async () => {
    setLoading(true);
    const [pRes, mRes] = await Promise.all([
      fetchPromotionsAction({ q }),
      fetchLoyaltyMembersAction(memberQ),
    ]);
    if (pRes.success && pRes.items) setPromos(pRes.items);
    if (mRes.success && mRes.items) setMembers(mRes.items);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!form.code.trim()) {
      toast.error("Vui lòng nhập mã khuyến mãi");
      return;
    }
    setSubmitting(true);
    const res = await createPromotionAction({
      ...form,
      code: form.code.trim().toUpperCase(),
      end_date: form.end_date || null,
    });
    if (res.success) {
      toast.success(`Đã tạo mã khuyến mãi ${form.code.trim().toUpperCase()}`);
      setCreateOpen(false);
      setForm({
        code: "",
        name: "",
        type: "percent",
        value: 10,
        max_discount: 0,
        min_order_amount: 0,
        max_usage: 0,
        per_customer_limit: 0,
        end_date: "",
        description: "",
      });
      loadAll();
    } else {
      toast.error(res.error || "Tạo khuyến mãi thất bại");
    }
    setSubmitting(false);
  };

  const toggleActive = async (promo: PromotionItem) => {
    const res = await updatePromotionAction(promo._id, { is_active: !promo.is_active });
    if (res.success) {
      toast.success(promo.is_active ? `Đã tạm ngưng mã ${promo.code}` : `Đã kích hoạt lại mã ${promo.code}`);
      loadAll();
    } else {
      toast.error(res.error || "Không thể cập nhật trạng thái");
    }
  };

  const handleDelete = async (promo: PromotionItem) => {
    const res = await deletePromotionAction(promo._id);
    if (res.success) {
      toast.success(`Đã xóa mã ${promo.code}`);
      loadAll();
    } else {
      toast.error(res.error || "Xóa thất bại");
    }
  };

  const tierBadgeClass = (code: string) => {
    if (code === "platinum") return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
    if (code === "gold") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    if (code === "silver") return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Khuyến Mãi & Khách Hàng Thân Thiết (Loyalty)</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý chiến dịch mã giảm giá động cho POS / Đơn bán B2B và theo dõi hạng điểm tích lũy khách hàng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            <IconRefresh className="size-4 mr-1.5" />
            Làm mới
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <IconPlus className="size-4 mr-1.5" />
            Tạo Mã Khuyến Mãi
          </Button>
        </div>
      </div>

      <Tabs defaultValue="promotions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="promotions" className="gap-1.5">
            <IconDiscount2 className="size-4" />
            Chiến dịch Voucher ({promos.length})
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1.5">
            <IconAward className="size-4" />
            Thành viên Tích điểm ({members.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promotions">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Danh Sách Mã Ưu Đãi</CardTitle>
                  <CardDescription>Áp dụng đồng bộ cho quầy POS và Đơn Bán Hàng B2B.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-64">
                  <Input
                    placeholder="Tìm mã hoặc tên..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadAll()}
                  />
                  <Button size="icon" variant="outline" onClick={loadAll}>
                    <IconSearch className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã Voucher</TableHead>
                    <TableHead>Tên chương trình</TableHead>
                    <TableHead>Loại & Mức giảm</TableHead>
                    <TableHead>Đơn tối thiểu</TableHead>
                    <TableHead>Lượt dùng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="font-mono font-bold text-primary">{p.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                      </TableCell>
                      <TableCell>
                        {p.type === "percent" ? (
                          <span>
                            Giảm <b>{p.value}%</b>
                            {p.max_discount > 0 ? ` (tối đa ${fmtVnd(p.max_discount)})` : ""}
                          </span>
                        ) : p.type === "freeship" ? (
                          <span>Freeship {fmtVnd(p.value)}</span>
                        ) : (
                          <span>Giảm {fmtVnd(p.value)}</span>
                        )}
                      </TableCell>
                      <TableCell>{p.min_order_amount > 0 ? fmtVnd(p.min_order_amount) : "Không giới hạn"}</TableCell>
                      <TableCell>
                        {p.used_count} / {p.max_usage > 0 ? p.max_usage : "∞"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>
                          {p.is_active ? "Đang hoạt động" : "Tạm ngưng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1.5">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>
                          {p.is_active ? "Tạm ngưng" : "Kích hoạt"}
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p)}>
                          <IconTrash className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && promos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Chưa có chương trình khuyến mãi nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Bảng Xếp Hạng & Điểm Tích Lũy Khách Hàng</CardTitle>
                  <CardDescription>Tự động tích điểm sau mỗi giao dịch hoàn tất và quy đổi trực tiếp tại POS.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-64">
                  <Input
                    placeholder="Tìm tên hoặc SĐT..."
                    value={memberQ}
                    onChange={(e) => setMemberQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadAll()}
                  />
                  <Button size="icon" variant="outline" onClick={loadAll}>
                    <IconSearch className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã KH</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead>Hạng thành viên</TableHead>
                    <TableHead className="text-right">Điểm khả dụng</TableHead>
                    <TableHead className="text-right">Tổng điểm tích lũy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell className="font-mono text-xs">{m.ma_doi_tac}</TableCell>
                      <TableCell className="font-medium">{m.ten}</TableCell>
                      <TableCell>{m.so_dien_thoai || "—"}</TableCell>
                      <TableCell>
                        <Badge className={tierBadgeClass(m.tier.code)} variant="outline">
                          {m.tier.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {m.loyalty_points.toLocaleString("vi-VN")} điểm
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {m.lifetime_points.toLocaleString("vi-VN")} điểm
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Chưa có dữ liệu khách hàng.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog tạo mã khuyến mãi mới */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo Chương Trình Khuyến Mãi Mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mã Voucher *</Label>
                <Input
                  placeholder="VD: TET2026"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Loại ưu đãi</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as "percent" | "fixed" | "freeship" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Giảm theo %</SelectItem>
                    <SelectItem value="fixed">Giảm tiền cố định</SelectItem>
                    <SelectItem value="freeship">Hỗ trợ vận chuyển</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tên chiến dịch</Label>
              <Input
                placeholder="VD: Khuyến mãi tri ân khách hàng"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{form.type === "percent" ? "Mức giảm (%)" : "Số tiền giảm (VNĐ)"}</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giảm tối đa (VNĐ, 0 = KGH)</Label>
                <Input
                  type="number"
                  value={form.max_discount}
                  onChange={(e) => setForm({ ...form, max_discount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Đơn tối thiểu</Label>
                <Input
                  type="number"
                  value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tổng lượt dùng</Label>
                <Input
                  type="number"
                  value={form.max_usage}
                  onChange={(e) => setForm({ ...form, max_usage: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ngày hết hạn</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả hiển thị khi áp mã</Label>
              <Input
                placeholder="VD: Giảm 10% tối đa 500.000đ cho đơn từ 2 triệu"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Đang tạo..." : "Lưu mã khuyến mãi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
