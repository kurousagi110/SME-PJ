import express from "express";
import DieuChinhKhoController from "../../controllers/dieuChinhKhoController.js";
import { verifyToken, verifyApprover } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CREATE — any authenticated staff ─── */
router.post(
  "/",
  verifyToken,
  requireBody("loai", "item_id", "ma_hang", "ten_hang", "so_luong_dieu_chinh", "ton_kho_truoc", "ly_do"),
  DieuChinhKhoController.create
);

/* ─── READ ─── */
router.get("/",    verifyToken, DieuChinhKhoController.list);
router.get("/:id", verifyToken, DieuChinhKhoController.getById);

/* ─── APPROVE / REJECT — senior roles only ─── */
router.patch("/:id/approve", verifyToken, verifyApprover, DieuChinhKhoController.approve);
router.patch("/:id/reject",  verifyToken, verifyApprover, DieuChinhKhoController.reject);

export default router;
