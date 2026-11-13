import express from "express";
import ApprovalController from "../../controllers/approvalController.js";
import { verifyToken, verifyApprovalHubAccess } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/pending", verifyApprovalHubAccess, ApprovalController.getPendingApprovals);
router.post("/action", verifyApprovalHubAccess, ApprovalController.processApproval);

export default router;
