import asyncHandler        from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import ApiError             from "../utils/ApiError.js";
import DieuChinhKhoDAO      from "../models/dieuChinhKhoDAO.js";
import NguyenLieuDAO        from "../models/nguyenLieuDAO.js";
import SanPhamDAO           from "../models/sanPhamDAO.js";
import { notifyAdmin, notifyApprover, notifyUser } from "../utils/socketManager.js";
import { logAction } from "../utils/auditLogger.js";

export default class DieuChinhKhoController {
  /* ─── CREATE ─── */
  static create = asyncHandler(async (req, res) => {
    const {
      loai,
      item_id,
      ma_hang,
      ten_hang,
      so_luong_dieu_chinh,
      ton_kho_truoc,
      ly_do,
    } = req.body || {};

    if (!["nguyen_lieu", "san_pham"].includes(loai)) {
      throw ApiError.badRequest("loai phải là 'nguyen_lieu' hoặc 'san_pham'", "VALIDATION_ERROR");
    }
    if (Number(so_luong_dieu_chinh) === 0) {
      throw ApiError.badRequest("Số lượng điều chỉnh không được bằng 0", "VALIDATION_ERROR");
    }

    const created_by = {
      tai_khoan: req.user.tai_khoan,
      ho_ten:    req.user.ho_ten,
    };

    const result = await DieuChinhKhoDAO.createPhieu({
      loai, item_id, ma_hang, ten_hang,
      so_luong_dieu_chinh: Number(so_luong_dieu_chinh),
      ton_kho_truoc:       Number(ton_kho_truoc),
      ly_do:               String(ly_do).trim(),
      created_by,
    });

    const payload = {
      type:    "DCK_CREATED",
      id:      result.insertedId,
      loai,
      ten_hang,
      so_luong_dieu_chinh: Number(so_luong_dieu_chinh),
      created_by,
    };
    notifyAdmin(payload);
    notifyApprover(payload);

    logAction(
      "CREATE",
      "dieu_chinh_kho",
      result.insertedId?.toString(),
      `Tạo phiếu điều chỉnh kho: ${ten_hang} (${loai})`,
      created_by,
      req.ip
    );

    return sendSuccess(res, { insertedId: result.insertedId }, "Tạo phiếu điều chỉnh kho thành công", 201);
  });

  /* ─── LIST ─── */
  static list = asyncHandler(async (req, res) => {
    const { loai, trang_thai, page = 1, limit = 20 } = req.query;
    const result = await DieuChinhKhoDAO.getAll({
      loai:       loai       || undefined,
      trang_thai: trang_thai || undefined,
      page:       Number(page),
      limit:      Number(limit),
    });
    const pagination = buildPagination(result.page, result.limit, result.total);
    return sendSuccess(res, result.items, "Lấy danh sách phiếu điều chỉnh kho thành công", 200, pagination);
  });

  /* ─── GET BY ID ─── */
  static getById = asyncHandler(async (req, res) => {
    const doc = await DieuChinhKhoDAO.getById(req.params.id);
    if (!doc) throw ApiError.notFound("Không tìm thấy phiếu điều chỉnh kho", "NOT_FOUND");
    return sendSuccess(res, doc, "Lấy phiếu điều chỉnh kho thành công");
  });

  /* ─── APPROVE ─── */
  static approve = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const phieu = await DieuChinhKhoDAO.getById(id);
    if (!phieu) throw ApiError.notFound("Không tìm thấy phiếu điều chỉnh kho", "NOT_FOUND");

    if (phieu.trang_thai !== "cho_duyet") {
      throw ApiError.badRequest("Phiếu đã được xử lý trước đó", "ALREADY_PROCESSED");
    }
    if (phieu.created_by?.tai_khoan === req.user.tai_khoan) {
      throw ApiError.forbidden("Không thể tự duyệt phiếu của mình", "SELF_APPROVE_FORBIDDEN");
    }

    const approvedBy = { tai_khoan: req.user.tai_khoan, ho_ten: req.user.ho_ten };

    // Atomic: trừ kho + set trạng thái phiếu phải là 1 operation.
    // Nếu chỉ chạy tuần tự: race giữa 2 admin → cả 2 pass check → trừ kho 2 lần
    // (DAO adjustStock idempotent? Không — $inc không phải delta-relative).
    //
    // Strategy: dùng Mongo session.withTransaction nếu có replicaSet/sharded.
    // Fallback: dùng findOneAndUpdate trên phiếu làm "latch" — chỉ người thắng
    // được trừ kho. Nếu thua thì rollback kho.
    const adjustFn = phieu.loai === "nguyen_lieu"
      ? (itemId, delta, opts) => NguyenLieuDAO.adjustStock(itemId, delta, { ...opts, allowNegative: false })
      : (itemId, delta, opts) => SanPhamDAO.adjustStock(itemId, delta, { ...opts, allowNegative: false });

    const mongoClient = req.app?.locals?.mongoClient || null;
    let updated = null;
    let session = null;
    let usedTransaction = false;

    try {
      if (mongoClient?.startSession) {
        try {
          session = mongoClient.startSession();
          usedTransaction = true;
          await session.withTransaction(async () => {
            // 1) Trừ kho trong session
            const adjustResult = await adjustFn(
              phieu.item_id.toString(),
              phieu.so_luong_dieu_chinh,
              { session }
            );
            if (adjustResult?.error) {
              throw ApiError.badRequest(
                adjustResult.error.message || "Điều chỉnh tồn kho thất bại",
                "STOCK_ADJUST_FAILED"
              );
            }
            // 2) Set trạng thái phiếu — chỉ match `cho_duyet` (latch)
            const res = await DieuChinhKhoDAO.approve(id, approvedBy, { session });
            if (!res) {
              throw ApiError.badRequest("Phiếu đã được xử lý bởi người khác", "ALREADY_PROCESSED");
            }
            updated = res;
          });
        } catch (e) {
          // ReplicaSet không khả dụng (standalone Mongo) → fallback non-transaction
          if (e?.message?.includes("Transaction numbers are only allowed")) {
            logger.warn("Mongo transactions unavailable, using fallback latch pattern");
            usedTransaction = false;
            session = null;
          } else if (e?.statusCode) {
            // ApiError — propagate
            throw e;
          } else {
            throw e;
          }
        } finally {
          if (session) await session.endSession();
        }
      }

      if (!usedTransaction) {
        // Fallback: latch bằng findOneAndUpdate trên phiếu.
        // 1) Reserve phiếu (chỉ winner pass)
        const reserved = await DieuChinhKhoDAO.approve(id, approvedBy);
        if (!reserved) {
          throw ApiError.badRequest("Phiếu đã được xử lý bởi người khác", "ALREADY_PROCESSED");
        }
        // 2) Trừ kho. Nếu fail → revert phiếu về cho_duyet.
        const adjustResult = await adjustFn(
          phieu.item_id.toString(),
          phieu.so_luong_dieu_chinh,
          {}
        );
        if (adjustResult?.error) {
          // Rollback phiếu
          await DieuChinhKhoDAO.revertToChoDuyet(id, approvedBy, adjustResult.error.message);
          throw ApiError.badRequest(
            adjustResult.error.message || "Điều chỉnh tồn kho thất bại",
            "STOCK_ADJUST_FAILED"
          );
        }
        updated = reserved;
      }
    } catch (e) {
      if (e?.statusCode) throw e;
      throw e;
    }

    notifyUser(phieu.created_by?.tai_khoan, {
      type:      "DCK_APPROVED",
      id:        id,
      ten_hang:  phieu.ten_hang,
      approved_by: approvedBy,
    });

    logAction(
      "APPROVE",
      "dieu_chinh_kho",
      id,
      `Duyệt phiếu điều chỉnh kho: ${phieu.ten_hang}`,
      approvedBy,
      req.ip
    );

    return sendSuccess(res, updated, "Duyệt phiếu điều chỉnh kho thành công");
  });

  /* ─── REJECT ─── */
  static reject = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const phieu = await DieuChinhKhoDAO.getById(id);
    if (!phieu) throw ApiError.notFound("Không tìm thấy phiếu điều chỉnh kho", "NOT_FOUND");

    if (phieu.trang_thai !== "cho_duyet") {
      throw ApiError.badRequest("Phiếu đã được xử lý trước đó", "ALREADY_PROCESSED");
    }

    const rejectedBy = { tai_khoan: req.user.tai_khoan, ho_ten: req.user.ho_ten };
    const updated = await DieuChinhKhoDAO.reject(id, rejectedBy);
    if (!updated) {
      throw ApiError.badRequest("Từ chối phiếu thất bại", "REJECT_FAILED");
    }

    notifyUser(phieu.created_by?.tai_khoan, {
      type:        "DCK_REJECTED",
      id:          id,
      ten_hang:    phieu.ten_hang,
      rejected_by: rejectedBy,
    });

    logAction(
      "REJECT",
      "dieu_chinh_kho",
      id,
      `Từ chối phiếu điều chỉnh kho: ${phieu.ten_hang}`,
      rejectedBy,
      req.ip
    );

    return sendSuccess(res, updated, "Từ chối phiếu điều chỉnh kho thành công");
  });
}
