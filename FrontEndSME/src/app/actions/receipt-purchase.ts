"use server";

import { cookies } from "next/headers";

/** ===================== Helpers ===================== */
const s = (v: any) => String(v ?? "").trim();
const n = (v: any, def = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
};

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

function getApiBase() {
  const base =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    (process.env.HOST_NAME && process.env.PORT
      ? `${process.env.HOST_NAME}:${process.env.PORT}`
      : "");

  if (!base) {
    throw new Error(
      "Thiếu API base. Set NEXT_PUBLIC_API_URL hoặc HOST_NAME + PORT trong .env FrontEnd"
    );
  }
  return base;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: any }
): Promise<T> {
  const base = getApiBase();
  const url = joinUrl(base, path);

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: any = init?.body;
  if ((init as any)?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify((init as any).json);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    body,
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      `HTTP ${res.status} ${res.statusText} (${path})`;
    throw new Error(msg);
  }
  return data as T;
}

/** ===================== Types ===================== */
export type PurchaseReceiptStatus =
  | "draft"
  | "confirmed"
  | "paid"
  | "completed"
  | "cancelled";

export type PurchaseReceiptLine = {
  loai_hang: "nguyen_lieu"; // đơn nhập NL chủ yếu là nguyen_lieu
  nguyen_lieu_id?: string; // ObjectId string
  ma_nl?: string;
  ten_nl?: string;
  don_vi?: string;
  don_gia: number;
  so_luong: number;
  thanh_tien?: number;
};

export type PurchaseReceipt = {
  _id: string;
  ma_dh: string;
  loai_don: "purchase_receipt";
  trang_thai: PurchaseReceiptStatus;

  created_at?: string;
  updated_at?: string;
  ngay_dat?: string;

  nha_cung_cap_ten?: string;
  nguoi_lap_id?: string;
  nguoi_lap_ten?: string; // FE hiển thị (backend có thể populate hoặc FE tự map)
  ghi_chu?: string;

  tong_tien?: number;
  san_pham: PurchaseReceiptLine[];
};

function oid(v: any) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v?.$oid ?? v?._id ?? v);
  return String(v);
}

function pickName(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object") {
    return String(v?.ho_ten ?? v?.ten ?? v?.name ?? "").trim();
  }
  return "";
}

function normalizeReceipt(doc: any): PurchaseReceipt | null {
  const _id = oid(doc?._id);
  if (!_id) return null;

  //  hỗ trợ cả trường hợp backend trả nguoi_lap_id là object (populate)
  const nguoiLapIdRaw = doc?.nguoi_lap_id;
  const nguoi_lap_id = oid(nguoiLapIdRaw) || undefined;
  const nguoi_lap_ten =
    pickName(nguoiLapIdRaw) || pickName(doc?.nguoi_lap) || undefined;

  const linesRaw = Array.isArray(doc?.san_pham) ? doc.san_pham : [];
  const san_pham: PurchaseReceiptLine[] = linesRaw
    .filter((l: any) => (l?.loai_hang || "nguyen_lieu") === "nguyen_lieu")
    .map((l: any) => ({
      loai_hang: "nguyen_lieu",
      nguyen_lieu_id: oid(l?.nguyen_lieu_id) || undefined,
      ma_nl: s(l?.ma_nl) || undefined,
      ten_nl: s(l?.ten_nl || l?.ten) || undefined,
      don_vi: s(l?.don_vi) || undefined,
      don_gia: n(l?.don_gia ?? l?.gia_nhap, 0),
      so_luong: n(l?.so_luong, 0),
      thanh_tien: n(l?.thanh_tien, 0),
    }))
    .filter(
      (x: any) => (x.nguyen_lieu_id || x.ma_nl || x.ten_nl) && x.so_luong > 0
    );

  return {
    _id,
    ma_dh: s(doc?.ma_dh) || "-",
    loai_don: "purchase_receipt",
    trang_thai: (s(doc?.trang_thai) as PurchaseReceiptStatus) || "draft",

    created_at: doc?.created_at
      ? new Date(doc.created_at).toISOString()
      : undefined,
    updated_at: doc?.updated_at
      ? new Date(doc.updated_at).toISOString()
      : undefined,
    ngay_dat: doc?.ngay_dat ? new Date(doc.ngay_dat).toISOString() : undefined,

    nha_cung_cap_ten: s(doc?.nha_cung_cap_ten) || undefined,
    nguoi_lap_id,
    nguoi_lap_ten,

    ghi_chu: s(doc?.ghi_chu) || undefined,
    tong_tien: n(doc?.tong_tien, 0),

    san_pham,
  };
}

function normalizeList(raw: any): PurchaseReceipt[] {
  const items = raw?.items ?? raw?.data?.items ?? raw?.data ?? raw ?? [];
  const arr = Array.isArray(items) ? items : [];
  return arr.map(normalizeReceipt).filter(Boolean) as PurchaseReceipt[];
}

/** ===================== APIs ===================== */

/**  LIST đơn nhập NL */
export async function fetchPurchaseReceipts(params?: {
  q?: string;
  trang_thai?: "ALL" | PurchaseReceiptStatus;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  qs.set("loai_don", "purchase_receipt");
  qs.set("q", s(params?.q));
  if (params?.trang_thai && params.trang_thai !== "ALL") {
    qs.set("trang_thai", params.trang_thai);
  }
  qs.set("page", String(params?.page ?? 1));
  qs.set("limit", String(params?.limit ?? 20));
  qs.set("sortBy", "created_at");
  qs.set("order", "desc");

  const data = await apiFetch<any>(`/don-hang?${qs.toString()}`, {
    method: "GET",
  });

  return {
    items: normalizeList(data),
    page: Number(data?.page ?? 1),
    limit: Number(data?.limit ?? 20),
    total: Number(data?.total ?? 0),
    totalPages: Number(data?.totalPages ?? 1),
    raw: data,
  };
}

/**  CREATE đơn nhập NL */
export async function createPurchaseReceipt(body: {
  nha_cung_cap_ten: string;
  nguoi_lap_id?: string; // backend tự lấy từ token nếu thiếu
  san_pham: PurchaseReceiptLine[];
  ghi_chu?: string;
  trang_thai?: PurchaseReceiptStatus; // nếu muốn tạo luôn confirmed/paid...
}) {
  const payload = {
    nha_cung_cap_ten: s(body.nha_cung_cap_ten),
    nguoi_lap_id: s(body.nguoi_lap_id) || undefined,
    san_pham: body.san_pham,
    ghi_chu: s(body.ghi_chu) || "",
    trang_thai: body.trang_thai || undefined,
  };

  return apiFetch<any>(`/don-hang/receipts/purchase`, {
    method: "POST",
    json: payload,
  });
}

/**  UPDATE STATUS (QUAN TRỌNG: backend là POST) */
export async function updatePurchaseReceiptStatus(payload: {
  id: string;
  trang_thai: PurchaseReceiptStatus;
}) {
  return apiFetch<any>(`/don-hang/${payload.id}/status`, {
    method: "PATCH",
    json: { trang_thai: payload.trang_thai },
  });
}
