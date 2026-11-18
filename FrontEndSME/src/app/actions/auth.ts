"use server";

import { http } from "@/lib/http";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";


async function setAuthCookies(
  userId: string,
  accessToken: string,
  refreshToken: string
) {
  const cookieStore = await cookies();

  cookieStore.set("user_id", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
    sameSite: "lax",
  });

  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
}

export async function loginAction(data: any) {
  try {
    const result = await http.post("/users/login", data);

    if (result?.data?.requires2fa && result?.data?.tempToken) {
      return {
        success: false,
        requires2fa: true,
        tempToken: String(result.data.tempToken),
      };
    }

    // sendSuccess() wraps the payload: { success, message, data: { userId, accessToken, refreshToken } }
    const { userId, accessToken, refreshToken } = result.data;
    await setAuthCookies(userId, accessToken, refreshToken);

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: "Tài khoản hoặc mật khẩu không chính xác",
    };
  }
}

export async function verify2faLoginAction(payload: {
  tempToken: string;
  code: string;
}) {
  try {
    const result = await http.post("/users/login/2fa", payload);
    const { userId, accessToken, refreshToken, usedRecoveryCode } = result.data;
    await setAuthCookies(userId, accessToken, refreshToken);
    return { success: true, usedRecoveryCode: Boolean(usedRecoveryCode) };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Mã xác thực 2FA không chính xác hoặc đã hết hạn",
    };
  }
}

export async function setup2faAction(): Promise<{
  success: boolean;
  data?: { secret: string; otpauthUri: string };
  message?: string;
}> {
  try {
    const result = await http.post("/users/2fa/setup", {});
    return { success: true, data: result.data };
  } catch (err: any) {
    return { success: false, message: err?.message || "Không thể khởi tạo 2FA" };
  }
}

export async function enable2faAction(code: string): Promise<{
  success: boolean;
  data?: { enabled: boolean; recoveryCodes: string[] };
  message?: string;
}> {
  try {
    const result = await http.post("/users/2fa/enable", { code });
    return { success: true, data: result.data };
  } catch (err: any) {
    return { success: false, message: err?.message || "Mã OTP không chính xác" };
  }
}

export async function disable2faAction(payload: {
  password: string;
  code: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    await http.post("/users/2fa/disable", payload);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Không thể tắt 2FA" };
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    const data = {
      userId: cookieStore.get("user_id")?.value,
      refreshToken: cookieStore.get("refresh_token")?.value,
    };
    const result = await http.post("/users/logout", data);

    cookieStore.delete("user_id");
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Đăng xuất không thành công",
    };
  }
}

export async function myProfile() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    const result = await http.get("/users/me/" + userId);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Lấy thông tin tài khoản không thành công");
  }
}
export async function updateProfile(data: any) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    const result = await http.patch("/users/" + userId + "/profile", data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật thông tin không thành công");
  }
}

export async function updatePassword(data: any) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    const result = await http.patch("/users/" + userId + "/password", data);
    return { success: true, data: result.data };
  } catch (err: any) {
    throw new Error(err.message || "Cập nhật mật khẩu không thành công");
  }
}

// SECURITY: refreshTokenAction MUST only be called from server actions
// (cookies() only works in server context). With the backend's refresh
// endpoint now deriving userId from the JWT payload, we no longer
// (and MUST NOT) pass userId from the body.
export async function refreshTokenAction() {
  try {
    // Same URL resolution as http.ts: use internal Docker URL when available
    const baseUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
    const url = baseUrl + "/users/refresh";

    // Read refresh_token from the HTTP-only cookie set by login.
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;
    if (!refreshToken) {
      redirect("/login");
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    // Bug fix: previously checked `result.status === 401` but the backend
    // returns {success, data} envelope with HTTP status on `res`, not on
    // the parsed body. When refresh genuinely failed, we silently returned
    // success:true and continued using a stale access_token.
    if (!res.ok) {
      redirect("/login");
    }

    const result = await res.json();
    const { accessToken, refreshToken: newRefreshToken } = result.data ?? {};
    if (!accessToken || !newRefreshToken) {
      redirect("/login");
    }

    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 15,
      sameSite: "lax",
    });

    cookieStore.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return { success: true, accessToken };
  } catch (err: any) {
    if (err?.message?.includes("NEXT_REDIRECT")) throw err;
    return {
      success: false,
      message: err.message || "Làm mới token không thành công",
    };
  }
}
