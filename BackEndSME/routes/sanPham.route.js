import express from "express";
import SanPhamController from "../controllers/sanPhamControllers.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/* ===================== SẢN PHẨM (Protected) ===================== */

/* CREATE */
router.post("/", verifyToken, SanPhamController.create);

/* READ LIST + SEARCH */
router.get("/", verifyToken, SanPhamController.list);
router.get("/search", verifyToken, SanPhamController.search);

/* GET ALL STOCK */
router.get("/stock", verifyToken, SanPhamController.getAllStock);

/* STATS (đặt TRƯỚC :id để tránh conflict) */
router.get("/stats/summary", verifyToken, SanPhamController.stats);
router.get("/stats/low-stock", verifyToken, SanPhamController.lowStock);

/* STOCK */
router.post("/bulk/adjust-stock", verifyToken, SanPhamController.bulkAdjustStock);
router.post("/:id/adjust-stock", verifyToken, SanPhamController.adjustStock);

/* READ ONE */
router.get("/:id", verifyToken, SanPhamController.getById);

/* UPDATE */
router.patch("/:id", verifyToken, SanPhamController.update);

/* STATUS */
router.post("/:id/status", verifyToken, SanPhamController.setStatus);

/* DELETE / RESTORE */
router.delete("/:id", verifyToken, SanPhamController.softDelete);
router.post("/:id/restore", verifyToken, SanPhamController.restore);

/* HARD DELETE */
router.delete("/:id/hard", verifyToken, SanPhamController.hardDelete);

export default router;
