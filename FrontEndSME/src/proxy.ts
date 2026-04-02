import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/products", "/orders", "/users"];
const guestRoutes = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const refreshToken = req.cookies.get("refresh_token")?.value;

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isGuest = guestRoutes.includes(pathname);

  // Nếu vào root → chuyển login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 1) CHƯA LOGIN (Không có refresh token)
  if (isProtected && !refreshToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2) ĐÃ LOGIN (Có refresh token) → CẤM vào /login
  if (refreshToken && isGuest) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
