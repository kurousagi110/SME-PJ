import express from "express";
import AccountingExpansionController from "../../controllers/accountingExpansionController.js";
import { verifyToken, verifyPermission, verifyFinanceManager } from "../../middleware/auth.js";

const router = express.Router();
const canViewFinance = verifyPermission("finance.view");

router.use(verifyToken);

// VAT Declaration Report
router.get("/vat-report", canViewFinance, AccountingExpansionController.getVatReport);

// Fixed Assets & Monthly Depreciation
router.get("/assets", canViewFinance, AccountingExpansionController.listAssets);
router.post("/assets", verifyFinanceManager, AccountingExpansionController.createAsset);
router.post("/assets/:id/maintenance", canViewFinance, AccountingExpansionController.addMaintenance);
router.post("/assets/depreciate", verifyFinanceManager, AccountingExpansionController.runDepreciation);

// Department Budgets (Budget vs Actual)
router.get("/budgets", canViewFinance, AccountingExpansionController.getBudgetVsActual);
router.post("/budgets", verifyFinanceManager, AccountingExpansionController.upsertBudget);

export default router;
