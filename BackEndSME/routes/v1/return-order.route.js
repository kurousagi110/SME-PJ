import express from "express";
import ReturnOrderController from "../../controllers/returnOrderController.js";
import { verifyToken, verifyApprover } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

router.use(verifyToken);

/* ─── 1. Danh sách & Chi tiết RMA ─── */
router.get("/", ReturnOrderController.list);
router.get("/:ma_rma", ReturnOrderController.getByCode);

/* ─── 2. Tạo yêu cầu đổi trả (Nhân viên CSKH / Sales / Admin) ─── */
router.post(
  "/",
  requireBody("ma_dh", "san_pham"),
  ReturnOrderController.create
);

/* ─── 3. QC kiểm tra hàng & Hoàn tất (Thủ kho / QC / Approver) ─── */
router.post(
  "/:ma_rma/qc-complete",
  verifyApprover,
  ReturnOrderController.processQC
);

export default router;
