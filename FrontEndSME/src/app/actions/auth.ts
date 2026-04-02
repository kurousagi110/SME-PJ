"use server";

import { http } from "@/lib/http";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";


export async function loginAction(data: any) {
  try {
    const result = await http.post("/users/login", data);

    // sendSuccess() wraps the payload: { success, message, data: { userId, accessToken, refreshToken } }
    const { userId, accessToken, refreshToken } = result.data;

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

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: "Tài khoản hoặc mật khẩu không chính xác",
    };
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

export async function refreshTokenAction(data: any) {
  try {
    // Same URL resolution as http.ts: use internal Docker URL when available
    const baseUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
    const url = baseUrl + "/users/refresh";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
    });
    const result = await res.json();
    // sendSuccess() wraps the payload in result.data
    const { accessToken, refreshToken } = result.data ?? {};
    const cookieStore = await cookies();
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
    if (result.status === 401) {
      redirect("/login");
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Làm mới token không thành công",
    };
  }
}
