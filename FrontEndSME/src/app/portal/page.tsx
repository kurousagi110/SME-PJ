"use client";

import * as React from "react";
import {
  Search,
  Package,
  Truck,
  Factory,
  FileText,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { lookupPortalAction } from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CameraBarcodeScanner } from "@/components/camera-barcode-scanner";

interface PortalOrderData {
  type: "order";
  code: string;
  created_at?: string;
  customer_name: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  items: { ten: string; so_luong: number; don_gia: number; thanh_tien: number }[];
  production?: {
    ma_lenh?: string;
    trang_thai?: string;
    cong_doan?: string;
    so_luong?: number;
    so_luong_dat?: number;
  } | null;
  shipment?: {
    ma_van_don?: string;
    don_vi_van_chuyen?: string;
    trang_thai?: string;
    ngay_giao_du_kien?: string;
  } | null;
}

interface PortalContractData {
  type: "contract";
  code: string;
  title?: string;
  customer_name: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  milestones: {
    dot: string;
    so_tien: number;
    han_thanh_toan?: string;
    trang_thai: string;
    vietqr_url?: string | null;
  }[];
}

interface PortalWarrantyData {
  type: "warranty";
  code: string;
  serial_number?: string | null;
  product_name: string;
  customer_name: string;
  status: string;
  start_date?: string;
  end_date?: string | null;
  history: { ngay?: string; mo_ta?: string; ky_thuat_vien?: string }[];
}

type PortalResult = PortalOrderData | PortalContractData | PortalWarrantyData;

const toVND = (v: number) => `${Number(v || 0).toLocaleString("vi-VN")} đ`;

export default function CustomerPortalPage() {
  const [code, setCode] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PortalResult | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!code.trim() || phone.trim().length < 4) {
      setError("Vui lòng nhập mã chứng từ và ít nhất 4 số cuối số điện thoại.");
      return;
    }
    setLoading(true);
    try {
      const res = await lookupPortalAction(code, phone);
      if (!res.success) {
        setError(res.error || "Không tìm thấy dữ liệu");
      } else {
        setResult(res.data as PortalResult);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="px-3 py-1 text-xs bg-white dark:bg-slate-900">
            Cổng Tra Cứu Khách Hàng Tự Phục Vụ
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tra Cứu Đơn Hàng, Hợp Đồng & Bảo Hành
          </h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi tiến độ sản xuất, vận đơn giao hàng, thanh toán VietQR và bảo hành điện tử theo thời gian thực.
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Thông tin tra cứu</CardTitle>
              <CardDescription>
                Nhập mã đơn hàng (DH-...), mã hợp đồng (HD-...) hoặc mã bảo hành / Serial kèm 4 số cuối SĐT.
              </CardDescription>
            </div>
            <CameraBarcodeScanner
              buttonLabel="Quét QR"
              onDetected={(scanned) => setCode(scanned)}
            />
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5 space-y-1.5">
                <Label htmlFor="portal-code">Mã chứng từ / Serial</Label>
                <Input
                  id="portal-code"
                  placeholder="VD: DH-2026-0001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="sm:col-span-4 space-y-1.5">
                <Label htmlFor="portal-phone">4 số cuối SĐT</Label>
                <Input
                  id="portal-phone"
                  placeholder="VD: 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" className="w-full gap-1.5" disabled={loading}>
                  <Search className="h-4 w-4" />
                  {loading ? "Đang tìm..." : "Tra cứu"}
                </Button>
              </div>
            </form>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kết quả Đơn hàng */}
        {result?.type === "order" && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Đơn hàng {result.code}
                </CardTitle>
                <CardDescription>
                  Khách hàng: {result.customer_name} · Ngày lập:{" "}
                  {result.created_at ? new Date(result.created_at).toLocaleDateString("vi-VN") : "—"}
                </CardDescription>
              </div>
              <Badge className="uppercase">{result.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Tiến độ xưởng & Vận đơn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-slate-50/70 dark:bg-slate-900/50 space-y-1">
                  <div className="text-xs font-semibold flex items-center gap-1.5 text-indigo-600">
                    <Factory className="h-4 w-4" /> Tiến độ sản xuất
                  </div>
                  {result.production ? (
                    <div className="text-xs space-y-0.5">
                      <div>Mã lệnh: <strong>{result.production.ma_lenh}</strong></div>
                      <div>Trạng thái: <strong>{result.production.trang_thai}</strong></div>
                      {result.production.cong_doan && <div>Công đoạn: {result.production.cong_doan}</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Hàng có sẵn / Chưa có lệnh sản xuất</div>
                  )}
                </div>

                <div className="rounded-lg border p-3 bg-slate-50/70 dark:bg-slate-900/50 space-y-1">
                  <div className="text-xs font-semibold flex items-center gap-1.5 text-emerald-600">
                    <Truck className="h-4 w-4" /> Vận chuyển & Giao nhận
                  </div>
                  {result.shipment ? (
                    <div className="text-xs space-y-0.5">
                      <div>Mã vận đơn: <strong>{result.shipment.ma_van_don}</strong></div>
                      <div>Đơn vị: {result.shipment.don_vi_van_chuyen || "Nội bộ"}</div>
                      <div>Trạng thái: <strong>{result.shipment.trang_thai}</strong></div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Chưa tạo phiếu vận chuyển</div>
                  )}
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="text-left p-2.5">Sản phẩm</th>
                      <th className="text-right p-2.5">SL</th>
                      <th className="text-right p-2.5">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2.5">{it.ten}</td>
                        <td className="p-2.5 text-right">{it.so_luong}</td>
                        <td className="p-2.5 text-right font-medium">{toVND(it.thanh_tien)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t text-sm">
                <span className="text-muted-foreground">Tổng giá trị đơn hàng</span>
                <span className="text-lg font-bold text-primary">{toVND(result.total_amount)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kết quả Hợp đồng */}
        {result?.type === "contract" && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Hợp đồng {result.code}
                </CardTitle>
                <CardDescription>
                  {result.title || "Hợp đồng kinh tế"} · Đối tác: {result.customer_name}
                </CardDescription>
              </div>
              <Badge>{result.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-md border bg-muted/30">
                  <div className="text-xs text-muted-foreground">Tổng giá trị</div>
                  <div className="font-bold text-base">{toVND(result.total_amount)}</div>
                </div>
                <div className="p-3 rounded-md border bg-emerald-50/50">
                  <div className="text-xs text-muted-foreground">Đã thanh toán</div>
                  <div className="font-bold text-base text-emerald-700">{toVND(result.paid_amount)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Tiến độ các đợt thanh toán</h3>
                {result.milestones.map((m, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {m.trang_thai === "da_thanh_toan" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600" />
                        )}
                        {m.dot} — {toVND(m.so_tien)}
                      </div>
                      {m.han_thanh_toan && (
                        <div className="text-xs text-muted-foreground">
                          Hạn thanh toán: {new Date(m.han_thanh_toan).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </div>
                    {m.vietqr_url ? (
                      <a
                        href={m.vietqr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
                      >
                        <QrCode className="h-4 w-4" /> Mở mã VietQR thanh toán
                      </a>
                    ) : (
                      <Badge variant="secondary" className="w-fit">Đã thanh toán</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kết quả Bảo hành */}
        {result?.type === "warranty" && (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Phiếu bảo hành {result.code}
                </CardTitle>
                <CardDescription>
                  Sản phẩm: {result.product_name} · Khách hàng: {result.customer_name}
                </CardDescription>
              </div>
              <Badge>{result.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Ngày kích hoạt</div>
                  <div className="font-medium">
                    {result.start_date ? new Date(result.start_date).toLocaleDateString("vi-VN") : "—"}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Hạn bảo hành</div>
                  <div className="font-medium">
                    {result.end_date ? new Date(result.end_date).toLocaleDateString("vi-VN") : "—"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
