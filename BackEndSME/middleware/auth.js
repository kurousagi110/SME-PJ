// Refactored: 2026-04-02 | Issues fixed: W1, W5, G6 | Phase 1 – Foundation
// 2026-05-25: Added isAdminUser helper + verifySelfOrAdmin middleware

import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import ApiError from "../utils/ApiError.js";

let usersCol = null;

/**
 * Called once after MongoDB connects (in index.js).
 * Injects the users collection so verifyToken can load the full user object.
 * Standardized env var: SME_DB_NAME (was DB_NAME in old verifyToken.js)
 */
export function injectAuthDB(conn) {
  if (usersCol) return;
  const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
  usersCol = conn.db(dbName).collection("users");
}

/** Single source of truth for admin-level role check. */
function isAdminUser(user) {
  return (
    user?.phong_ban?.ten === "Phòng giám đốc" ||
    user?.chuc_vu?.ten  === "Giám đốc" ||
    user?.role          === "admin"
  );
}

/**
 * verifyToken – decodes JWT → loads full user from DB → attaches req.user.
 *
 * Throws ApiError so errorHandler catches it uniformly (not raw res.status calls).
 */
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) throw ApiError.unauthorized("Thiếu Authorization header", "MISSING_TOKEN");

    const token = authHeader.split(" ")[1];
    if (!token) throw ApiError.unauthorized("Token không hợp lệ", "INVALID_TOKEN");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded?.uid;
    if (!userId || !ObjectId.isValid(userId)) {
      throw ApiError.unauthorized("Token không hợp lệ (uid)", "INVALID_TOKEN");
    }

    if (!usersCol) {
      throw ApiError.internal("Auth DB chưa được inject", "AUTH_DB_NOT_READY");
    }

    const user = await usersCol.findOne(
      { _id: new ObjectId(userId), trang_thai: { $ne: 0 } },
      { projection: { mat_khau: 0, tokens: 0 } }
    );

    if (!user) throw ApiError.unauthorized("Không tìm thấy tài khoản", "USER_NOT_FOUND");

    req.user = user; // full user object available to controllers
    next();
  } catch (err) {
    next(err); // forward to global errorHandler (handles TokenExpiredError, ApiError, etc.)
  }
}

/**
 * verifyAdmin – checks that the authenticated user has admin-level access.
 * Must be used AFTER verifyToken.
 */
export function verifyAdmin(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));
  if (!isAdminUser(user)) return next(ApiError.forbidden("Không có quyền admin", "FORBIDDEN"));
  next();
}

/**
 * verifyApprover – checks that the user can approve inventory adjustment requests.
 * Extends verifyAdmin with warehouse-level senior roles (Thủ kho).
 * Must be used AFTER verifyToken.
 */
export function verifyApprover(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const isApprover =
    isAdminUser(user) ||
    user?.chuc_vu?.ten === "Thủ kho";

  if (!isApprover) return next(ApiError.forbidden("Không có quyền duyệt phiếu điều chỉnh kho", "FORBIDDEN"));
  next();
}

/**
 * verifySelfOrAdmin – allows the resource owner OR an admin to proceed.
 * Compares req.user._id against req.params.id.
 * Must be used AFTER verifyToken.
 */
export function verifySelfOrAdmin(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const isSelf = user._id?.toString() === req.params.id;
  if (!isSelf && !isAdminUser(user)) {
    return next(ApiError.forbidden("Không có quyền thao tác trên tài khoản này", "FORBIDDEN"));
  }
  next();
}

/**
 * verifyProductionManager – chỉ Trưởng xưởng + Admin được tạo lệnh sản xuất.
 * Must be used AFTER verifyToken.
 */
export function verifyProductionManager(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const isProductionManager =
    isAdminUser(user) || user?.chuc_vu?.ten === "Trưởng xưởng";

  if (!isProductionManager) {
    return next(ApiError.forbidden("Không có quyền tạo lệnh sản xuất", "FORBIDDEN"));
  }
  next();
}

/**
 * verifySelfOrAdminByMaNV – scope a request to either the user identified by
 * `ma_nv` in body/query OR an admin/approver. Used for payroll + attendance
 * endpoints where a non-privileged user must not read another employee's
 * salary or attendance record.
 *
 * Looks at `req.body.ma_nv` first (POST/PATCH), then `req.query.ma_nv` (GET).
 * The user's own `ma_nv` is read from `req.user.ma_nv`.
 *
 * Must be used AFTER verifyToken.
 */
export function verifySelfOrAdminByMaNV(req, _res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  // Admin/approver can read or write anyone's payroll.
  if (isAdminUser(user) || user?.chuc_vu?.ten === "Thủ kho") return next();

  const targetMaNV = req?.body?.ma_nv ?? req?.query?.ma_nv;
  if (!targetMaNV) {
    return next(ApiError.badRequest("Thiếu ma_nv", "VALIDATION_ERROR"));
  }
  if (String(user.ma_nv || "") === String(targetMaNV)) return next();

  return next(ApiError.forbidden("Không có quyền xem dữ liệu chấm công / lương của nhân viên khác", "FORBIDDEN"));
}
