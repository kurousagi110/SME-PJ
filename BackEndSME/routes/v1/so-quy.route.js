import express from "express";
import SoQuyController from "../../controllers/soQuyController.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

router.use(verifyToken);

/* ─── 1. Thống kê & danh sách ─── */
router.get("/tong-quan", SoQuyController.getTongQuan);
router.get("/cong-no",   SoQuyController.getCongNo);
router.get("/",          SoQuyController.list);
router.get("/:id",       SoQuyController.getById);

/* ─── 2. Tạo phiếu & Hủy phiếu ─── */
router.post(
  "/",
  requireBody("loai_phieu", "so_tien"),
  SoQuyController.create
);

router.put("/:id/huy", SoQuyController.cancel);

export default router;
