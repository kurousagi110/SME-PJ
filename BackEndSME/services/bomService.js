// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3 | Phase 3 – Service Layer
// Phase 3 update: setBOM wrapped in MongoDB transaction.
//   Atomically updates bom_san_pham + syncs san_pham.nguyen_lieu.
//   If either write fails the entire operation rolls back.

import BomDAO from "../models/bomDAO.js";
import ApiError from "../utils/ApiError.js";

/**
 * BomService – business logic for Bill of Materials management.
 */
export default class BomService {
  static _daoError(result, fallback, errorCode = "OPERATION_FAILED") {
    if (result?.error) throw ApiError.badRequest(result.error.message || fallback, errorCode);
    return result;
  }

  /* ─── SET BOM (transactional) ─── */
  /**
   * Atomically:
   *   1. Upserts the bom_san_pham document.
   *   2. Syncs san_pham.nguyen_lieu so PROD_RECEIPT inventory logic stays consistent.
   *
   * Both writes share a single MongoDB session. If (2) fails, (1) rolls back.
   *
   * @param {string} san_pham_id
   * @param {Array}  items         [{ nguyen_lieu_id, qty, unit, waste_rate? }]
   * @param {{ ghi_chu, mongoClient }} options
   */
  static async setBOM(san_pham_id, items = [], { ghi_chu = "", mongoClient } = {}) {
    if (!san_pham_id) throw ApiError.badRequest("Thiếu san_pham_id", "VALIDATION_ERROR");
    if (!Array.isArray(items)) throw ApiError.badRequest("items phải là mảng", "VALIDATION_ERROR");

    if (mongoClient?.startSession) {
      const session = mongoClient.startSession();
      try {
        let outcome;
        await session.withTransaction(async () => {
          const result = await BomDAO.setBOM(san_pham_id, items, { ghi_chu, session });
          if (result?.error) throw result.error;   // aborts transaction
          outcome = result;
        });
        return outcome;
      } finally {
        await session.endSession();
      }
    }

    // Fallback: no mongoClient (standalone / test environment)
    const result = await BomDAO.setBOM(san_pham_id, items, { ghi_chu });
    this._daoError(result, "Khai báo BOM thất bại", "BOM_SET_FAILED");
    return result;
  }

  /* ─── GET BOM ─── */
  static async getBOM(san_pham_id) {
    if (!san_pham_id) throw ApiError.badRequest("Thiếu san_pham_id", "VALIDATION_ERROR");
    const doc = await BomDAO.getBOM(san_pham_id);
    if (doc?.error) throw ApiError.notFound(doc.error.message, "BOM_NOT_FOUND");
    return doc;
  }

  /* ─── CALC UNIT COST ─── */
  static async calcUnitCost(san_pham_id) {
    if (!san_pham_id) throw ApiError.badRequest("Thiếu san_pham_id", "VALIDATION_ERROR");
    const result = await BomDAO.calcUnitCost(san_pham_id);
    this._daoError(result, "Tính giá thành thất bại", "CALC_COST_FAILED");
    return result;
  }
}
