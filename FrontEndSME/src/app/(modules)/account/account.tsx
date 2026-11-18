"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Copy, Check } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import {
  useMyProfile,
  useUpdateProfile,
  useUpdatePassword,
} from "@/hooks/use-account";
import {
  setup2faAction,
  enable2faAction,
  disable2faAction,
} from "@/app/actions/auth";
import { isAdminOrDirector, hasPermission } from "@/lib/permissions";
import { toast } from "sonner";

export default function AccountPage() {
  const [openAccountModal, setOpenAccountModal] = useState(false);
  const [openSecurityModal, setOpenSecurityModal] = useState(false);

  // 2FA states
  const [open2faSetupModal, setOpen2faSetupModal] = useState(false);
  const [open2faDisableModal, setOpen2faDisableModal] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableOtp, setDisableOtp] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  const { data: profile, isLoading, refetch } = useMyProfile();

  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();

  const [fullName, setFullName] = useState("");
  const [birth, setBirth] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.ho_ten || "");
      setBirth(profile.ngay_sinh || "");
    }
  }, [profile]);

  if (isLoading)
    return <div className="p-6 text-center">Đang tải thông tin...</div>;

  const isTwoFaEnabled = Boolean((profile as any)?.two_factor_enabled);
  const isSensitiveRole =
    isAdminOrDirector(profile) ||
    hasPermission(profile, ["cashbook.close_period", "finance.manage", "payroll.manage"]);

  async function handleSaveProfile() {
    updateProfileMutation.mutate(
      { ho_ten: fullName, ngay_sinh: birth },
      {
        onSuccess: () => {
          toast.success("Cập nhật thành công");
          setOpenAccountModal(false);
        },
        onError: (err: any) => toast.error(err.message),
      }
    );
  }

  async function handleChangePassword() {
    if (newPass !== confirmPass) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    updatePasswordMutation.mutate(
      {
        oldPassword: currentPass,
        newPassword: newPass,
      },
      {
        onSuccess: () => {
          toast.success("Đổi mật khẩu thành công");
          setOpenSecurityModal(false);
          setCurrentPass("");
          setNewPass("");
          setConfirmPass("");
        },
        onError: (err: any) => toast.error(err.message),
      }
    );
  }

  async function handleStart2faSetup() {
    setTwoFaLoading(true);
    setRecoveryCodes([]);
    setOtpInput("");
    try {
      const res = await setup2faAction();
      if (res.success && res.data) {
        setSetupData(res.data);
        setOpen2faSetupModal(true);
      } else {
        toast.error(res.message || "Không thể khởi tạo 2FA");
      }
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleConfirmEnable2fa() {
    if (!otpInput.trim()) return;
    setTwoFaLoading(true);
    try {
      const res = await enable2faAction(otpInput.trim());
      if (res.success && res.data) {
        setRecoveryCodes(res.data.recoveryCodes || []);
        toast.success("Đã kích hoạt bảo mật 2 lớp (2FA)!");
        refetch();
      } else {
        toast.error(res.message || "Mã OTP không chính xác");
      }
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleDisable2fa() {
    if (!disablePassword || !disableOtp.trim()) {
      toast.error("Vui lòng nhập đủ mật khẩu và mã OTP");
      return;
    }
    setTwoFaLoading(true);
    try {
      const res = await disable2faAction({
        password: disablePassword,
        code: disableOtp.trim(),
      });
      if (res.success) {
        toast.success("Đã tắt xác thực 2 lớp (2FA)");
        setOpen2faDisableModal(false);
        setDisablePassword("");
        setDisableOtp("");
        refetch();
      } else {
        toast.error(res.message || "Không thể tắt 2FA");
      }
    } finally {
      setTwoFaLoading(false);
    }
  }

  const formatSecretGroups = (secret: string) =>
    secret.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="flex flex-col items-center p-6 gap-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            Thông tin tài khoản
          </CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Chỉnh sửa
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setOpenAccountModal(true)}>
                Tài khoản
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenSecurityModal(true)}>
                Đổi mật khẩu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Label>Họ tên:</Label>
            <span>{profile?.ho_ten}</span>
          </div>

          <div className="flex gap-2">
            <Label>Ngày sinh:</Label>
            <span>{profile?.ngay_sinh || "-"}</span>
          </div>

          <div className="flex gap-2">
            <Label>Phòng ban:</Label>
            <span>{profile?.phong_ban?.ten || "-"}</span>
          </div>

          <div className="flex gap-2">
            <Label>Chức vụ:</Label>
            <span>{profile?.chuc_vu?.ten || "-"}</span>
          </div>
        </CardContent>
      </Card>

      {/* BẢO MẬT 2 LỚP (2FA / TOTP) */}
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Bảo mật 2 lớp (TOTP Authenticator)
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={
              isTwoFaEnabled
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
            }
          >
            {isTwoFaEnabled ? "Đang bật" : "Chưa bật"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isTwoFaEnabled && isSensitiveRole && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs flex items-start gap-2 text-amber-800 dark:text-amber-200">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Khuyến nghị bảo mật:</strong> Tài khoản của bạn có quyền nhạy cảm (quản trị hệ thống, sổ quỹ hoặc duyệt chi lương). Bạn nên bật xác thực 2 lớp (2FA) bằng Google Authenticator / Microsoft Authenticator.
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            Khi kích hoạt, mỗi lần đăng nhập sẽ yêu cầu nhập mã 6 số thay đổi mỗi 30 giây từ ứng dụng xác thực (Google Authenticator, Microsoft Authenticator, Bitwarden...), kèm 8 mã khôi phục dự phòng dùng 1 lần.
          </p>

          <div>
            {!isTwoFaEnabled ? (
              <Button onClick={handleStart2faSetup} disabled={twoFaLoading}>
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                {twoFaLoading ? "Đang khởi tạo..." : "Kích hoạt bảo mật 2 lớp (2FA)"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setOpen2faDisableModal(true)}
              >
                Tắt xác thực 2 lớp
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL CHỈNH SỬA TÀI KHOẢN */}
      <Dialog open={openAccountModal} onOpenChange={setOpenAccountModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Họ tên</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <Label>Ngày sinh</Label>
              <Input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenAccountModal(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ĐỔI MẬT KHẨU */}
      <Dialog open={openSecurityModal} onOpenChange={setOpenSecurityModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Mật khẩu hiện tại</Label>
              <Input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
              />
            </div>

            <div>
              <Label>Mật khẩu mới</Label>
              <Input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
            </div>

            <div>
              <Label>Xác nhận mật khẩu</Label>
              <Input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenSecurityModal(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={updatePasswordMutation.isPending}
            >
              {updatePasswordMutation.isPending
                ? "Đang xử lý..."
                : "Đổi mật khẩu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL THIẾT LẬP 2FA */}
      <Dialog open={open2faSetupModal} onOpenChange={setOpen2faSetupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thiết lập xác thực 2 lớp (TOTP)</DialogTitle>
            <DialogDescription>
              {recoveryCodes.length > 0
                ? "Lưu lại 8 mã khôi phục bên dưới ở nơi an toàn. Mỗi mã chỉ dùng được 1 lần."
                : "Nhập khóa thiết lập vào ứng dụng Authenticator, sau đó nhập mã 6 số để xác nhận."}
            </DialogDescription>
          </DialogHeader>

          {recoveryCodes.length > 0 ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/40 font-mono text-xs">
                {recoveryCodes.map((code) => (
                  <div key={code} className="px-2 py-1 rounded bg-background border text-center font-semibold">
                    {code}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join("\n"));
                  toast.success("Đã sao chép 8 mã khôi phục");
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Sao chép toàn bộ mã khôi phục
              </Button>
            </div>
          ) : setupData ? (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/40 space-y-2">
                <div className="font-semibold text-foreground">
                  1. Khóa thiết lập (Setup Key — nhập thủ công vào app Authenticator):
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded bg-background border font-mono text-sm font-bold tracking-wider">
                  <span className="break-all">{formatSecretGroups(setupData.secret)}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(setupData.secret);
                      setCopiedSecret(true);
                      toast.success("Đã sao chép khóa 2FA");
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                  >
                    {copiedSecret ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Hoặc mở nhanh trên điện thoại:{" "}
                  <a href={setupData.otpauthUri} className="text-primary underline">
                    Mở ứng dụng Authenticator
                  </a>
                  . (Khóa được giữ nội bộ, không gửi ra dịch vụ QR bên ngoài.)
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="totp-verify-input">2. Nhập mã OTP 6 số hiển thị trên ứng dụng</Label>
                <Input
                  id="totp-verify-input"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono text-center text-base tracking-widest"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {recoveryCodes.length > 0 ? (
              <Button onClick={() => setOpen2faSetupModal(false)}>Hoàn tất</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen2faSetupModal(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmEnable2fa}
                  disabled={twoFaLoading || otpInput.trim().length < 6}
                >
                  {twoFaLoading ? "Đang xác nhận..." : "Xác nhận & Kích hoạt"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TẮT 2FA */}
      <Dialog open={open2faDisableModal} onOpenChange={setOpen2faDisableModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tắt bảo mật 2 lớp (2FA)</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu hiện tại và mã OTP 6 số để xác nhận tắt 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Mật khẩu hiện tại</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Mã OTP 6 số</Label>
              <Input
                value={disableOtp}
                onChange={(e) => setDisableOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="font-mono text-center tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen2faDisableModal(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={twoFaLoading}
              onClick={handleDisable2fa}
            >
              {twoFaLoading ? "Đang xử lý..." : "Xác nhận Tắt 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
