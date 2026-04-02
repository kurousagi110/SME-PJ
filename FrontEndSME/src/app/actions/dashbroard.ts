"use server";

import { http } from "@/lib/http";

type OrderType = "sale" | "prod_receipt" | "purchase_receipt" | "ALL";

export type DashboardRow = {
  id: string;
  header: string;   // ma_dh
  type: string;     // label loai_don
  status: string;   // label trang_thai
  target: string;   // tong_tien (format)
  limit: string;    // số dòng hàng
  reviewer: string; // khách hàng / NCC
};

type RawOrder = any;

const VN_TZ = "Asia/Ho_Chi_Minh";

function unwrap<T = any>(raw: any): T {
  return (raw?.data ?? raw) as T;
}

function vnYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildYearRangeVN(year: number) {
  // 2026-01-01 00:00 +07 => UTC 2025-12-31 17:00Z (đúng ý bạn)
  const from = `${year}-01-01T00:00:00.000+07:00`;
  const to = `${year + 1}-01-01T00:00:00.000+07:00`;
  return { from, to };
}

function typeLabel(loai_don: string) {
  if (loai_don === "sale") return "Đơn bán hàng";
  if (loai_don === "prod_receipt") return "Nhập thành phẩm (SX)";
  if (loai_don === "purchase_receipt") return "Nhập mua (NL/SP)";
  return String(loai_don || "-");
}

function statusLabel(st: string) {
  const s = String(st || "").toLowerCase();
  if (s === "completed") return "Done";
  if (s === "cancelled") return "Cancelled";
  if (s === "deleted") return "Deleted";
  // draft/confirmed/paid/shipping => in process
  return "In Process";
}

function money(v: any) {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString("vi-VN");
}

function mapOrderToRow(o: RawOrder): DashboardRow {
  const id = String(o?._id ?? o?.id ?? o?.ma_dh ?? "");
  const ma = String(o?.ma_dh ?? "-");
  const loai = String(o?.loai_don ?? "-");
  const st = String(o?.trang_thai ?? "-");
  const reviewer =
    (o?.khach_hang_ten && String(o.khach_hang_ten)) ||
    (o?.nha_cung_cap_ten && String(o.nha_cung_cap_ten)) ||
    "-";

  const lines = Array.isArray(o?.san_pham) ? o.san_pham.length : 0;

  return {
    id: id || ma,
    header: ma,
    type: typeLabel(loai),
    status: statusLabel(st),
    target: money(o?.tong_tien),
    limit: String(lines),
    reviewer,
  };
}

/** ================= TABLE ================= */
export async function fetchDashboardTable(params: {
  year: number;
  page?: number;
  limit?: number;
  q?: string;
  loai_don?: OrderType;
}) {
  const year = Number(params.year);
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(200, Math.max(1, Number(params.limit ?? 20)));
  const q = String(params.q ?? "").trim();
  const loai_don = (params.loai_don ?? "ALL") as OrderType;

  const { from, to } = buildYearRangeVN(year);

  const qs = new URLSearchParams({
    q,
    page: String(page),
    limit: String(limit),
    date_from: from,
    date_to: to,
    sortBy: "created_at",
    order: "desc",
    ...(loai_don !== "ALL" ? { loai_don } : {}),
  });

  const raw = await http.get("/don-hang/?" + qs.toString());
  const data = unwrap<any>(raw);

  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items: items.map(mapOrderToRow),
    page: Number(data?.page ?? page),
    limit: Number(data?.limit ?? limit),
    total: Number(data?.total ?? items.length),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

/** ================= CHART (đếm số đơn theo ngày) ================= */
function daysToSubtract(timeRange: string) {
  if (timeRange === "7d") return 7;
  if (timeRange === "30d") return 30;
  return 90;
}

function vnIsoStartOfDay(date: Date) {
  const ymd = vnYmd(date);
  return `${ymd}T00:00:00.000+07:00`;
}
function vnIsoEndOfDay(date: Date) {
  const ymd = vnYmd(date);
  return `${ymd}T23:59:59.999+07:00`;
}

async function fetchOrdersForRange(params: {
  loai_don: Exclude<OrderType, "ALL">;
  date_from: string;
  date_to: string;
}) {
  const qs = new URLSearchParams({
    loai_don: params.loai_don,
    date_from: params.date_from,
    date_to: params.date_to,
    page: "1",
    limit: "5000",
    sortBy: "created_at",
    order: "asc",
  });

  const raw = await http.get("/don-hang/?" + qs.toString());
  const data = unwrap<any>(raw);
  return Array.isArray(data?.items) ? data.items : [];
}

function buildContinuousDays(from: Date, to: Date) {
  const out: string[] = [];
  let cur = new Date(from.getTime());
  while (cur.getTime() <= to.getTime()) {
    out.push(vnYmd(cur));
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
  }
  return out;
}

function groupCountByDay(orders: any[]) {
  const m = new Map<string, number>();
  for (const o of orders) {
    const d = o?.created_at ?? o?.ngay_dat ?? o?.updated_at;
    if (!d) continue;
    const key = vnYmd(new Date(d));
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

export async function fetchDashboardChartCompare(params: {
  loai_don: Exclude<OrderType, "ALL">;
  yearA: number;
  yearB?: number | null;
  timeRange: "7d" | "30d" | "90d";
}) {
  const nowVN = vnYmd(new Date()); // YYYY-MM-DD theo VN
  const [, mm, dd] = nowVN.split("-");

  const refA = new Date(`${params.yearA}-${mm}-${dd}T23:59:59.999+07:00`);
  const sub = daysToSubtract(params.timeRange);
  const fromA = new Date(refA.getTime() - sub * 24 * 60 * 60 * 1000);

  const ordersA = await fetchOrdersForRange({
    loai_don: params.loai_don,
    date_from: vnIsoStartOfDay(fromA),
    date_to: vnIsoEndOfDay(refA),
  });
  const mapA = groupCountByDay(ordersA);

  let mapB = new Map<string, number>();
  if (params.yearB && params.yearB !== params.yearA) {
    const refB = new Date(`${params.yearB}-${mm}-${dd}T23:59:59.999+07:00`);
    const fromB = new Date(refB.getTime() - sub * 24 * 60 * 60 * 1000);

    const ordersB = await fetchOrdersForRange({
      loai_don: params.loai_don,
      date_from: vnIsoStartOfDay(fromB),
      date_to: vnIsoEndOfDay(refB),
    });
    mapB = groupCountByDay(ordersB);
  }

  const days = buildContinuousDays(fromA, refA);

  return days.map((ymd) => {
    const mmdd = ymd.slice(5); // MM-DD
    const keyA = `${params.yearA}-${mmdd}`;
    const keyB = params.yearB ? `${params.yearB}-${mmdd}` : null;

    return {
      date: keyA,
      yearA: mapA.get(keyA) ?? 0,
      yearB: keyB ? mapB.get(keyB) ?? 0 : 0,
    };
  });
}
