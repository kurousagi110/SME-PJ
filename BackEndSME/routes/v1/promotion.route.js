import express from "express";
import PromotionController from "../../controllers/promotionController.js";
import { verifyToken, verifySalesManager } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", PromotionController.list);
router.post("/validate", PromotionController.validate);
router.get("/loyalty/members", PromotionController.listLoyaltyMembers);
router.get("/loyalty/lookup", PromotionController.lookupCustomerLoyalty);

router.post("/", verifySalesManager, PromotionController.create);
router.put("/:id", verifySalesManager, PromotionController.update);
router.delete("/:id", verifySalesManager, PromotionController.remove);

export default router;
