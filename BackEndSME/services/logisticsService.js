/**
 * Logistics Provider API Service — Carrier Adapter Pattern (GHN, GHTK, Viettel Post, J&T)
 * Hỗ trợ chế độ `sandbox` (tính cước & tạo mã vận đơn nội bộ) và `live` (gọi API hãng khi có token),
 * kèm chuẩn hóa trạng thái Webhook vận đơn & đối soát COD.
 */

import { getRuntimeSettings } from "../utils/runtimeSettingsStore.js";
import { validateExternalWebhookUrl } from "../utils/securityHelpers.js";

export const CARRIER_STATUS_MAP = {
  // GHN / GHTK / Viettel Post raw status -> SME internal shipping status
  ready_to_pick: "cho_lay_hang",
  picking: "cho_lay_hang",
  picked: "dang_giao",
  storing: "dang_giao",
  transporting: "dang_giao",
  delivering: "dang_giao",
  in_transit: "dang_giao",
  delivered: "da_giao",
  completed: "da_giao",
  delivery_fail: "giao_that_bai",
  waiting_to_return: "hoan_hang",
  return: "hoan_hang",
  returned: "hoan_hang",
  cancel: "da_huy",
  cancelled: "da_huy",
};

export class LogisticsService {
  /**
   * Chuẩn hóa trạng thái webhook từ các hãng vận chuyển về trạng thái vận đơn SME.
   */
  static normalizeWebhookStatus(rawStatus = "") {
    const key = String(rawStatus || "").trim().toLowerCase().replace(/\s+/g, "_");
    return CARRIER_STATUS_MAP[key] || "dang_giao";
  }

  /**
   * Trả về trạng thái cấu hình các adapter vận chuyển.
   */
  static getAdapterStatus() {
    const cfg = getRuntimeSettings()?.integrations || {};
    return {
      mode: String(process.env.LOGISTICS_MODE || cfg.logistics_mode || "sandbox").toLowerCase(),
      default_carrier: cfg.logistics_default_carrier || "GHN",
      carriers: [
        { code: "GHN", name: "Giao Hàng Nhanh", live_ready: Boolean(process.env.GHN_API_TOKEN && process.env.GHN_SHOP_ID) },
        { code: "GHTK", name: "Giao Hàng Tiết Kiệm", live_ready: Boolean(process.env.GHTK_API_TOKEN) },
        { code: "VIETTELPOST", name: "Viettel Post", live_ready: Boolean(process.env.VTP_API_TOKEN) },
        { code: "JTEXPRESS", name: "J&T Express", live_ready: Boolean(process.env.JT_API_TOKEN) },
      ],
    };
  }

  /**
   * Tính toán phí vận chuyển ước tính dựa trên khoảng cách / khối lượng
   */
  static calculateShippingFee({
    carrier = "ghn",
    weightGram = 1000,
    fromProvince = "Hà Nội",
    toProvince = "Hồ Chí Minh",
    isCOD = false,
    codAmount = 0,
  }) {
    let baseRate = 25000;
    const isInterRegion = fromProvince.trim().toLowerCase() !== toProvince.trim().toLowerCase();

    if (isInterRegion) {
      baseRate += 15000;
    }

    if (weightGram > 1000) {
      const extraKg = Math.ceil((weightGram - 1000) / 500);
      baseRate += extraKg * 5000;
    }

    const carrierMultipliers = {
      ghn: 1.0,
      ghtk: 0.95,
      viettelpost: 1.05,
      jtexpress: 0.9,
    };

    const multiplier = carrierMultipliers[String(carrier).toLowerCase()] || 1.0;
    const estimatedFee = Math.round((baseRate * multiplier) / 1000) * 1000;
    const codFee = isCOD && codAmount > 1000000 ? Math.round(codAmount * 0.005) : 0;

    return {
      carrier: String(carrier).toUpperCase(),
      weightGram,
      estimatedFee,
      codFee,
      totalFee: estimatedFee + codFee,
      estimatedDeliveryDays: isInterRegion ? "2 - 3 ngày" : "24 giờ",
    };
  }

  /**
   * Xây dựng payload đẩy đơn chuẩn hóa cho từng hãng vận chuyển.
   */
  static buildCarrierPayload(carrier = "GHN", params = {}) {
    const code = String(carrier || "GHN").toUpperCase();
    if (code === "GHN") {
      return {
        to_name: params.receiverName || "",
        to_phone: params.receiverPhone || "",
        to_address: params.receiverAddress || "",
        cod_amount: Math.max(0, Number(params.codAmount || 0)),
        weight: Math.max(100, Number(params.weightGram || 1000)),
        client_order_code: params.orderCode || "",
        note: params.note || "",
        payment_type_id: 2,
        required_note: "CHOXEMHANGKHONGTHU",
      };
    }
    return {
      order: {
        id: params.orderCode || "",
        name: params.receiverName || "",
        tel: params.receiverPhone || "",
        address: params.receiverAddress || "",
        pick_money: Math.max(0, Number(params.codAmount || 0)),
        weight: Math.max(0.1, Number(params.weightGram || 1000) / 1000),
        note: params.note || "",
      },
    };
  }

  /**
   * Tạo vận đơn qua API thật (nếu bật live + có endpoint/token) hoặc chế độ sandbox nội bộ.
   */
  static async pushOrderToCarrier({
    carrier = "GHN",
    orderCode,
    receiverName,
    receiverPhone,
    receiverAddress,
    weightGram = 1000,
    codAmount = 0,
    note = "",
  }) {
    const normalizedCarrier = String(carrier || "GHN").toUpperCase();
    const status = this.getAdapterStatus();

    if (status.mode === "live" && normalizedCarrier === "GHN" && process.env.GHN_API_URL && process.env.GHN_API_TOKEN) {
      const check = validateExternalWebhookUrl(process.env.GHN_API_URL);
      if (check.valid) {
        const body = this.buildCarrierPayload("GHN", {
          orderCode,
          receiverName,
          receiverPhone,
          receiverAddress,
          weightGram,
          codAmount,
          note,
        });
        const resp = await fetch(process.env.GHN_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Token: process.env.GHN_API_TOKEN,
            ...(process.env.GHN_SHOP_ID ? { ShopId: process.env.GHN_SHOP_ID } : {}),
          },
          body: JSON.stringify(body),
        });
        if (resp.ok) {
          const json = await resp.json();
          const remoteCode = json?.data?.order_code || `GHN-${orderCode}`;
          return {
            success: true,
            mode: "live",
            carrier: "GHN",
            trackingCode: remoteCode,
            trackingUrl: `https://donhang.ghn.vn/?order_code=${remoteCode}`,
            status: "ready_to_pick",
            orderCode,
            codAmount,
            weightGram,
            createdAt: new Date(),
          };
        }
      }
    }

    const prefixes = {
      GHN: "GHN",
      GHTK: "SME.TK.",
      VIETTELPOST: "VT",
      JTEXPRESS: "JT",
    };

    const prefix = prefixes[normalizedCarrier] || "WB";
    const randCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const trackingCode = `${prefix}${Date.now().toString().slice(-6)}${randCode}`;

    return {
      success: true,
      mode: "sandbox",
      carrier: normalizedCarrier,
      trackingCode,
      trackingUrl: `https://tracking.carrier.vn/${trackingCode}`,
      status: "ready_to_pick",
      orderCode,
      codAmount,
      weightGram,
      createdAt: new Date(),
    };
  }
}
