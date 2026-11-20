"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, CalendarClock, CheckCircle2, AlertTriangle, PackageSearch } from "lucide-react";
import {
  fetchSupplierScorecardsAction,
  checkAtpAction,
  fetchForecastAction,
  type SupplierScorecardItem,
  type AtpCheckResult,
} from "@/app/actions/planning";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const toVND = (v: number) => `${Number(v || 0).toLocaleString("vi-VN")} đ`;

function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const color =
    grade === "S"
      ? "bg-purple-600 text-white"
      : grade === "A"
      ? "bg-emerald-600 text-white"
      : grade === "B"
      ? "bg-blue-600 text-white"
      : "bg-slate-500 text-white";
  return (
    <Badge className={`${color} text-xs font-semibold`}>
      Hạng {grade} ({score}đ)
    </Badge>
  );
}

export function SupplierAndAtpTab() {
  const { data: scorecardRes, isLoading: loadingScore } = useQuery({
    queryKey: ["supplier-scorecard"],
    queryFn: () => fetchSupplierScorecardsAction(),
  });
  const { data: forecastRes } = useQuery({
    queryKey: ["planning-forecast-products"],
    queryFn: () => fetchForecastAction(3),
  });

  const scorecards = (scorecardRes?.items ?? []) as SupplierScorecardItem[];
  const products = forecastRes?.items ?? [];

  const [selectedSpId, setSelectedSpId] = React.useState("");
  const [qty, setQty] = React.useState("10");
  const [atpLoading, setAtpLoading] = React.useState(false);
  const [atpResult, setAtpResult] = React.useState<AtpCheckResult | null>(null);
  const [atpError, setAtpError] = React.useState<string | null>(null);

  const handleCheckAtp = async () => {
    if (!selectedSpId) return;
    setAtpError(null);
    setAtpLoading(true);
    try {
      const sp = products.find((p) => p.san_pham_id === selectedSpId);
      const res = await checkAtpAction([
        { san_pham_id: selectedSpId, ten_sp: sp?.ten_sp, so_luong: Math.max(1, Number(qty) || 1) },
      ]);
      if (!res.success || !res.data) {
        setAtpError(res.error || "Không thể kiểm tra ATP");
      } else {
        setAtpResult(res.data);
      }
    } finally {
      setAtpLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ATP Estimator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Ước Tính Khả Năng Đáp Ứng & Lịch Giao Dự Kiến (ATP)
          </CardTitle>
          <CardDescription>
            Kiểm tra tồn kho thành phẩm, định mức BOM nguyên vật liệu và hàng đợi sản xuất để báo ngày giao chính xác cho khách hàng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium">Chọn sản phẩm</label>
              <Select value={selectedSpId} onValueChange={setSelectedSpId}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Chọn sản phẩm kiểm tra --" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.san_pham_id} value={p.san_pham_id}>
                      {p.ma_sp} — {p.ten_sp} (Tồn: {p.ton_kho})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-32 space-y-1">
              <label className="text-xs font-medium">Số lượng đặt</label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <Button onClick={handleCheckAtp} disabled={!selectedSpId || atpLoading} className="gap-1.5">
              <PackageSearch className="h-4 w-4" />
              {atpLoading ? "Đang tính..." : "Kiểm tra ATP"}
            </Button>
          </div>

          {atpError && <p className="text-sm text-red-500">{atpError}</p>}

          {atpResult && (
            <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {atpResult.canFulfillImmediately ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  Ngày giao hàng dự kiến:{" "}
                  <span className="text-blue-600">{atpResult.estimatedDeliveryDate}</span>{" "}
                  ({atpResult.estimatedDays} ngày)
                </div>
                <Badge variant="outline">
                  Lệnh SX đang chạy: {atpResult.activeProductionQueue}
                </Badge>
              </div>

              {atpResult.items.map((it) => (
                <div key={it.san_pham_id} className="text-xs border-t pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>
                      <strong>{it.ten_sp}</strong> — Yêu cầu: {it.yeu_cau} | Tồn kho: {it.ton_kho} | Cần sản xuất: {it.can_san_xuat}
                    </span>
                    <Badge variant="secondary">{it.so_ngay_du_kien} ngày</Badge>
                  </div>
                  {it.nvl_thieu.length > 0 && (
                    <div className="text-amber-700 bg-amber-50 p-2 rounded">
                      NVL thiếu cần nhập thêm:{" "}
                      {it.nvl_thieu.map((n) => `${n.ten_nl} (thiếu ${n.thieu})`).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Scorecard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Bảng Chấm Điểm Nhà Cung Cấp (Supplier Scorecard)
          </CardTitle>
          <CardDescription>
            Tự động xếp hạng nhà cung cấp theo tỷ lệ hoàn thành đơn, giao hàng đúng hạn và lịch sử giao dịch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingScore ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nhà cung cấp</TableHead>
                    <TableHead className="text-right">Tổng đơn</TableHead>
                    <TableHead className="text-right">Hoàn thành</TableHead>
                    <TableHead className="text-right">Tỷ lệ hoàn tất</TableHead>
                    <TableHead className="text-right">Đúng hạn</TableHead>
                    <TableHead className="text-right">Tổng giá trị mua</TableHead>
                    <TableHead className="text-center">Xếp hạng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scorecards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        Chưa có dữ liệu nhà cung cấp
                      </TableCell>
                    </TableRow>
                  ) : (
                    scorecards.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell>
                          <div className="font-medium text-sm">{s.ten_doi_tac}</div>
                          <div className="text-xs text-muted-foreground">{s.ma_doi_tac || s.so_dien_thoai || "—"}</div>
                        </TableCell>
                        <TableCell className="text-right">{s.totalOrders}</TableCell>
                        <TableCell className="text-right">{s.completedOrders}</TableCell>
                        <TableCell className="text-right">{s.completionRate}%</TableCell>
                        <TableCell className="text-right">{s.onTimeRate}%</TableCell>
                        <TableCell className="text-right font-medium">{toVND(s.totalSpend)}</TableCell>
                        <TableCell className="text-center">
                          <GradeBadge grade={s.grade} score={s.score} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
