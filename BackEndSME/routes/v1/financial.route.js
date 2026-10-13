import express from "express";
import FinancialController from "../../controllers/financialController.js";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

/* ─── 1. Báo cáo P&L, Lãi - Lỗ & Biên lợi nhuận ─── */
router.get("/pnl",                   FinancialController.getPNL);
router.get("/product-profitability", FinancialController.getProductProfitability);

/* ─── 2. Tuổi Nợ (Aging Debt) & Hạn Mức Tín Dụng ─── */
router.get("/aging-debt",            FinancialController.getAgingDebt);
router.get("/credit-limit/:partnerId", FinancialController.checkCreditLimit);

/* ─── 3. Dự Báo Dòng Tiền (Cashflow) & Đối Soát Ngân Hàng ─── */
router.get("/cashflow-forecast", FinancialController.getCashFlowForecast);
router.post("/bank-reconcile",   FinancialController.reconcileBank);

/* ─── 4. Quản trị giá vốn & Đồng bộ lại ─── */
router.post("/recalculate-cogs", verifyAdmin, FinancialController.recalculateCOGS);

export default router;

