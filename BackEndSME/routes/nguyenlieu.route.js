import express from "express";
import NguyenLieuController from "../controllers/nguyenLieuControllers.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/* ===================== NGUYÊN LIỆU ===================== */

router.post("/", verifyToken, NguyenLieuController.create);

router.get("/", verifyToken, NguyenLieuController.list);
router.get("/search", verifyToken, NguyenLieuController.search);

router.get("/stock", verifyToken, NguyenLieuController.getAllStock);


router.get("/stats/summary", verifyToken, NguyenLieuController.stats);
router.get("/stats/low-stock", verifyToken, NguyenLieuController.lowStock);

router.post("/:id/adjust-stock", verifyToken, NguyenLieuController.adjustStock);

router.delete("/:id", verifyToken, NguyenLieuController.softDelete);
router.post("/:id/restore", verifyToken, NguyenLieuController.restore);

router.get("/:id", verifyToken, NguyenLieuController.getById);
router.patch("/:id", verifyToken, NguyenLieuController.update);

export default router;
