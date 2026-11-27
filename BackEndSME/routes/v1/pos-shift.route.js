import express from "express";
import PosShiftController from "../../controllers/posShiftController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", PosShiftController.list);
router.get("/active", PosShiftController.getActive);
router.post("/open", PosShiftController.open);
router.post("/:id/close", PosShiftController.close);

export default router;
