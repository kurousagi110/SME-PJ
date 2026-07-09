// Phase 5 (2026-07-09): wire SanXuatService vào HTTP layer.
// Pattern y hệt routes/v1/san-pham.route.js:
//   - verifyToken (auth) chạy trước
//   - verifyProductionManager (role) chỉ cho Trưởng xưởng + Admin tạo lệnh SX
//   - requireBody đảm bảo field bắt buộc có mặt trước khi vào controller

import express from "express";
import SanXuatController from "../../controllers/sanXuatController.js";
import { verifyToken, verifyProductionManager } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CREATE (tạo lệnh sản xuất) ─── */
router.post(
  "/",
  verifyToken,
  verifyProductionManager,
  requireBody("san_pham_id", "so_luong_sx"),
  SanXuatController.produce
);

/* ─── READ (lịch sử lô sản xuất) ─── */
router.get("/logs", verifyToken, SanXuatController.getLogs);

export default router;