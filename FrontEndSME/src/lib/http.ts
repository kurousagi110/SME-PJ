// // lib/http.ts — server-side fetcher (Next.js Server Components / Server Actions)

import { cookies } from "next/headers";
import { refreshTokenAction } from "@/app/actions/auth";

// Bug fix: in-flight refresh dedupe. Without this, N parallel requests
// that all 401 would each fire a refresh, causing:
//   1) Multiple "previous refresh token" to be revoked server-side
//      (atomic $pull+$push rotates the slot, so a 2nd concurrent
//      refresh hits a slot that no longer contains the original token).
//   2) Multiple Set-Cookie responses overwriting each other.
let refreshInFlight: Promise<string | null> | null = null;

async function ensureFreshToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshTokenAction()
      .then((res) => (res?.success && res?.accessToken ? (res.accessToken as string) : null))
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request(path: string, options: RequestInit = {}, retry = false) {
  // API_INTERNAL_URL is a runtime-only env var (not NEXT_PUBLIC_*) set in docker-compose.
  // It points to the Express container directly (http://api:5000/api/v1) so that
  // server-side fetch works inside Docker — Node.js fetch requires an absolute URL.
  const baseUrl = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const cookieStore = await cookies();
  let token = cookieStore.get("access_token")?.value ?? "";

  // If access token is absent but refresh token exists, proactively refresh upfront
  if (!token && !retry) {
    const refreshToken = cookieStore.get("refresh_token")?.value;
    if (refreshToken) {
      const refreshed = await ensureFreshToken();
      if (refreshed) token = refreshed;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  // --- Nếu hết hạn token (401) --- //
  if (res.status === 401 && !retry) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[http] Access token expired → refreshing");
    }

    const refreshToken = cookieStore.get("refresh_token")?.value;
    if (!refreshToken) {
      throw new Error("Hết phiên đăng nhập, vui lòng đăng nhập lại.");
    }

    // SECURITY: do NOT pass userId — backend now derives it from the JWT.
    // Use the in-flight dedupe so parallel 401s share one refresh call.
    const newAccessToken = await ensureFreshToken();
    if (!newAccessToken) {
      throw new Error("Hết phiên đăng nhập, vui lòng đăng nhập lại.");
    }

    // Sau khi refresh token thành công → gọi lại request ban đầu với Authorization header mới
    return request(
      path,
      {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
        },
      },
      true
    );
  }

  // Nếu API lỗi khác
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "API error");
  }

  return res.json();
}

export const http = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: (path: string, body?: any) =>
    request(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (path: string) =>
    request(path, {
      method: "DELETE",
    }),
  patch: (path: string, body?: any) =>
    request(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
