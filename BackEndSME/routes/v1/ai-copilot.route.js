import express from "express";
import AiCopilotController from "../../controllers/aiCopilotController.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

router.use(verifyToken);

router.get("/suggestions", AiCopilotController.getSuggestions);
router.post("/query", requireBody("query"), AiCopilotController.query);

export default router;
