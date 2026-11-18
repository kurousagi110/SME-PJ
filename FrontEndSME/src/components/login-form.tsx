"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginAction, verify2faLoginAction } from "@/app/actions/auth";

const loginSchema = z.object({
  tai_khoan: z.string().min(1, "Vui lòng nhập tài khoản"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [twoFaChallenge, setTwoFaChallenge] = React.useState<{
    tempToken: string;
    taiKhoan: string;
  } | null>(null);
  const [otpCode, setOtpCode] = React.useState("");
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);

  const form = useForm({
    defaultValues: {
      tai_khoan: "",
      password: "",
    },
    validators: {
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const res: any = await loginAction(value);

        if (res.requires2fa && res.tempToken) {
          setTwoFaChallenge({
            tempToken: res.tempToken,
            taiKhoan: value.tai_khoan,
          });
          setOtpCode("");
          toast.info("Tài khoản đã bật 2FA. Vui lòng nhập mã OTP 6 số.");
          return;
        }

        if (res.success) {
          toast.success("Đăng nhập thành công!");
          router.push("/dashboard");
          router.refresh();
        } else {
          toast.error(res.message || "Đăng nhập thất bại");
        }
      } catch (err: any) {
        toast.error(err?.message || "Đăng nhập thất bại");
      }
    },
  });

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaChallenge || !otpCode.trim()) return;
    setVerifyingOtp(true);
    try {
      const res = await verify2faLoginAction({
        tempToken: twoFaChallenge.tempToken,
        code: otpCode.trim(),
      });
      if (res.success) {
        if (res.usedRecoveryCode) {
          toast.warning("Đã đăng nhập bằng mã khôi phục dùng 1 lần.");
        } else {
          toast.success("Xác thực 2FA thành công!");
        }
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.message || "Mã OTP không hợp lệ");
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (twoFaChallenge) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Xác thực 2 lớp (2FA)
            </CardTitle>
            <CardDescription>
              Nhập mã 6 số từ ứng dụng Authenticator hoặc mã khôi phục cho tài khoản{" "}
              <strong>{twoFaChallenge.taiKhoan}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Field>
                <FieldLabel htmlFor="otp-code">Mã OTP / Mã khôi phục</FieldLabel>
                <Input
                  id="otp-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="VD: 123456 hoặc A1B2-C3D4"
                  className="font-mono text-center tracking-widest text-base"
                  autoFocus
                />
              </Field>
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={verifyingOtp || !otpCode.trim()}>
                  {verifyingOtp ? "Đang xác thực..." : "Xác nhận & Đăng nhập"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTwoFaChallenge(null);
                    setOtpCode("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại đăng nhập
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Đăng nhập hệ thống</CardTitle>
          <CardDescription>
            Nhập tài khoản và mật khẩu để truy cập
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            id="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Field
                name="tai_khoan"
                children={(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel htmlFor={field.name}>Tài khoản</FieldLabel>

                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={invalid}
                      />

                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              <form.Field
                name="password"
                children={(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel htmlFor={field.name}>Mật khẩu</FieldLabel>

                      <Input
                        id={field.name}
                        type="password"
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={invalid}
                      />

                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />

              <Field>
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                  children={([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                    </Button>
                  )}
                />
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
