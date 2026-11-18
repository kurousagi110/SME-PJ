"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileCheck,
  Wallet,
  AlertTriangle,
  Package,
  Factory,
  Receipt,
  Store,
  FileText,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyProfile } from "@/hooks/use-account";
import { isAdminOrDirector, hasPermission } from "@/lib/permissions";
import { fetchPendingApprovalsAction } from "@/app/actions/approval";
import { fetchCashFlowForecastAction } from "@/app/actions/financial";
import { fetchAlertsAction } from "@/app/actions/planning";
import { formatVND } from "@/utils/format";

type PersonaMode = "executive" | "sales" | "operations";

export function RoleAdaptiveWidget() {
  const { data: profile } = useMyProfile();

  const persona: PersonaMode = React.useMemo(() => {
    if (!profile) return "executive";
    const isDirector = isAdminOrDirector(profile);
    const isFinance = hasPermission(profile, ["finance.view", "finance.manage", "cashbook.close_period"]);
    if (isDirector || isFinance) return "executive";

    const isOps = hasPermission(profile, ["warehouse.view", "production.view", "production.manage"]);
    if (isOps) return "operations";

    return "sales";
  }, [profile]);

  const { data: approvals } = useQuery({
    queryKey: ["role-widget-approvals"],
    queryFn: async () => (await fetchPendingApprovalsAction()).data,
    enabled: persona === "executive",
    staleTime: 30_000,
  });

  const { data: cashflow } = useQuery({
    queryKey: ["role-widget-cashflow"],
    queryFn: async () => (await fetchCashFlowForecastAction()).data,
    enabled: persona === "executive",
    staleTime: 60_000,
  });

  const { data: alerts } = useQuery({
    queryKey: ["role-widget-alerts"],
    queryFn: async () => await fetchAlertsAction(),
    enabled: persona === "operations" || persona === "executive",
    staleTime: 60_000,
  });

  // Tổng số mặt hàng dưới ngưỡng an toàn = thành phẩm + nguyên vật liệu
  const lowStockCount =
    (alerts?.data?.low_stock_sp?.length ?? 0) + (alerts?.data?.low_stock_nl?.length ?? 0);

  if (!profile) return null;

  const personaTitle =
    persona === "executive"
      ? "Góc Nhìn Điều Hành & Tài Chính"
      : persona === "operations"
      ? "Góc Nhìn Kho Vận & Sản Xuất"
      : "Góc Nhìn Kinh Doanh & Bán Hàng";

  const show2faBanner =
    persona === "executive" && !(profile as any)?.two_factor_enabled;

  return (
    <div className="space-y-2.5">
      {show2faBanner && (
        <Link
          href="/account"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 hover:bg-amber-500/15 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-amber-600 shrink-0" />
            <span>
              <strong>Khuyến nghị bảo mật:</strong> Tài khoản điều hành/kế toán chưa bật xác thực 2 lớp (2FA). Nhấn để kích hoạt ngay.
            </span>
          </div>
          <ArrowRight className="size-3.5 shrink-0" />
        </Link>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Sparkles className="size-3.5 text-primary" />
          <span>{personaTitle}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {profile.chuc_vu?.ten || profile.phong_ban?.ten || "Cá nhân hóa"}
        </Badge>
      </div>

      {persona === "executive" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/approvals" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FileCheck className="size-3.5 text-indigo-600" />
                    Chứng từ chờ duyệt
                  </div>
                  <div className="text-xl font-bold text-indigo-600">
                    {approvals?.totalPending ?? 0} hồ sơ
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Mua hàng, kiểm kê, bán hàng & lương
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/financial-reports" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-emerald-600" />
                    Ngân quỹ & Runway
                  </div>
                  <div className="text-xl font-bold text-emerald-600">
                    {formatVND(cashflow?.currentCashBalance ?? 0)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Runway:{" "}
                    {cashflow?.runwayMonths != null
                      ? `${cashflow.runwayMonths} tháng`
                      : "Ổn định"}
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/planning?tab=alerts" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-600" />
                    Cảnh báo tồn kho an toàn
                  </div>
                  <div className="text-xl font-bold text-amber-600">
                    {lowStockCount} mặt hàng
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Cần bổ sung nguyên vật liệu / thành phẩm
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {persona === "operations" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/planning?tab=alerts" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-amber-600" />
                    Vật tư dưới ngưỡng an toàn
                  </div>
                  <div className="text-xl font-bold text-amber-600">
                    {lowStockCount} mặt hàng
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Xem danh sách & tạo đơn nhập mua
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/product/orders" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Factory className="size-3.5 text-purple-600" />
                    Kanban Tiến Độ Xưởng
                  </div>
                  <div className="text-base font-bold text-foreground">
                    Quét mã chuyển công đoạn
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Hỗ trợ chế độ Kiosk & báo phế phẩm QC
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/traceability" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Package className="size-3.5 text-teal-600" />
                    Truy xuất Lô hàng FEFO
                  </div>
                  <div className="text-base font-bold text-foreground">
                    Kiểm tra lô cận hạn xuất kho
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Ưu tiên xuất trước lô hết hạn sớm
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {persona === "sales" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/pos" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Store className="size-3.5 text-emerald-600" />
                    Quầy Thu Ngân POS
                  </div>
                  <div className="text-base font-bold text-foreground">
                    Bán hàng nhanh (Multi-Cart)
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Hỗ trợ lưu tạm nhiều giỏ & VietQR
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/quotations" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="size-3.5 text-blue-600" />
                    Báo Giá B2B
                  </div>
                  <div className="text-base font-bold text-foreground">
                    Lập báo giá & Chốt đơn 1-Click
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Tự động tính VAT & chiết khấu B2B
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/contracts" className="group">
            <Card className="h-full border-border/70 hover:border-primary/50 transition-all shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-teal-600" />
                    Hợp Đồng & Bảo Hành
                  </div>
                  <div className="text-base font-bold text-foreground">
                    Theo dõi đợt thanh toán
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Thu tiền đợt 1-click vào Sổ Quỹ
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
