import express from "express";
import BomController from "../controllers/bomControllers.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/* ===================== BOM SẢN PHẨM ===================== */

// set/replace BOM
router.post("/:san_pham_id", verifyToken, BomController.setBOM);

// get BOM
router.get("/:san_pham_id", verifyToken, BomController.getBOM);

// calc unit cost
router.get("/:san_pham_id/unit-cost", verifyToken, BomController.calcUnitCost);

export default router;
