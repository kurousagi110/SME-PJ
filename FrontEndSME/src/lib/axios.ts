// ─────────────────────────────────────────────────────────────────────────────
// Axios client — browser-side (client components only)
// - access_token / refresh_token are HTTP-only cookies (set by server actions).
//   Browser code CANNOT read them via document.cookie — only the server can
//   via cookies(). We rely on withCredentials so the browser sends them
//   automatically; the backend (Express) reads them via cookie-parser if
//   configured, OR the server-side fetcher (lib/http.ts) attaches Bearer.
// - On 401 we trigger a single in-flight refresh via the server action,
//   then retry the original request once.
// - Unwraps { success, data } envelope → returns data directly.
// ─────────────────────────────────────────────────────────────────────────────

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // browser sends HTTP-only cookies automatically
  timeout: 15_000,
});

/* ── Request interceptor: noop (cookies auto-sent via withCredentials) ─── */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error) => Promise.reject(error)
);

/* ── In-flight refresh dedupe ───────────────────────────────────────────── */
// N parallel 401s would otherwise fire N refresh calls — each rotates
// the refresh token on the server, so call #2 hits an already-revoked
// token and fails. Share one Promise across all callers.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/* ── Response interceptor: unwrap envelope, handle 401 refresh ───────────── */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data;
    if (body && typeof body === "object" && "data" in body) {
      return body.data;
    }
    return body;
  },
  async (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const message =
      error.response?.data?.message ?? error.message ?? "Lỗi hệ thống";

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      const ok = await refreshOnce();
      if (ok) {
        // Retry the original request; cookies are now fresh in this tab.
        return axiosInstance.request(original);
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (status !== undefined && status !== 401) {
      toast.error(message);
    } else if (status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
