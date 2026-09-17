import express from "express";
import ImportController from "../../controllers/importController.js";
import { verifyToken, verifyApprover } from "../../middleware/auth.js";

const router = express.Router();

/* ─── BULK IMPORT ─── */
router.post("/bulk", verifyToken, verifyApprover, ImportController.bulkImport);

export default router;
