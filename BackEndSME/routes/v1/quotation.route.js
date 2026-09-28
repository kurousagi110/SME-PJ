import express from "express";
import QuotationController from "../../controllers/quotationController.js";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

router.use(verifyToken);

/* ─── 1. Danh sách & Chi tiết ─── */
router.get("/", QuotationController.list);
router.get("/:ma_bao_gia", QuotationController.getByCode);

/* ─── 2. Tạo báo giá ─── */
router.post(
  "/",
  requireBody("khach_hang", "items"),
  QuotationController.create
);

/* ─── 3. Cập nhật trạng thái ─── */
router.put(
  "/:ma_bao_gia/status",
  requireBody("trang_thai"),
  QuotationController.updateStatus
);
router.patch(
  "/:ma_bao_gia/status",
  requireBody("trang_thai"),
  QuotationController.updateStatus
);

/* ─── 4. Chuyển đổi thành Đơn Hàng 1-click ─── */
router.post(
  "/:ma_bao_gia/convert-to-order",
  QuotationController.convertToOrder
);

/* ─── 5. Xóa báo giá ─── */
router.delete("/:ma_bao_gia", verifyAdmin, QuotationController.delete);

export default router;
