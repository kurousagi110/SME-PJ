// Refactored: 2026-04-02 | Issues fixed: W1, W5, G6 | Phase 1 – Foundation
// Consolidates middleware/middleware.js (dead code) + middleware/verifyToken.js (active)
// middleware/middleware.js is now dead code and can be deleted.

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
 *
 * Currently checks: phong_ban.ten === "Phòng giám đốc" OR chuc_vu.ten === "Giám đốc"
 * Adjust the condition to match the actual role model as needed.
 */
export function verifyAdmin(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const isAdmin =
    user?.phong_ban?.ten === "Phòng giám đốc" ||
    user?.chuc_vu?.ten === "Giám đốc" ||
    user?.role === "admin";

  if (!isAdmin) return next(ApiError.forbidden("Không có quyền admin", "FORBIDDEN"));
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
    user?.phong_ban?.ten === "Phòng giám đốc" ||
    user?.chuc_vu?.ten === "Giám đốc" ||
    user?.chuc_vu?.ten === "Thủ kho" ||
    user?.role === "admin";

  if (!isApprover) return next(ApiError.forbidden("Không có quyền duyệt phiếu điều chỉnh kho", "FORBIDDEN"));
  next();
}
