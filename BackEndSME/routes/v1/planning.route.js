// planning.route.js — Routes cho phân hệ Demand Planning
// Mounted under /api/v1/planning

import express from "express";
import PlanningController from "../../controllers/planningController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

// GET /api/v1/planning/forecast?months=6
router.get("/forecast", verifyToken, PlanningController.getForecast);

// GET /api/v1/planning/mrp?lead_time=7
router.get("/mrp", verifyToken, PlanningController.getMRP);

// GET /api/v1/planning/abc?months=6
router.get("/abc", verifyToken, PlanningController.getABC);

// GET /api/v1/planning/alerts?months=6
router.get("/alerts", verifyToken, PlanningController.getAlerts);

export default router;
