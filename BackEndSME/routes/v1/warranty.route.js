import express from "express";
import WarrantyController from "../../controllers/warrantyController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/",                 WarrantyController.list);
router.get("/lookup",           WarrantyController.lookup);
router.get("/:id",              WarrantyController.getById);
router.post("/",                WarrantyController.create);
router.post("/:id/maintenance", WarrantyController.addTicket);

export default router;
