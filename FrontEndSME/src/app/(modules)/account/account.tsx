"use client";

import { useState, useEffect } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import {
  useMyProfile,
  useUpdateProfile,
  useUpdatePassword,
} from "@/hooks/use-account";
import { toast } from "sonner";

export default function AccountPage() {
  // modal states
  const [openAccountModal, setOpenAccountModal] = useState(false);
  const [openSecurityModal, setOpenSecurityModal] = useState(false);

  // query load profile
  const { data: profile, isLoading } = useMyProfile();

  // mutations
  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();

  // form states
  const [fullName, setFullName] = useState("");
  const [birth, setBirth] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  console.log("profile", profile);
  // fill form khi mở modal
  useEffect(() => {
    if (profile) {
      setFullName(profile.ho_ten);
      setBirth(profile.ngay_sinh);
    }
  }, [profile]);

  if (isLoading)
    return <div className="p-6 text-center">Đang tải thông tin...</div>;

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

  return (
    <div className="flex justify-center p-6 ">
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
                Bảo mật
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
            <span>{profile?.ngay_sinh}</span>
          </div>

          <div className="flex gap-2">
            <Label>Phòng ban:</Label>
            <span>{profile?.phong_ban.ten}</span>
          </div>

          <div className="flex gap-2">
            <Label>Chức vụ:</Label>
            <span>{profile?.chuc_vu.ten}</span>
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
    </div>
  );
}
