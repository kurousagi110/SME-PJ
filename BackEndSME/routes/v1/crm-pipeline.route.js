import express from "express";
import CrmPipelineController from "../../controllers/crmPipelineController.js";
import { verifyToken, verifyPermission } from "../../middleware/auth.js";

const router = express.Router();
const canAccessSales = verifyPermission(["sales.view", "sales.create", "sales.approve"]);
const canCreateSales = verifyPermission(["sales.create", "sales.approve"]);

router.use(verifyToken);

router.get("/", canAccessSales, CrmPipelineController.list);
router.post("/", canCreateSales, CrmPipelineController.create);
router.put("/:id/stage", canCreateSales, CrmPipelineController.updateStage);
router.post("/:id/activities", canCreateSales, CrmPipelineController.addActivity);
router.post("/:id/convert-to-quotation", canCreateSales, CrmPipelineController.convertToQuotation);

export default router;
