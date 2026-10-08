import express from "express";
import BatchController from "../../controllers/batchController.js";
import { verifyToken, verifyApprover } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/fefo-suggest", BatchController.fefoSuggest);
router.get("/",             BatchController.list);
router.post("/",            verifyApprover, BatchController.create);

export default router;
