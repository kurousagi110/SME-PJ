import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// SECURITY: Auth gate is now "deny by default". Only /login is public; every
// other route under (modules) requires an authenticated session (refresh_token
// cookie). Previously this list was whitelisted, which let users reach
// /sales, /dieu-chinh-kho, /staff, /audit-log, /department, /san-xuat,
// /warehouse, /material/*, /product/*, /account, /check-in etc. without auth.
const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const refreshToken = req.cookies.get("refresh_token")?.value;
  const isAuthed = !!refreshToken;

  // Root → /login (or /dashboard if already logged in)
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthed ? "/dashboard" : "/login", req.url)
    );
  }

  // Public paths (e.g. /login) — bounce authed users back to dashboard
  if (isPublic(pathname)) {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Everything else requires auth
  if (!isAuthed) {
    const loginUrl = new URL("/login", req.url);
    // Preserve intended destination so we can redirect after login
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API routes (handled server-side), Next.js internals, and static files.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
