// Refactor 2026-07-09: tách status transitions + delete/restore ra file riêng.
// - capNhatTrangThaiVaTonKho: workflow transitions + apply inventory (gọi sang donHangInventory)
// - soft/restore/hard delete
//
// Lưu ý: inventory application ĐƯỢC gọi từ đây (donHangStatus) chứ không phải từ service.
// Đây là design gốc của donHangDAO — đảm bảo transition + inventory cùng atomic.

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { state } from "./donHangState.js";
import { STATUS, ORDER_TYPE, toObjectId } from "./donHangConstants.js";
import { getAllowedTransitions, ensureOrderType } from "./donHangHelpers.js";
import { applyInventoryOnCompleted } from "./donHangInventory.js";

/* ══════════════ Status transition + inventory ══════════════ */
export async function capNhatTrangThaiVaTonKho(id, trang_thai_moi, { session, nguoi_thao_tac_id } = {}) {
  if (!Object.values(STATUS).includes(trang_thai_moi)) {
    return { error: new Error("Trạng thái không hợp lệ") };
  }

  const _id = new ObjectId(id);
  const doc = await state.don_hang.findOne({ _id }, { session });
  if (!doc) return { error: new Error("Không tìm thấy chứng từ") };

  if (doc.trang_thai === STATUS.DELETED) {
    return { error: new Error("Chứng từ đã xóa, không thể cập nhật") };
  }

  const transitions = getAllowedTransitions(doc.loai_don);
  const allowed = transitions[doc.trang_thai] || [];
  if (!allowed.includes(trang_thai_moi)) {
    return { error: new Error(`Không thể chuyển từ '${doc.trang_thai}' sang '${trang_thai_moi}'`) };
  }

  // PURCHASE_RECEIPT: cộng kho ngay khi "confirmed" (duyệt nhập hàng).
  // SALE / PROD_RECEIPT: vẫn xử lý kho khi "completed" như cũ.
  // Double-count guard: nếu PURCHASE_RECEIPT đã qua confirmed/paid → bỏ qua lần completed.
  const isPurchase = doc.loai_don === ORDER_TYPE.PURCHASE_RECEIPT;
  const purchaseAlreadyApplied =
    isPurchase &&
    trang_thai_moi === STATUS.COMPLETED &&
    [STATUS.CONFIRMED, STATUS.PAID].includes(doc.trang_thai);

  const shouldApplyInventory =
    !purchaseAlreadyApplied &&
    (trang_thai_moi === STATUS.COMPLETED ||
      (trang_thai_moi === STATUS.CONFIRMED && isPurchase));

  const now = new Date();
  const log = {
    hanh_dong: "status",
    from: doc.trang_thai,
    to: trang_thai_moi,
    at: now,
    by: toObjectId(nguoi_thao_tac_id) || doc.nguoi_lap_id,
  };

  // Optimistic lock TRƯỚC — chỉ request thắng lock mới được apply inventory.
  // Đặt status update trước inventory để tránh double-deduction khi 2 request
  // cùng đọc trạng thái cũ rồi cùng trừ kho trước khi lock chạy.
  const res = await state.don_hang.updateOne(
    { _id, trang_thai: doc.trang_thai },
    {
      $set: { trang_thai: trang_thai_moi, updated_at: now },
      $push: { lich_su: log },
    },
    { session }
  );

  if (res.modifiedCount === 0) {
    return { error: new Error("Chứng từ vừa được cập nhật bởi người khác, vui lòng thử lại") };
  }

  // Apply inventory sau khi đã giữ được lock.
  // Nếu inventory thất bại → revert status về trạng thái cũ để có thể retry.
  if (shouldApplyInventory) {
    try {
      await applyInventoryOnCompleted(doc, { session });
    } catch (invErr) {
      await state.don_hang.updateOne(
        { _id, trang_thai: trang_thai_moi },
        { $set: { trang_thai: doc.trang_thai, updated_at: new Date() } },
        { session }
      );
      return { error: invErr };
    }
  }

  return { modifiedCount: res.modifiedCount };
}

/* ══════════════ Delete / Restore ══════════════ */
export async function softDeleteDonHang(id, { session } = {}) {
  const res = await state.don_hang.updateOne(
    { _id: new ObjectId(id) },
    { $set: { trang_thai: STATUS.DELETED, updated_at: new Date() } },
    { session }
  );
  return { modifiedCount: res.modifiedCount };
}

export async function restoreDonHang(id, { session } = {}) {
  const res = await state.don_hang.updateOne(
    { _id: new ObjectId(id), trang_thai: STATUS.DELETED },
    { $set: { trang_thai: STATUS.DRAFT, updated_at: new Date() } },
    { session }
  );
  return { modifiedCount: res.modifiedCount };
}

export async function hardDeleteDonHang(id) {
  try {
    const res = await state.don_hang.deleteOne({ _id: new ObjectId(id) });
    return { deletedCount: res.deletedCount };
  } catch (e) {
    logger.error("hardDeleteDonHang error", { error: e.message });
    return { error: e };
  }
}
