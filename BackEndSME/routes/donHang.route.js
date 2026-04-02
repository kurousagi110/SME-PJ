import express from "express";
import DonHangController from "../controllers/donHangControllers.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/* ===================== 3 LOẠI CHỨNG TỪ ===================== */
router.post(
  "/sales",
  verifyToken,
  (req, _res, next) => {
    req.body = { ...(req.body || {}), loai_don: "sale" };
    next();
  },
  DonHangController.create
);

router.post(
  "/receipts/production",
  verifyToken,
  (req, _res, next) => {
    req.body = { ...(req.body || {}), loai_don: "prod_receipt" };
    next();
  },
  DonHangController.create
);

router.post(
  "/receipts/purchase",
  verifyToken,
  (req, _res, next) => {
    req.body = { ...(req.body || {}), loai_don: "purchase_receipt" };
    next();
  },
  DonHangController.create
);

/* ✅ ALIAS LIST đơn nhập SX */
router.get(
  "/receipts/production",
  verifyToken,
  (req, _res, next) => {
    req.query = { ...(req.query || {}), loai_don: "prod_receipt" };
    next();
  },
  DonHangController.list
);

/* ✅ NEEDS đơn nhập SX */
router.get(
  "/receipts/production/:id/needs",
  verifyToken,
  DonHangController.productionNeeds
);

/* ===================== API CŨ (POST / = sale) ===================== */
router.post("/", verifyToken, DonHangController.create);

/* ===================== LIST / GET ===================== */
router.get("/", verifyToken, DonHangController.list);
router.get("/code/:ma_dh", verifyToken, DonHangController.getByCode);
router.get("/stats/revenue", verifyToken, DonHangController.revenueStats);
router.get("/:id", verifyToken, DonHangController.getById);

/* ===================== ITEMS & GIÁ ===================== */
router.put("/:id/items", verifyToken, DonHangController.updateItems);
router.post("/:id/items", verifyToken, DonHangController.addItem);
router.delete("/:id/items", verifyToken, DonHangController.removeItem);

router.post("/:id/discount", verifyToken, DonHangController.applyDiscount);
router.post("/:id/tax", verifyToken, DonHangController.applyTax);
router.post("/:id/shipping-fee", verifyToken, DonHangController.setShippingFee);

router.post("/:id/payment", verifyToken, DonHangController.updatePayment);
router.patch("/:id/note", verifyToken, DonHangController.updateNote);

/* ===================== TRẠNG THÁI (kèm tồn kho + log) ===================== */
router.post("/:id/status", verifyToken, DonHangController.updateStatus);

/* ===================== XOÁ / KHÔI PHỤC ===================== */
router.delete("/:id", verifyToken, DonHangController.softDelete);
router.post("/:id/restore", verifyToken, DonHangController.restore);
router.delete("/:id/hard", verifyToken, DonHangController.hardDelete);

export default router;
