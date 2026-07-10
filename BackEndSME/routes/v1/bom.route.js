// Refactored: 2026-04-02 | Issues fixed: R1, R2 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/bom

import express from "express";
import BomController from "../../controllers/bomControllers.js";
import { verifyToken, verifyAdmin, verifyProductionManager } from "../../middleware/auth.js";

const router = express.Router();

/* ─── BOM SẢN PHẨM ─── */
// unit-cost BEFORE /:san_pham_id to avoid route conflict
router.get("/:san_pham_id/unit-cost", verifyToken, BomController.calcUnitCost);
router.get("/:san_pham_id",           verifyToken, BomController.getBOM);
// setBOM thay đổi cấu trúc sản phẩm → ảnh hưởng đến sản xuất. Gate qua
// verifyProductionManager (Trưởng xưởng + Admin).
router.post("/:san_pham_id",          verifyToken, verifyProductionManager, BomController.setBOM);

export default router;
