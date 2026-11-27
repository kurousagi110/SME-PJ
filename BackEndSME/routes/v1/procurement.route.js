import express from "express";
import ProcurementController from "../../controllers/procurementController.js";
import { verifyToken, verifyApprover } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

// Purchase Requests (PR)
router.get("/prs", ProcurementController.listPRs);
router.post("/prs", ProcurementController.createPR);
router.post("/prs/:id/decide", verifyApprover, ProcurementController.decidePR);

// RFQs & Vendor Quote Matrix
router.get("/rfqs", ProcurementController.listRFQs);
router.post("/rfqs", ProcurementController.createRFQ);
router.post("/rfqs/:id/quotes", ProcurementController.submitQuote);
router.post("/rfqs/:id/award", verifyApprover, ProcurementController.awardRFQ);

// Vendor Scorecard & 3-Way Matching
router.get("/vendor-scorecard", ProcurementController.vendorScorecard);
router.post("/three-way-match", ProcurementController.threeWayMatch);

export default router;
