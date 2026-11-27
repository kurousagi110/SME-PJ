import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import WarehouseDAO from "../models/warehouseDAO.js";
import { notifyDepartment } from "../utils/socketManager.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class WarehouseController {
  static listWarehouses = asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === "true";
    const data = await WarehouseDAO.listWarehouses({ includeInactive });
    return sendSuccess(res, data, "Lấy danh sách kho thành công");
  });

  static createWarehouse = asyncHandler(async (req, res) => {
    const result = await WarehouseDAO.createWarehouse(req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("CREATE_WAREHOUSE", "warehouse", String(result.doc._id), `Tạo kho mới ${result.doc.code}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, "Tạo kho mới thành công", 201);
  });

  static updateWarehouse = asyncHandler(async (req, res) => {
    const result = await WarehouseDAO.updateWarehouse(req.params.id, req.body || {});
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.doc, "Cập nhật thông tin kho thành công");
  });

  static listStocks = asyncHandler(async (req, res) => {
    const { warehouseCode = "", itemType = "", q = "", limit = 100 } = req.query;
    const data = await WarehouseDAO.listStocks({ warehouseCode, itemType, q, limit });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy tồn kho phân bổ thành công");
  });

  static syncInitialStocks = asyncHandler(async (req, res) => {
    const data = await WarehouseDAO.syncInitialStocks();
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, `Đã đồng bộ ${data.syncedCount} mặt hàng vào hệ thống đa kho`);
  });

  static updateStockBin = asyncHandler(async (req, res) => {
    const { warehouse_code, item_type, item_id, bin_location, min_stock } = req.body || {};
    const result = await WarehouseDAO.updateStockBin({
      warehouseCode: warehouse_code,
      itemType: item_type,
      itemId: item_id,
      binLocation: bin_location,
      minStock: min_stock,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.doc, "Cập nhật vị trí kệ (Bin) thành công");
  });

  static listTransfers = asyncHandler(async (req, res) => {
    const { status = "", warehouseCode = "", page = 1, limit = 50 } = req.query;
    const data = await WarehouseDAO.listTransfers({ status, warehouseCode, page, limit });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy danh sách phiếu điều chuyển kho thành công");
  });

  static createTransfer = asyncHandler(async (req, res) => {
    const { from_warehouse, to_warehouse, items = [], ghi_chu = "" } = req.body || {};
    const result = await WarehouseDAO.createTransfer({
      fromWarehouse: from_warehouse,
      toWarehouse: to_warehouse,
      items,
      note: ghi_chu,
      user: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("CREATE_STOCK_TRANSFER", "stock_transfer", String(result.doc._id), `Lập phiếu chuyển kho ${result.doc.ma_phieu}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, `Đã lập phiếu chuyển kho ${result.doc.ma_phieu}`, 201);
  });

  static dispatchTransfer = asyncHandler(async (req, res) => {
    const result = await WarehouseDAO.dispatchTransfer(req.params.id, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    const doc = result.doc;
    notifyDepartment("kho", {
      type: "STOCK_TRANSFER_DISPATCHED",
      title: `Hàng đang chuyển đến ${doc.to_warehouse}`,
      message: `Phiếu ${doc.ma_phieu} đã xuất từ ${doc.from_warehouse} → ${doc.to_warehouse}`,
      created_by: performedByOf(req),
    });
    logAction("DISPATCH_STOCK_TRANSFER", "stock_transfer", String(doc._id), `Xuất chuyển kho ${doc.ma_phieu}`, performedByOf(req), req.ip);
    return sendSuccess(res, doc, `Đã xuất hàng cho phiếu ${doc.ma_phieu}`);
  });

  static receiveTransfer = asyncHandler(async (req, res) => {
    const { received_items = [], ghi_chu = "" } = req.body || {};
    const result = await WarehouseDAO.receiveTransfer(req.params.id, {
      receivedItems: received_items,
      note: ghi_chu,
      user: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    const doc = result.doc;
    logAction("RECEIVE_STOCK_TRANSFER", "stock_transfer", String(doc._id), `Nhập kho đích cho phiếu ${doc.ma_phieu}`, performedByOf(req), req.ip);
    return sendSuccess(res, doc, `Đã xác nhận nhập kho đích cho phiếu ${doc.ma_phieu}`);
  });

  static cancelTransfer = asyncHandler(async (req, res) => {
    const result = await WarehouseDAO.cancelTransfer(req.params.id, {
      reason: req.body?.ly_do || req.body?.reason || "",
      user: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("CANCEL_STOCK_TRANSFER", "stock_transfer", String(result.doc._id), `Hủy phiếu chuyển kho ${result.doc.ma_phieu}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, `Đã hủy phiếu chuyển kho ${result.doc.ma_phieu}`);
  });
}
