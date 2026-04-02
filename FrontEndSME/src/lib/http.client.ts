// src/lib/http.client.ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class HttpError extends Error {
  status: number;
  path: string;
  data: any;
  constructor(message: string, status: number, path: string, data?: any) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.path = path;
    this.data = data;
  }
}

/**
 *  Client gọi API thông qua Next proxy:
 * /api/proxy + path
 * Ví dụ: httpClient.get("/luong/cham-cong") => GET /api/proxy/luong/cham-cong
 */
async function request(method: HttpMethod, path: string, body?: any) {
  const url = `/api/luong${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    //  quan trọng để cookie gửi kèm request
    credentials: "include",
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // nếu backend trả text
    const t = await res.text().catch(() => "");
    data = t;
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      (res.status === 404 ? `404 Not Found: ${path}` : `HTTP ${res.status}`);
    throw new HttpError(msg, res.status, path, data);
  }

  return data;
}

export const httpClient = {
  get: (path: string) => request("GET", path),
  post: (path: string, body?: any) => request("POST", path, body),
  put: (path: string, body?: any) => request("PUT", path, body),
  patch: (path: string, body?: any) => request("PATCH", path, body),
  delete: (path: string) => request("DELETE", path),
};
