import express from "express";
import VanChuyenController from "../../controllers/vanChuyenController.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

router.use(verifyToken);

router.get("/tong-quan", VanChuyenController.getTongQuan);
router.get("/", VanChuyenController.list);
router.get("/:id", VanChuyenController.getById);

router.post(
  "/",
  requireBody("ma_don_hang", "don_vi_van_chuyen"),
  VanChuyenController.create
);

router.put(
  "/:id/trang-thai",
  requireBody("trang_thai"),
  VanChuyenController.updateStatus
);

export default router;
