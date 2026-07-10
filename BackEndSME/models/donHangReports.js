// Refactor 2026-07-09: tách report logic ra file riêng.
// Hiện chỉ có 1 method (thongKeDoanhThu) — file riêng để chuẩn bị cho
// các report mới (lợi nhuận, top-SP, công nợ, ...).

import logger from "../utils/logger.js";
import { state } from "./donHangState.js";
import { STATUS, ORDER_TYPE } from "./donHangConstants.js";

/* ══════════════ Doanh thu (đơn bán đã hoàn thành) ══════════════ */
export async function thongKeDoanhThu({ date_from, date_to } = {}) {
  try {
    const match = { loai_don: ORDER_TYPE.SALE, trang_thai: STATUS.COMPLETED };
    if (date_from || date_to) {
      match.created_at = {};
      if (date_from) match.created_at.$gte = new Date(date_from);
      if (date_to) match.created_at.$lte = new Date(date_to);
    }

    const [agg] = await state.don_hang
      .aggregate([
        { $match: match },
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
      .toArray();

    return {
      so_don: agg?.so_don || 0,
      doanh_thu: agg?.doanh_thu || 0,
      thue: agg?.thue || 0,
      giam_gia: agg?.giam_gia || 0,
    };
  } catch (e) {
    logger.error("thongKeDoanhThu error", { error: e.message });
    return { error: e };
  }
}
