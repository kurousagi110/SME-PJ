// Refactored: 2026-04-02 | Issues fixed: R1, R2 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/dashboard

import express from "express";
import DashboardController from "../../controllers/dashboardControllers.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/orders/compare",  verifyToken, DashboardController.ordersCompare);
router.get("/orders/overview", verifyToken, DashboardController.ordersOverview);
router.get("/orders/table",    verifyToken, DashboardController.ordersTable);

export default router;
