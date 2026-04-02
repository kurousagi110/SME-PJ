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
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    (process.env.HOST_NAME && process.env.PORT
      ? `${process.env.HOST_NAME}:${process.env.PORT}`
      : "");

  if (!base) {
    throw new Error(
      "Thiếu API base. Hãy set NEXT_PUBLIC_API_URL hoặc HOST_NAME + PORT trong .env của FrontEnd"
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
export type ProdReceiptStatus =
  | "draft"
  | "confirmed"
  | "completed"
  | "cancelled";

export type ProductionReceiptLine = {
  loai_hang: "san_pham";
  san_pham_id: string; // ObjectId string
  ma_sp: string;
  ten_sp: string;
  don_vi: string;
  don_gia: number;
  so_luong: number;
};

export type ProductionReceipt = {
  _id: string;
  ma_dh: string;
  loai_don: "prod_receipt";
  trang_thai: ProdReceiptStatus;

  created_at?: string;
  updated_at?: string;
  ngay_dat?: string;

  nguoi_lap_id?: string;

  nguoi_lap_ten?: string;

  ghi_chu?: string;

  san_pham: ProductionReceiptLine[];
};

export type ProductionNeedItem = {
  nguyen_lieu_id: string;
  ma_nl?: string | null;
  ten_nl?: string | null;
  don_vi?: string | null;

  so_luong_can: number;
  ton_kho: number;

  ton_toi_thieu?: number;
  status?: string;
};

function oid(v: any) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v?.$oid ?? v?._id ?? v);
  return String(v);
}

function pickHoTenDeep(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return pickHoTenDeep(v[0]);
  if (typeof v === "object") {
    // ưu tiên ho_ten
    if (v.ho_ten != null) return String(v.ho_ten).trim();

    // fallback theo các key hay gặp
    const direct =
      v.ten ??
      v.name ??
      v.full_name ??
      v.fullName ??
      v.title ??
      v.label ??
      v.value;
    if (direct != null) return String(direct).trim();

    // drill down
    if (v.data) return pickHoTenDeep(v.data);
    if (v.user) return pickHoTenDeep(v.user);
    if (v.item) return pickHoTenDeep(v.item);
    if (v.profile) return pickHoTenDeep(v.profile);

    return "";
  }
  return String(v).trim();
}

function normalizeReceipt(doc: any): ProductionReceipt | null {
  const _id = oid(doc?._id);
  if (!_id) return null;

  const linesRaw = Array.isArray(doc?.san_pham) ? doc.san_pham : [];
  const san_pham: ProductionReceiptLine[] = linesRaw
    .filter((l: any) => (l?.loai_hang || "san_pham") === "san_pham")
    .map((l: any) => {
      const spId = oid(l?.san_pham_id);
      return {
        loai_hang: "san_pham",
        san_pham_id: spId,
        ma_sp: s(l?.ma_sp) || "-",
        ten_sp: s(l?.ten_sp) || "-",
        don_vi: s(l?.don_vi) || "cái",
        don_gia: n(l?.don_gia, 0),
        so_luong: n(l?.so_luong, 0),
      };
    })
    // chỉ cần có id là đủ (tránh rớt data vì thiếu ma_sp/ten_sp)
    .filter((x: any) => x.san_pham_id && x.so_luong >= 0);

  const nguoi_lap_ten =
    s(doc?.nguoi_lap_ten) ||
    pickHoTenDeep(doc?.nguoi_lap) ||
    pickHoTenDeep(doc?.nguoi_lap_info) ||
    pickHoTenDeep(doc?.nguoi_lap_user) ||
    pickHoTenDeep(doc?.created_by) ||
    "";

  return {
    _id,
    ma_dh: s(doc?.ma_dh) || "-",
    loai_don: "prod_receipt",
    trang_thai: (s(doc?.trang_thai) as ProdReceiptStatus) || "draft",

    created_at: doc?.created_at
      ? new Date(doc.created_at).toISOString()
      : undefined,
    updated_at: doc?.updated_at
      ? new Date(doc.updated_at).toISOString()
      : undefined,
    ngay_dat: doc?.ngay_dat ? new Date(doc.ngay_dat).toISOString() : undefined,

    nguoi_lap_id: oid(doc?.nguoi_lap_id) || undefined,
    nguoi_lap_ten: nguoi_lap_ten || undefined,

    ghi_chu: s(doc?.ghi_chu) || undefined,

    san_pham,
  };
}

function normalizeList(raw: any): ProductionReceipt[] {
  const items = raw?.items ?? raw?.data?.items ?? raw?.data ?? raw ?? [];
  const arr = Array.isArray(items) ? items : [];
  return arr.map(normalizeReceipt).filter(Boolean) as ProductionReceipt[];
}

/** ===================== APIs ===================== */

/**
 * GET /don-hang?loai_don=prod_receipt...
 */
export async function fetchProductionReceipts(params?: {
  q?: string;
  trang_thai?: "ALL" | ProdReceiptStatus;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  qs.set("loai_don", "prod_receipt");
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

/**  CREATE đơn nhập SX */
export async function createProductionReceipt(body: {
  nguoi_lap_id?: string;
  san_pham: ProductionReceiptLine[];
  ghi_chu?: string;
}) {
  // backend sẽ tự set nguoi_lap_id từ token nếu thiếu
  const payload = {
    nguoi_lap_id: s(body.nguoi_lap_id) || undefined,
    san_pham: body.san_pham,
    ghi_chu: s(body.ghi_chu) || "",
  };

  return apiFetch<any>(`/don-hang/receipts/production`, {
    method: "POST",
    json: payload,
  });
}

/**
 *  Update status
 * - draft -> confirmed
 * - confirmed -> completed
 */
export async function updateProductionReceiptStatus(payload: {
  id: string;
  trang_thai: ProdReceiptStatus;
}) {
  return apiFetch<any>(`/don-hang/${payload.id}/status`, {
    method: "POST",
    json: { trang_thai: payload.trang_thai },
  });
}

/**  NL cần + tồn kho */
export async function fetchProductionNeeds(id: string) {
  const data = await apiFetch<any>(
    `/don-hang/receipts/production/${id}/needs`,
    {
      method: "GET",
    }
  );

  const items = Array.isArray(data?.items) ? data.items : [];
  const normalized: ProductionNeedItem[] = items.map((x: any) => ({
    nguyen_lieu_id: oid(x?.nguyen_lieu_id),
    ma_nl: x?.ma_nl ?? null,
    ten_nl: x?.ten_nl ?? null,
    don_vi: x?.don_vi ?? null,
    so_luong_can: n(x?.so_luong_can, 0),
    ton_kho: n(x?.ton_kho, 0),
    ton_toi_thieu: n(x?.ton_toi_thieu, 0),
    status: s(x?.status) || undefined,
  }));

  return { items: normalized };
}
