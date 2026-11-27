import express from "express";
import CrmPipelineController from "../../controllers/crmPipelineController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", CrmPipelineController.list);
router.post("/", CrmPipelineController.create);
router.put("/:id/stage", CrmPipelineController.updateStage);
router.post("/:id/activities", CrmPipelineController.addActivity);
router.post("/:id/convert-to-quotation", CrmPipelineController.convertToQuotation);

export default router;
