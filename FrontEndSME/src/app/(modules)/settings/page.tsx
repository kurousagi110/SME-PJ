"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconBuilding,
  IconQrcode,
  IconReportMoney,
  IconAward,
  IconClock,
  IconDeviceFloppy,
  IconRefresh,
} from "@tabler/icons-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchSystemSettingsAction,
  updateSystemSettingsAction,
  type SystemSettingsData,
} from "@/app/actions/settings";

const BANK_OPTIONS = [
  { value: "MB", label: "MB Bank (970422)" },
  { value: "VCB", label: "Vietcombank (970436)" },
  { value: "TCB", label: "Techcombank (970407)" },
  { value: "BIDV", label: "BIDV (970418)" },
  { value: "ICB", label: "VietinBank (970415)" },
  { value: "ACB", label: "ACB (970416)" },
  { value: "VPB", label: "VPBank (970432)" },
  { value: "TPB", label: "TPBank (970423)" },
];

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const res = await fetchSystemSettingsAction();
    if (res.success && res.data) {
      setSettings(res.data);
    } else {
      toast.error(res.error || "Không thể tải cấu hình hệ thống");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const res = await updateSystemSettingsAction(settings);
    if (res.success && res.data) {
      setSettings(res.data);
      toast.success("Đã lưu cấu hình hệ thống thành công!");
    } else {
      toast.error(res.error || "Lưu cấu hình thất bại");
    }
    setSaving(false);
  };

  if (loading || !settings) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Đang tải cấu hình hệ thống...</div>
    );
  }

  const updateSection = <K extends keyof SystemSettingsData>(
    section: K,
    field: string,
    value: unknown
  ) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...(prev[section] as Record<string, unknown>),
          [field]: value,
        },
      };
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cấu Hình Doanh Nghiệp & Hệ Thống</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý tập trung thông tin pháp nhân, tài khoản VietQR, tham số tính lương KPI/BHXH/TNCN, Loyalty và chấm công.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={loading || saving}>
            <IconRefresh className="size-4 mr-1.5" />
            Tải lại
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <IconDeviceFloppy className="size-4 mr-1.5" />
            {saving ? "Đang lưu..." : "Lưu tất cả thay đổi"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="company" className="gap-1.5">
            <IconBuilding className="size-4" />
            Doanh nghiệp & VietQR
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5">
            <IconReportMoney className="size-4" />
            Lương KPI & Thuế
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1.5">
            <IconAward className="size-4" />
            Tích điểm Loyalty
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5">
            <IconClock className="size-4" />
            Chấm công QR/GPS
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <IconQrcode className="size-4" />
            Cổng Tích Hợp
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COMPANY & VIETQR */}
        <TabsContent value="company" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <IconBuilding className="size-4 text-primary" />
                  Thông Tin Pháp Nhân (In Hóa Đơn & Phiếu)
                </CardTitle>
                <CardDescription>Hiển thị trên hóa đơn A4/A5, phiếu thu chi và báo giá B2B.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Tên công ty đầy đủ</Label>
                  <Input
                    value={settings.company.ten_cong_ty}
                    onChange={(e) => updateSection("company", "ten_cong_ty", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tên viết tắt</Label>
                    <Input
                      value={settings.company.ten_viet_tat}
                      onChange={(e) => updateSection("company", "ten_viet_tat", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mã số thuế (MST)</Label>
                    <Input
                      value={settings.company.ma_so_thue}
                      onChange={(e) => updateSection("company", "ma_so_thue", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Địa chỉ trụ sở</Label>
                  <Input
                    value={settings.company.dia_chi}
                    onChange={(e) => updateSection("company", "dia_chi", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Số điện thoại</Label>
                    <Input
                      value={settings.company.so_dien_thoai}
                      onChange={(e) => updateSection("company", "so_dien_thoai", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Thuế VAT mặc định (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={settings.company.thue_vat_mac_dinh}
                      onChange={(e) => updateSection("company", "thue_vat_mac_dinh", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email liên hệ</Label>
                    <Input
                      value={settings.company.email}
                      onChange={(e) => updateSection("company", "email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website</Label>
                    <Input
                      value={settings.company.website}
                      onChange={(e) => updateSection("company", "website", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <IconQrcode className="size-4 text-primary" />
                  Tài Khoản Ngân Hàng & VietQR Mặc Định
                </CardTitle>
                <CardDescription>Tự động áp dụng khi tạo mã QR thanh toán tại POS, Đơn bán và Portal khách hàng.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Ngân hàng nhận tiền</Label>
                  <Select
                    value={settings.vietqr.bank_bin}
                    onValueChange={(v) => updateSection("vietqr", "bank_bin", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn ngân hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANK_OPTIONS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Số tài khoản</Label>
                  <Input
                    value={settings.vietqr.account_number}
                    onChange={(e) => updateSection("vietqr", "account_number", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tên chủ tài khoản (Không dấu)</Label>
                  <Input
                    value={settings.vietqr.account_name}
                    onChange={(e) => updateSection("vietqr", "account_name", e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mẫu hiển thị VietQR</Label>
                  <Select
                    value={settings.vietqr.template}
                    onValueChange={(v) => updateSection("vietqr", "template", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact2">Compact 2 (Kèm thông tin TK)</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="qr_only">Chỉ mã QR</SelectItem>
                      <SelectItem value="print">Bản in khổ lớn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: PAYROLL & TAX */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tham Số Lương KPI & Khoán</CardTitle>
                <CardDescription>Áp dụng trực tiếp vào công thức tính lương tự động hàng tháng.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Giờ công chuẩn / tháng</Label>
                    <Input
                      type="number"
                      value={settings.payroll.gio_tieu_chuan}
                      onChange={(e) => updateSection("payroll", "gio_tieu_chuan", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lương cơ sở (VNĐ)</Label>
                    <Input
                      type="number"
                      value={settings.payroll.luong_co_so}
                      onChange={(e) => updateSection("payroll", "luong_co_so", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tỷ lệ hoa hồng KD (VD: 0.02 = 2%)</Label>
                    <Input
                      type="number"
                      step="0.005"
                      value={settings.payroll.ty_le_hoa_hong_kd}
                      onChange={(e) => updateSection("payroll", "ty_le_hoa_hong_kd", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Đơn giá khoán SX (VNĐ / SP)</Label>
                    <Input
                      type="number"
                      value={settings.payroll.don_gia_khoan_sx}
                      onChange={(e) => updateSection("payroll", "don_gia_khoan_sx", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mức phạt đi trễ (VNĐ / buổi)</Label>
                    <Input
                      type="number"
                      value={settings.payroll.muc_phat_di_tre}
                      onChange={(e) => updateSection("payroll", "muc_phat_di_tre", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Số ngày phép năm mặc định</Label>
                    <Input
                      type="number"
                      value={settings.payroll.annual_leave_days_default}
                      onChange={(e) => updateSection("payroll", "annual_leave_days_default", Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cấu Hình BHXH & Thuế TNCN (Luật VN)</CardTitle>
                <CardDescription>Thiết lập tỷ lệ trích đóng bảo hiểm và mức giảm trừ gia cảnh.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enable_si"
                    checked={settings.payroll.enable_social_insurance}
                    onCheckedChange={(v) => updateSection("payroll", "enable_social_insurance", Boolean(v))}
                  />
                  <Label htmlFor="enable_si">Tự động khấu trừ BHXH / BHYT / BHTN & Thuế TNCN khi tính lương</Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>BHXH NLĐ (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={settings.payroll.bhxh_nld_pct}
                      onChange={(e) => updateSection("payroll", "bhxh_nld_pct", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>BHYT NLĐ (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={settings.payroll.bhyt_nld_pct}
                      onChange={(e) => updateSection("payroll", "bhyt_nld_pct", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>BHTN NLĐ (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={settings.payroll.bhtn_nld_pct}
                      onChange={(e) => updateSection("payroll", "bhtn_nld_pct", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Giảm trừ bản thân (VNĐ)</Label>
                    <Input
                      type="number"
                      value={settings.payroll.giam_tru_ban_than}
                      onChange={(e) => updateSection("payroll", "giam_tru_ban_than", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Giảm trừ người phụ thuộc (VNĐ)</Label>
                    <Input
                      type="number"
                      value={settings.payroll.giam_tru_phu_thuoc}
                      onChange={(e) => updateSection("payroll", "giam_tru_phu_thuoc", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mức trần đóng BHXH (VNĐ)</Label>
                    <Input
                      type="number"
                      value={settings.payroll.muc_tran_bhxh}
                      onChange={(e) => updateSection("payroll", "muc_tran_bhxh", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phần Doanh nghiệp đóng (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={settings.payroll.bh_dn_pct}
                      onChange={(e) => updateSection("payroll", "bh_dn_pct", Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: LOYALTY */}
        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chương Trình Tích Điểm & Hạng Thành Viên</CardTitle>
              <CardDescription>Cấu hình tỷ lệ quy đổi điểm thưởng tại POS, Đơn bán và hiển thị trên Cổng Khách Hàng.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="loyalty_enabled"
                  checked={settings.loyalty.enabled}
                  onCheckedChange={(v) => updateSection("loyalty", "enabled", Boolean(v))}
                />
                <Label htmlFor="loyalty_enabled">Bật chương trình tích điểm thành viên</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Mức chi tiêu = 1 điểm (VNĐ)</Label>
                  <Input
                    type="number"
                    value={settings.loyalty.vnd_per_point}
                    onChange={(e) => updateSection("loyalty", "vnd_per_point", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Giá trị quy đổi 1 điểm (VNĐ)</Label>
                  <Input
                    type="number"
                    value={settings.loyalty.vnd_per_redeem_point}
                    onChange={(e) => updateSection("loyalty", "vnd_per_redeem_point", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tối đa giảm bằng điểm (% đơn)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.loyalty.max_redeem_pct}
                    onChange={(e) => updateSection("loyalty", "max_redeem_pct", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Ngưỡng hạng Bạc (điểm)</Label>
                  <Input
                    type="number"
                    value={settings.loyalty.tier_silver}
                    onChange={(e) => updateSection("loyalty", "tier_silver", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ngưỡng hạng Vàng (điểm)</Label>
                  <Input
                    type="number"
                    value={settings.loyalty.tier_gold}
                    onChange={(e) => updateSection("loyalty", "tier_gold", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ngưỡng hạng Bạch Kim (điểm)</Label>
                  <Input
                    type="number"
                    value={settings.loyalty.tier_platinum}
                    onChange={(e) => updateSection("loyalty", "tier_platinum", Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ATTENDANCE QR & GPS */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cấu Hình Chấm Công QR Động & GPS Geofencing</CardTitle>
              <CardDescription>Xác định giờ vào/ra chuẩn và bán kính vị trí văn phòng/xưởng cho chấm công di động.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enforce_geo"
                  checked={settings.attendance.enforce_geofence}
                  onCheckedChange={(v) => updateSection("attendance", "enforce_geofence", Boolean(v))}
                />
                <Label htmlFor="enforce_geo">Bắt buộc nhân viên nằm trong bán kính GPS văn phòng khi chấm công di động</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Giờ vào ca chuẩn</Label>
                  <Input
                    value={settings.attendance.work_start_time}
                    onChange={(e) => updateSection("attendance", "work_start_time", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Giờ tan ca chuẩn</Label>
                  <Input
                    value={settings.attendance.work_end_time}
                    onChange={(e) => updateSection("attendance", "work_end_time", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bán kính hợp lệ (mét)</Label>
                  <Input
                    type="number"
                    value={settings.attendance.radius_meters}
                    onChange={(e) => updateSection("attendance", "radius_meters", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Chu kỳ xoay mã QR (giây)</Label>
                  <Input
                    type="number"
                    value={settings.attendance.qr_rotation_seconds}
                    onChange={(e) => updateSection("attendance", "qr_rotation_seconds", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Vĩ độ văn phòng (Latitude)</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={settings.attendance.office_lat}
                    onChange={(e) => updateSection("attendance", "office_lat", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Kinh độ văn phòng (Longitude)</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={settings.attendance.office_lng}
                    onChange={(e) => updateSection("attendance", "office_lng", Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: INTEGRATIONS (E-INVOICE, LOGISTICS, SEPAY) */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cổng Tích Hợp Đối Ngoại (HĐĐT · Vận Chuyển · Thanh Toán)</CardTitle>
              <CardDescription>
                Cấu hình nhà cung cấp Hóa đơn điện tử (NĐ 123/TT 78), Hãng vận chuyển & Webhook gạch nợ tự động SePay/Casso.
                Khóa bí mật API được giữ an toàn trong biến môi trường phía server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Nhà cung cấp Hóa đơn điện tử</Label>
                  <Select
                    value={settings.integrations.einvoice_provider}
                    onValueChange={(v) => updateSection("integrations", "einvoice_provider", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mock">Mô phỏng nội bộ (Mock Preview)</SelectItem>
                      <SelectItem value="misa">MISA meInvoice</SelectItem>
                      <SelectItem value="vnpt">VNPT Invoice</SelectItem>
                      <SelectItem value="viettel">Viettel S-Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Chế độ HĐĐT</Label>
                  <Select
                    value={settings.integrations.einvoice_mode}
                    onValueChange={(v) => updateSection("integrations", "einvoice_mode", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mock">Mock (Xem trước không gửi CQT)</SelectItem>
                      <SelectItem value="live">Live (Yêu cầu EINVOICE_API_URL & TOKEN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ký hiệu mẫu hóa đơn</Label>
                  <Input
                    value={settings.integrations.einvoice_series}
                    onChange={(e) => updateSection("integrations", "einvoice_series", e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Hãng vận chuyển mặc định</Label>
                  <Select
                    value={settings.integrations.logistics_default_carrier}
                    onValueChange={(v) => updateSection("integrations", "logistics_default_carrier", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GHN">Giao Hàng Nhanh (GHN)</SelectItem>
                      <SelectItem value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</SelectItem>
                      <SelectItem value="VIETTELPOST">Viettel Post</SelectItem>
                      <SelectItem value="JTEXPRESS">J&amp;T Express</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Chế độ vận chuyển</Label>
                  <Select
                    value={settings.integrations.logistics_mode}
                    onValueChange={(v) => updateSection("integrations", "logistics_mode", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Ước tính cước & mã nội bộ)</SelectItem>
                      <SelectItem value="live">Live API (Yêu cầu token hãng)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="sepay_enabled"
                  checked={settings.integrations.sepay_enabled}
                  onCheckedChange={(v) => updateSection("integrations", "sepay_enabled", Boolean(v))}
                />
                <Label htmlFor="sepay_enabled">
                  Bật tự động gạch nợ đơn hàng (DH-...) & đợt thanh toán hợp đồng B2B (HD-...) qua Webhook SePay / Casso
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
