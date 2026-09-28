import express from "express";
import StockLedgerController from "../../controllers/stockLedgerController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

/* ─── 1. Thẻ Kho Mặt Hàng ─── */
router.get("/card", StockLedgerController.getStockCard);

/* ─── 2. Báo Cáo Xuất - Nhập - Tồn ─── */
router.get("/in-out-balance", StockLedgerController.getInOutBalanceReport);

export default router;
