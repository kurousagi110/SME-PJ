import express from "express";
import StockLedgerController from "../../controllers/stockLedgerController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

/**
 * @swagger
 * /stock-ledger/card:
 *   get:
 *     summary: Tra cứu Thẻ Kho chi tiết cho 1 mặt hàng
 *     tags: [StockLedger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [product, material]
 *       - in: query
 *         name: tu_ngay
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: den_ngay
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thông tin thẻ kho chi tiết
 */
router.get("/card", StockLedgerController.getStockCard);

/**
 * @swagger
 * /stock-ledger/in-out-balance:
 *   get:
 *     summary: Báo Cáo Xuất - Nhập - Tồn (XNT) tổng hợp theo kỳ
 *     tags: [StockLedger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [all, product, material]
 *       - in: query
 *         name: tu_ngay
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: den_ngay
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Báo cáo Xuất - Nhập - Tồn tổng hợp
 */
router.get("/in-out-balance", StockLedgerController.getInOutBalanceReport);

export default router;
