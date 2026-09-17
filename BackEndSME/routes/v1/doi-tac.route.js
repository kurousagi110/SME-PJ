import express from "express";
import DoiTacController from "../../controllers/doiTacController.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

router.use(verifyToken);

router.get("/tong-quan", DoiTacController.getTongQuan);
router.get("/",          DoiTacController.list);
router.get("/:id",       DoiTacController.getById);

router.post("/", requireBody("ten"), DoiTacController.create);
router.put("/:id",    DoiTacController.update);
router.delete("/:id", DoiTacController.delete);

export default router;
