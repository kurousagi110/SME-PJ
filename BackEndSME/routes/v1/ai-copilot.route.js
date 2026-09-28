import express from "express";
import AiCopilotController from "../../controllers/aiCopilotController.js";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

router.use(verifyToken);

router.get("/suggestions", AiCopilotController.getSuggestions);
router.post("/query", requireBody("query"), AiCopilotController.query);

router.get("/config", verifyAdmin, AiCopilotController.getConfig);
router.post("/config", verifyAdmin, AiCopilotController.saveConfig);
router.post("/config/test", verifyAdmin, AiCopilotController.testConnection);

export default router;
