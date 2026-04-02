// // lib/http.ts

import { cookies } from "next/headers";
import { refreshTokenAction } from "@/app/actions/auth"; // cập đúng đường dẫn
async function request(path: string, options: RequestInit = {}, retry = false) {
  // API_INTERNAL_URL is a runtime-only env var (not NEXT_PUBLIC_*) set in docker-compose.
  // It points to the Express container directly (http://api:5000/api/v1) so that
  // server-side fetch works inside Docker — Node.js fetch requires an absolute URL.
  // NEXT_PUBLIC_API_URL is a relative path (/api/v1) baked at build time for browser use.
  const baseUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const url = `${baseUrl}${path}`;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value ?? "";

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
    console.log("⚠️ Access token hết hạn → đang refresh...");

    const userId = cookieStore.get("user_id")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;
    console.log("refreshToken:", refreshToken);
    if (!refreshToken) {
      throw new Error("Hết phiên đăng nhập, vui lòng đăng nhập lại.");
    }

    // Gọi server action refresh
    const refreshResult = await refreshTokenAction({ userId, refreshToken });
    console.log("🚀 Refresh token result:", refreshResult);
    if (!refreshResult.success) {
      throw new Error("không thể làm mới token, vui lòng đăng nhập lại.");
    }

    // Sau khi refresh token thành công → gọi lại request ban đầu
    return request(path, options, true);
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
