import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import DashboardController from "../controllers/dashboardControllers.js";

const router = express.Router();

router.get("/orders/compare", verifyToken, DashboardController.ordersCompare);
router.get("/orders/overview", verifyToken, DashboardController.ordersOverview);
router.get("/orders/table", verifyToken, DashboardController.ordersTable);

export default router;
