import express from "express";
import ContractController from "../../controllers/contractController.js";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/",                     ContractController.list);
router.get("/:id",                  ContractController.getById);
router.post("/",                    ContractController.create);
router.post("/:id/pay-milestone",   ContractController.payMilestone);

export default router;
