"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  DollarSign,
  Building2,
  Factory,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface LifecycleOrder {
  _id?: string;
  ma_dh?: string;
  loai_don?: string;
  trang_thai?: string;
  trang_thai_van_chuyen?: string;
  co_lenh_san_xuat?: boolean;
  thanh_toan?: {
    status?: string;
  };
  created_at?: string;
  updated_at?: string;
}

interface Props {
  order: LifecycleOrder;
  className?: string;
}

export function DocumentLifecycleStepper({ order, className = "" }: Props) {
  // Determine current active stage (1 to 5)
  // 1: Khởi tạo (draft)
  // 2: Phê duyệt / Sản xuất (confirmed / co_lenh_san_xuat)
  // 3: Đóng gói kho (cho_dong_goi / da_dong_goi)
  // 4: Đang vận chuyển (dang_giao / da_ban_giao)
  // 5: Hoàn tất & Thu tiền (completed / paid)

  const isCompleted = order.trang_thai === "completed" || order.thanh_toan?.status === "paid";
  const isShipping =
    order.trang_thai_van_chuyen === "dang_giao" ||
    order.trang_thai_van_chuyen === "da_ban_giao";
  const isPacking =
    order.trang_thai_van_chuyen === "cho_dong_goi" ||
    (!order.trang_thai_van_chuyen && order.trang_thai === "confirmed" && !order.co_lenh_san_xuat);
  const isProducing = !!order.co_lenh_san_xuat;
  const isDraft = order.trang_thai === "draft";

  let currentStageIndex = 1;
  let currentDeptName = "Phòng Kinh Doanh";

  if (isCompleted) {
    currentStageIndex = 5;
    currentDeptName = "Kế Toán & Thu Ngân (Hoàn tất)";
  } else if (isShipping) {
    currentStageIndex = 4;
    currentDeptName = "Đơn Vị Vận Chuyển (Giao hàng)";
  } else if (isPacking) {
    currentStageIndex = 3;
    currentDeptName = "Phòng Kho (Đóng gói)";
  } else if (isProducing) {
    currentStageIndex = 2;
    currentDeptName = "Phòng Sản Xuất (Gia công)";
  } else if (order.trang_thai === "confirmed") {
    currentStageIndex = 2;
    currentDeptName = "Phòng Kho / Sản Xuất";
  }

  // Calculate elapsed time in current status
  const lastUpdate = order.updated_at || order.created_at || new Date().toISOString();
  const diffHours = Math.max(
    0,
    (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60)
  );
  const isSlaBreached = !isCompleted && diffHours > 24;

  const stages = [
    { num: 1, label: "1. Khởi tạo", dept: "Kinh Doanh", icon: Building2 },
    { num: 2, label: "2. Duyệt / SX", dept: "Sản Xuất", icon: Factory },
    { num: 3, label: "3. Đóng gói", dept: "Kho Hàng", icon: Package },
    { num: 4, label: "4. Giao hàng", dept: "Vận Chuyển", icon: Truck },
    { num: 5, label: "5. Hoàn tất", dept: "Tài Chính", icon: DollarSign },
  ];

  return (
    <div className={`p-4 rounded-xl border bg-card shadow-xs space-y-3 ${className}`}>
      {/* Top status & SLA badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Khâu hiện tại:</span>
          <Badge variant="outline" className="font-semibold text-primary border-primary/30 bg-primary/5">
            {currentDeptName}
          </Badge>
          <span className="text-xs text-muted-foreground">
            (Đã dừng: {diffHours < 1 ? "Vừa xong" : `${Math.floor(diffHours)} giờ`})
          </span>
        </div>

        {isSlaBreached ? (
          <Badge variant="destructive" className="flex items-center gap-1 text-[11px] animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            Cảnh báo tắc nghẽn: Đã dừng quá 24h
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px]">
            <Clock className="h-3 w-3 mr-1 text-emerald-600" />
            Tiến độ đúng hạn (SLA OK)
          </Badge>
        )}
      </div>

      {/* Visual Stepper */}
      <div className="grid grid-cols-5 gap-1 pt-2">
        {stages.map((st) => {
          const isPassed = currentStageIndex > st.num;
          const isCurrent = currentStageIndex === st.num;
          const Icon = st.icon;

          return (
            <div key={st.num} className="flex flex-col items-center text-center relative group">
              {/* Connector line */}
              {st.num > 1 && (
                <div
                  className={`absolute top-4 -left-1/2 w-full h-0.5 z-0 transition-colors ${
                    isPassed || isCurrent ? "bg-primary" : "bg-border"
                  }`}
                />
              )}

              {/* Circle Icon */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  isPassed
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/20 border-2 border-primary text-primary ring-2 ring-primary/20"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {isPassed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>

              {/* Labels */}
              <div className="mt-1.5 space-y-0.5">
                <div
                  className={`text-[11px] font-semibold truncate ${
                    isCurrent ? "text-primary" : isPassed ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {st.label}
                </div>
                <div className="text-[10px] text-muted-foreground hidden sm:block">
                  {st.dept}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
