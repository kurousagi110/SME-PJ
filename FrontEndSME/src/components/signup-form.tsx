"use client";
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Đăng ký tài khoản</CardTitle>
        <CardDescription>
          Nhập thông tin của bạn bên dưới để tạo tài khoản
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Họ và tên</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Nguyễn Văn A"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Tên đăng nhập</FieldLabel>
              <Input
                id="email"
                type="email"
                // placeholder="m@example.com"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
              <Input id="password" type="password" required />
              <FieldDescription>
                Phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Xác nhận mật khẩu
              </FieldLabel>
              <Input id="confirm-password" type="password" required />
              <FieldDescription>
                Vui lòng xác nhận mật khẩu của bạn.
              </FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit">Tạo tài khoản</Button>

                <FieldDescription className="px-6 text-center">
                  Bạn đã có tài khoản? <Link href="/login">Đăng nhập</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
