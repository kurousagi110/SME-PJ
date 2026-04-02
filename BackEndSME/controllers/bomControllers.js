// Refactored: 2026-04-02 | Issues fixed: C1, C3, C4 | Original: bomControllers.js
// Phase 3 update: setBOM passes mongoClient so BomService can use a transaction

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import BomService from "../services/bomService.js";

export default class BomController {
  /* ─── SET BOM ─── */
  static setBOM = asyncHandler(async (req, res) => {
    const { san_pham_id } = req.params;
    const { items = [], ghi_chu = "" } = req.body || {};
    const mongoClient = req.app?.locals?.mongoClient;
    const data = await BomService.setBOM(san_pham_id, items, { ghi_chu, mongoClient });
    return sendSuccess(res, data, "Khai báo BOM thành công");
  });

  /* ─── GET BOM ─── */
  static getBOM = asyncHandler(async (req, res) => {
    const { san_pham_id } = req.params;
    const doc = await BomService.getBOM(san_pham_id);
    return sendSuccess(res, doc, "Lấy BOM thành công");
  });

  /* ─── CALC UNIT COST ─── */
  static calcUnitCost = asyncHandler(async (req, res) => {
    const { san_pham_id } = req.params;
    const data = await BomService.calcUnitCost(san_pham_id);
    return sendSuccess(res, data, "Tính giá thành thành công");
  });
}
