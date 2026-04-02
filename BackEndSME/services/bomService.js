// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3 | Phase 3 – Service Layer

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

  /* ─── SET BOM ─── */
  static async setBOM(san_pham_id, items = [], { ghi_chu = "" } = {}) {
    if (!san_pham_id) throw ApiError.badRequest("Thiếu san_pham_id", "VALIDATION_ERROR");
    if (!Array.isArray(items)) throw ApiError.badRequest("items phải là mảng", "VALIDATION_ERROR");
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
