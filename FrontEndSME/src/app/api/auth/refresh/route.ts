// /api/auth/refresh — browser-callable endpoint that delegates to the
// server action refreshTokenAction. Returns 200 if refresh succeeded,
// 401 if not. Cookies (httpOnly refresh_token) are sent by the browser
// automatically and read by the server action via cookies().

import { refreshTokenAction } from "@/app/actions/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await refreshTokenAction();
    if (result.success) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
