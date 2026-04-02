"use server";

import { http } from "@/lib/http";
import { fetchMaterialsStock } from "@/app/actions/material-stock";

function extractErrorMessage(err: any) {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.data?.message ||
    err?.message;

  if (typeof msg === "string" && msg.trim()) return msg;

  try {
    return JSON.stringify(err?.response?.data ?? err);
  } catch {
    return "API error";
  }
}

const s = (v: any) => String(v ?? "").trim();
const n = (v: any, def = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
};

function mongoId(x: any) {
  // hỗ trợ _id: "..." hoặc _id: { $oid: "..." }
  const raw = x?._id;
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw.$oid) return String(raw.$oid);
  return String(raw);
}

type StockItemLite = {
  id: string;
  ma_nl: string;
  ten_nl?: string;
  so_luong: number;
  don_vi?: string;
};

export type ApproveStockPayload = {
  sp_id: string;
  so_luong_sp: number;
  needs: Array<{
    ma_nl: string;
    so_luong_can: number;
  }>;
};

/**
 * DUYỆT ĐƠN = TRỪ NL + CỘNG SP
 * - Trừ NL: POST /nguyen-lieu/:id/adjust-stock { deltaQty: -x }
 * - Cộng SP: POST /san-pham/:id/adjust-stock { delta: +qty }
 */
export async function approveProductionOrderApplyStock(
  payload: ApproveStockPayload
) {
  try {
    const sp_id = s(payload?.sp_id);
    const so_luong_sp = n(payload?.so_luong_sp, 0);
    const needs = Array.isArray(payload?.needs) ? payload.needs : [];

    if (!sp_id) throw new Error("Thiếu sp_id (id sản phẩm)");
    if (so_luong_sp <= 0) throw new Error("Số lượng sản xuất không hợp lệ");

    // 1) load stock NL (đẩy limit cao)
    const stockRaw = await fetchMaterialsStock({ q: "", page: 1, limit: 5000 });
    const root = (stockRaw as any)?.data ?? stockRaw;

    const items =
      root?.items ??
      root?.data?.items ??
      root?.data ??
      (Array.isArray(root) ? root : []);

    const list = Array.isArray(items) ? items : [];

    const mapByMa = new Map<string, StockItemLite>();
    for (const x of list) {
      const ma_nl = s(x?.ma_nl);
      const id = mongoId(x);
      if (!ma_nl || !id) continue;

      mapByMa.set(ma_nl, {
        id,
        ma_nl,
        ten_nl: s(x?.ten_nl) || undefined,
        so_luong: n(x?.so_luong, 0),
        don_vi: s(x?.don_vi) || undefined,
      });
    }

    // helper: nếu không có trong list lớn thì fallback search theo q=ma_nl
    const findMaterialByMa = async (
      ma: string
    ): Promise<StockItemLite | null> => {
      const cached = mapByMa.get(ma);
      if (cached) return cached;

      const raw = await fetchMaterialsStock({ q: ma, page: 1, limit: 20 });
      const rr = (raw as any)?.data ?? raw;
      const ii =
        rr?.items ??
        rr?.data?.items ??
        rr?.data ??
        (Array.isArray(rr) ? rr : []);

      const arr = Array.isArray(ii) ? ii : [];
      const first = arr.find((z) => s(z?.ma_nl) === ma) ?? arr[0];
      if (!first) return null;

      const id = mongoId(first);
      if (!id) return null;

      const it: StockItemLite = {
        id,
        ma_nl: ma,
        ten_nl: s(first?.ten_nl) || undefined,
        so_luong: n(first?.so_luong, 0),
        don_vi: s(first?.don_vi) || undefined,
      };
      mapByMa.set(ma, it);
      return it;
    };

    // 2) validate đủ tồn kho trước
    const thieu: Array<{
      ma_nl: string;
      ten_nl?: string;
      ton: number;
      can: number;
    }> = [];

    // build toAdjust để log rõ
    const toAdjust: Array<{ ma_nl: string; can: number; item: StockItemLite }> =
      [];

    for (const x of needs) {
      const ma = s(x?.ma_nl);
      const can = n(x?.so_luong_can, 0);

      if (!ma || can <= 0) continue;

      const it = await findMaterialByMa(ma);
      if (!it) throw new Error(`Không tìm thấy nguyên liệu trong kho: ${ma}`);

      if (it.so_luong < can) {
        thieu.push({ ma_nl: ma, ten_nl: it.ten_nl, ton: it.so_luong, can });
      } else {
        toAdjust.push({ ma_nl: ma, can, item: it });
      }
    }

    if (thieu.length) {
      const msg = thieu
        .map(
          (x) =>
            `${x.ten_nl ? x.ten_nl + " " : ""}(${x.ma_nl}) tồn=${x.ton} < cần=${
              x.can
            }`
        )
        .join(" | ");
      throw new Error("Không đủ tồn kho: " + msg);
    }

    // 3) trừ kho NL (có rollback)
    const adjusted: Array<{ id: string; ma_nl: string; qty: number }> = [];

    for (const a of toAdjust) {
      const { item, can, ma_nl } = a;

      console.log(" ADJUST NL", {
        ma_nl,
        id: item.id,
        ton_truoc: item.so_luong,
        can,
        deltaQty: -can,
      });

      try {
        await http.post(`/nguyen-lieu/${item.id}/adjust-stock`, {
          deltaQty: -can,
          allowNegative: false,
        });
        adjusted.push({ id: item.id, ma_nl, qty: can });
      } catch (e: any) {
        // báo lỗi chi tiết để debug
        throw new Error(
          `Trừ kho NL thất bại: ${ma_nl} (id=${item.id}) cần=${can} tồn=${item.so_luong}. ` +
            extractErrorMessage(e)
        );
      }
    }

    // 4) cộng kho SP (có rollback NL nếu fail)
    try {
      await http.post(`/san-pham/${sp_id}/adjust-stock`, {
        delta: so_luong_sp,
        deltaQty: so_luong_sp, // fallback
        allowNegative: false,
      });
    } catch (e: any) {
      // rollback NL best-effort
      for (const a of adjusted) {
        try {
          await http.post(`/nguyen-lieu/${a.id}/adjust-stock`, {
            deltaQty: +a.qty,
            allowNegative: true,
          });
        } catch {}
      }
      throw new Error("Cộng kho sản phẩm thất bại: " + extractErrorMessage(e));
    }

    return { ok: true };
  } catch (err: any) {
    throw new Error(extractErrorMessage(err));
  }
}
