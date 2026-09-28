import express from "express";
import SoQuyController from "../../controllers/soQuyController.js";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";
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

router.put("/:id/huy", verifyAdmin, SoQuyController.cancel);

/* ─── 3. Quản lý kỳ kế toán & Chốt sổ ─── */
router.get("/ky-ke-toan", SoQuyController.listPeriods);
router.post("/ky-ke-toan/chot-so", verifyAdmin, requireBody("ky", "tu_ngay", "den_ngay"), SoQuyController.closePeriod);
router.post("/ky-ke-toan/:ky/mo-khoa", verifyAdmin, SoQuyController.reopenPeriod);

export default router;
