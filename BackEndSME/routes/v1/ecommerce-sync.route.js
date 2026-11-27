import express from "express";
import EcommerceSyncController from "../../controllers/ecommerceSyncController.js";
import { verifyToken, verifySalesManager, verifyFinanceManager } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/overview", EcommerceSyncController.getOverview);
router.post("/channels", verifySalesManager, EcommerceSyncController.upsertChannel);
router.post("/mappings", verifySalesManager, EcommerceSyncController.upsertMapping);
router.post("/channels/:id/sync-inventory", EcommerceSyncController.syncInventory);
router.post("/channels/:id/import-order", EcommerceSyncController.importOrder);
router.post("/channels/:id/settle-payout", verifyFinanceManager, EcommerceSyncController.settlePayout);

export default router;
