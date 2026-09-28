// Refactor 2026-07-09: tách report logic ra file riêng.
// Hiện chỉ có 1 method (thongKeDoanhThu) — file riêng để chuẩn bị cho
// các report mới (lợi nhuận, top-SP, công nợ, ...).

import logger from "../utils/logger.js";
import { state } from "./donHangState.js";
import { STATUS, ORDER_TYPE } from "./donHangConstants.js";

/* ══════════════ Doanh thu (đơn bán đã hoàn thành) ══════════════ */
export async function thongKeDoanhThu({ date_from, date_to } = {}) {
  try {
    const matchSale = { loai_don: ORDER_TYPE.SALE, trang_thai: { $nin: [STATUS.CANCELLED, STATUS.DELETED] } };
    const matchPurchase = { loai_don: ORDER_TYPE.PURCHASE_RECEIPT, trang_thai: { $nin: [STATUS.CANCELLED, STATUS.DELETED] } };
    if (date_from || date_to) {
      const range = {};
      if (date_from) range.$gte = new Date(date_from);
      if (date_to) range.$lte = new Date(date_to);
      matchSale.created_at = range;
      matchPurchase.created_at = range;
    }

    const [[saleAgg], [purchaseAgg]] = await Promise.all([
      state.don_hang
        .aggregate([
          { $match: matchSale },
          {
            $group: {
              _id: null,
              so_don: { $sum: 1 },
              doanh_thu: { $sum: "$tong_tien" },
              thue: { $sum: "$thue_tien" },
              giam_gia: { $sum: "$giam_gia" },
            },
          },
        ])
        .toArray(),
      state.don_hang
        .aggregate([
          { $match: matchPurchase },
          {
            $group: {
              _id: null,
              so_don: { $sum: 1 },
              chi_phi_mua: { $sum: "$tong_tien" },
            },
          },
        ])
        .toArray(),
    ]);

    const doanh_thu = saleAgg?.doanh_thu || 0;
    const chi_phi_mua = purchaseAgg?.chi_phi_mua || 0;
    const loi_nhuan = doanh_thu - chi_phi_mua;
    const ty_suat = doanh_thu > 0 ? ((loi_nhuan / doanh_thu) * 100).toFixed(1) : "0";

    return {
      so_don: saleAgg?.so_don || 0,
      doanh_thu,
      chi_phi_mua,
      loi_nhuan,
      ty_suat,
      thue: saleAgg?.thue || 0,
      giam_gia: saleAgg?.giam_gia || 0,
    };
  } catch (e) {
    logger.error("thongKeDoanhThu error", { error: e.message });
    return { error: e };
  }
}
