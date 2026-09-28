import express from "express";
import ApprovalController from "../../controllers/approvalController.js";
import { verifyToken, verifyApprover } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/pending", verifyApprover, ApprovalController.getPendingApprovals);
router.post("/action", verifyApprover, ApprovalController.processApproval);

export default router;
