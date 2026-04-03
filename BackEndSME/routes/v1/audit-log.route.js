import { Router } from "express";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";
import AuditLogController from "../../controllers/auditLogController.js";

const router = Router();

/* GET /api/v1/audit-log — admin only */
router.get("/", verifyToken, verifyAdmin, AuditLogController.list);

export default router;
