// src/lib/production-orders.store.ts

export type Status = "PENDING" | "APPROVED" | "REJECTED";

export type NeedItem = {
  nguyen_lieu_id: string;
  ma_nl: string;
  ten_nl: string;
  don_vi: string;

  dinh_muc_cho_1sp: number;
  so_luong_can: number;
};

export type ProductionOrder = {
  _id: string;

  ma_don: string;
  ngay_lap: string;

  sp_id: string;
  sp_ma: string;
  sp_ten: string;
  sp_don_vi?: string;
  so_luong: number;

  trang_thai: Status;

  nguoi_lap?: string;
  nguoi_lap_id?: string;

  duyet_boi?: string;
  duyet_luc?: string;
  ly_do_tu_choi?: string;

  ghi_chu?: string;
  needs: NeedItem[];
};

const KEY = "sme_production_orders_v1";

const s = (v: any) => String(v ?? "").trim();
const n = (v: any, def = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
};

//  normalize để không lỗi nếu LocalStorage còn data cũ
function normalizeNeedItem(raw: any): NeedItem {
  const ma_nl = s(raw?.ma_nl || raw?.nguyen_lieu_id || raw?.nl_id || raw?._id);
  return {
    nguyen_lieu_id: ma_nl,
    ma_nl,
    ten_nl: s(raw?.ten_nl || raw?.ten || raw?.name || `#${ma_nl}`),
    don_vi: s(raw?.don_vi || raw?.unit || "-"),
    dinh_muc_cho_1sp: n(raw?.dinh_muc_cho_1sp ?? raw?.so_luong ?? 0, 0),
    so_luong_can: n(raw?.so_luong_can ?? 0, 0),
  };
}

function normalizeOrder(raw: any): ProductionOrder | null {
  const _id = s(raw?._id);
  if (!_id) return null;

  const needsRaw = Array.isArray(raw?.needs) ? raw.needs : [];

  return {
    _id,
    ma_don: s(raw?.ma_don),
    ngay_lap: s(raw?.ngay_lap),

    sp_id: s(raw?.sp_id),
    sp_ma: s(raw?.sp_ma),
    sp_ten: s(raw?.sp_ten),
    sp_don_vi: s(raw?.sp_don_vi) || undefined,
    so_luong: n(raw?.so_luong, 0),

    trang_thai: (raw?.trang_thai as Status) || "PENDING",

    nguoi_lap: s(raw?.nguoi_lap) || undefined,
    nguoi_lap_id: s(raw?.nguoi_lap_id) || undefined,

    duyet_boi: s(raw?.duyet_boi) || undefined,
    duyet_luc: s(raw?.duyet_luc) || undefined,
    ly_do_tu_choi: s(raw?.ly_do_tu_choi) || undefined,

    ghi_chu: s(raw?.ghi_chu) || undefined,
    needs: needsRaw.map(normalizeNeedItem),
  };
}

function safeParse(sv: string | null): ProductionOrder[] {
  if (!sv) return [];
  try {
    const arr = JSON.parse(sv);
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeOrder).filter(Boolean) as ProductionOrder[];
  } catch {
    return [];
  }
}

export function poList(): ProductionOrder[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(KEY));
}

export function poSave(list: ProductionOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function poCreate(input: Omit<ProductionOrder, "_id">) {
  const order: ProductionOrder = {
    ...input,
    _id: `po_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    needs: Array.isArray(input.needs) ? input.needs : [],
  };

  const list = poList();
  list.unshift(order);
  poSave(list);
  return order;
}

export function poApprove(id: string, approverName: string) {
  const list = poList();
  const nowIso = new Date().toISOString();
  const next = list.map((x) =>
    x._id === id
      ? {
          ...x,
          trang_thai: "APPROVED" as const,
          duyet_boi: approverName,
          duyet_luc: nowIso,
          ly_do_tu_choi: undefined,
        }
      : x
  );
  poSave(next);
  return next.find((x) => x._id === id) ?? null;
}

export function poReject(id: string, approverName: string, reason: string) {
  const list = poList();
  const nowIso = new Date().toISOString();
  const next = list.map((x) =>
    x._id === id
      ? {
          ...x,
          trang_thai: "REJECTED" as const,
          duyet_boi: approverName,
          duyet_luc: nowIso,
          ly_do_tu_choi: reason,
        }
      : x
  );
  poSave(next);
  return next.find((x) => x._id === id) ?? null;
}
