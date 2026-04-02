// Refactored: 2026-04-02 | Issues fixed: R1, R2, R3, R4 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/don-hang
// R3: Removed inline anonymous middleware that mutated req.body/req.query → named middleware functions
// R4: POST /:id/status → PATCH | POST /:id/restore → PATCH

import express from "express";
import DonHangController from "../../controllers/donHangControllers.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

/* ─── R3 fix: named functions instead of inline anonymous middleware ─── */
function setLoaiSale(req, _res, next)           { req.body = { ...(req.body || {}), loai_don: "sale" };             next(); }
function setLoaiProdReceipt(req, _res, next)    { req.body = { ...(req.body || {}), loai_don: "prod_receipt" };     next(); }
function setLoaiPurchaseReceipt(req, _res, next){ req.body = { ...(req.body || {}), loai_don: "purchase_receipt" }; next(); }
function filterProdReceipt(req, _res, next)     { req.query = { ...(req.query || {}), loai_don: "prod_receipt" };   next(); }

/* ─── 3 LOẠI CHỨNG TỪ ─── */
router.post("/sales",             verifyToken, setLoaiSale,             DonHangController.create);
router.post("/receipts/production",  verifyToken, setLoaiProdReceipt,      DonHangController.create);
router.post("/receipts/purchase",    verifyToken, setLoaiPurchaseReceipt,   DonHangController.create);

/* ─── PRODUCTION RECEIPT LIST & NEEDS ─── */
router.get("/receipts/production",          verifyToken, filterProdReceipt, DonHangController.list);
router.get("/receipts/production/:id/needs", verifyToken, DonHangController.productionNeeds);

/* ─── API gốc (POST / = sale) ─── */
router.post("/", verifyToken, DonHangController.create);

/* ─── LIST / GET ─── */
router.get("/",               verifyToken, DonHangController.list);
router.get("/code/:ma_dh",    verifyToken, DonHangController.getByCode);
router.get("/stats/revenue",  verifyToken, DonHangController.revenueStats);
router.get("/:id",            verifyToken, DonHangController.getById);

/* ─── ITEMS & GIÁ ─── */
router.put("/:id/items",    verifyToken, DonHangController.updateItems);
router.post("/:id/items",   verifyToken, DonHangController.addItem);
router.delete("/:id/items", verifyToken, DonHangController.removeItem);

router.post("/:id/discount",     verifyToken, DonHangController.applyDiscount);
router.post("/:id/tax",          verifyToken, DonHangController.applyTax);
router.post("/:id/shipping-fee", verifyToken, DonHangController.setShippingFee);

router.post("/:id/payment",  verifyToken, DonHangController.updatePayment);
router.patch("/:id/note",    verifyToken, DonHangController.updateNote);

/* ─── TRẠNG THÁI ─── */
router.patch("/:id/status", verifyToken, DonHangController.updateStatus); // R4: was POST

/* ─── XOÁ / KHÔI PHỤC ─── */
router.delete("/:id",        verifyToken, DonHangController.softDelete);
router.patch("/:id/restore", verifyToken, DonHangController.restore); // R4: was POST
router.delete("/:id/hard",   verifyToken, DonHangController.hardDelete);

export default router;
