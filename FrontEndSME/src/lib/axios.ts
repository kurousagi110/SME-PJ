// ─────────────────────────────────────────────────────────────────────────────
// Axios client — browser-side (client components only)
// - Attaches Bearer token from non-httpOnly cookie "access_token"
// - Unwraps { success, data } envelope → returns data directly
// - On 401: redirects to /login
// - On other errors: shows sonner toast + re-throws
// ─────────────────────────────────────────────────────────────────────────────

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

// Helper: read a cookie by name from document.cookie (client-side only)
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send httpOnly cookies automatically
  timeout: 15_000,
});

/* ── Request interceptor: attach Bearer token ─────────────────────────────── */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getCookie("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response interceptor: unwrap envelope, handle errors ────────────────── */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Backend returns { success, message, data, pagination? }
    // Unwrap so callers get the payload directly
    const body = response.data;
    if (body && typeof body === "object" && "data" in body) {
      return body.data;
    }
    return body;
  },
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ?? error.message ?? "Lỗi hệ thống";

    if (status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } else if (status !== undefined) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
