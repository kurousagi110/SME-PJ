import express from "express";
import ThongBaoController from "../../controllers/thongBaoControllers.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", ThongBaoController.layDanhSach);
router.patch("/:id/read", ThongBaoController.danhDauDaDoc);
router.post("/read-all", ThongBaoController.danhDauDocTatCa);

export default router;
