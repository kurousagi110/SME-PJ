import express from "express";
import WarehouseController from "../../controllers/warehouseController.js";
import { verifyToken, verifyApprover } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

// Danh mục Kho
router.get("/", WarehouseController.listWarehouses);
router.post("/", verifyApprover, WarehouseController.createWarehouse);
router.put("/:id", verifyApprover, WarehouseController.updateWarehouse);

// Tồn kho phân bổ & Vị trí kệ (Bin Location)
router.get("/stocks", WarehouseController.listStocks);
router.post("/stocks/sync-initial", verifyApprover, WarehouseController.syncInitialStocks);
router.put("/stocks/bin", WarehouseController.updateStockBin);

// Điều chuyển kho nội bộ
router.get("/transfers", WarehouseController.listTransfers);
router.post("/transfers", WarehouseController.createTransfer);
router.post("/transfers/:id/dispatch", verifyApprover, WarehouseController.dispatchTransfer);
router.post("/transfers/:id/receive", verifyApprover, WarehouseController.receiveTransfer);
router.post("/transfers/:id/cancel", verifyApprover, WarehouseController.cancelTransfer);

export default router;
