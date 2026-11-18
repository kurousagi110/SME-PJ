// Refactored: 2026-04-02 | Issues fixed: W1, W5, G6 | Phase 1 – Foundation
// 2026-05-25: Added isAdminUser helper + verifySelfOrAdmin middleware
// 2026-11-13: Upgraded to unified RBAC with role_code + granular permissions

import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import ApiError from "../utils/ApiError.js";
import {
  isAdminUserRecord,
  inferRoleCode,
  hasPermission,
} from "../utils/permissions.js";

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
export function isAdminUser(user) {
  return isAdminUserRecord(user);
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
      {
        projection: {
          mat_khau: 0,
          tokens: 0,
          two_factor_secret: 0,
          two_factor_pending_secret: 0,
          two_factor_recovery_codes: 0,
        },
      }
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
 * verifyApprover – checks that the user can approve warehouse/inventory/purchase requests.
 * Extends verifyAdmin with warehouse-level senior roles (Thủ kho) and permission `warehouse.approve`.
 * Must be used AFTER verifyToken.
 */
export function verifyApprover(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const roleCode = inferRoleCode(user);
  const isApprover =
    isAdminUser(user) ||
    user?.is_approver === true ||
    user?.role === "approver" ||
    roleCode === "warehouse_manager" ||
    hasPermission(user, ["warehouse.approve", "purchase.manage", "rma.qc"]);

  if (!isApprover) return next(ApiError.forbidden("Không có quyền duyệt phiếu điều chỉnh kho", "FORBIDDEN"));
  next();
}

/**
 * verifyApprovalHubAccess – cho phép tất cả cấp quản lý truy cập Hộp thư Trình ký & Phê duyệt.
 * ApprovalController.processApproval sẽ kiểm tra chi tiết từng loại chứng từ.
 */
export function verifyApprovalHubAccess(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const roleCode = inferRoleCode(user);
  const allowed =
    isAdminUser(user) ||
    user?.is_approver === true ||
    user?.role === "approver" ||
    ["warehouse_manager", "sales_manager", "chief_accountant", "hr_manager"].includes(roleCode) ||
    hasPermission(user, ["approvals.view", "warehouse.approve", "sales.approve", "payroll.manage"]);

  if (!allowed) {
    return next(ApiError.forbidden("Không có quyền truy cập hộp thư phê duyệt", "FORBIDDEN"));
  }
  next();
}

/**
 * verifySalesManager – Trưởng phòng Kinh doanh + Admin (duyệt đơn bán hàng).
 */
export function verifySalesManager(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const roleCode = inferRoleCode(user);
  const allowed =
    isAdminUser(user) ||
    roleCode === "sales_manager" ||
    hasPermission(user, "sales.approve");

  if (!allowed) {
    return next(ApiError.forbidden("Không có quyền duyệt đơn bán hàng", "FORBIDDEN"));
  }
  next();
}

/**
 * verifyOrderStatusApprover – duyệt trạng thái đơn hàng theo loại chứng từ hoặc quyền approver/sales.
 */
export function verifyOrderStatusApprover(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const roleCode = inferRoleCode(user);
  const allowed =
    isAdminUser(user) ||
    user?.is_approver === true ||
    user?.role === "approver" ||
    ["warehouse_manager", "sales_manager", "production_manager"].includes(roleCode) ||
    hasPermission(user, ["warehouse.approve", "sales.approve", "production.manage"]);

  if (!allowed) {
    return next(ApiError.forbidden("Không có quyền cập nhật trạng thái đơn hàng", "FORBIDDEN"));
  }
  next();
}

/**
 * verifyFinanceManager – Kế toán trưởng + Admin (khóa sổ kỳ kế toán, hủy phiếu quỹ, tính giá vốn, chi lương).
 */
export function verifyFinanceManager(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const roleCode = inferRoleCode(user);
  const allowed =
    isAdminUser(user) ||
    roleCode === "chief_accountant" ||
    hasPermission(user, ["finance.manage", "cashbook.close_period"]);

  if (!allowed) {
    return next(ApiError.forbidden("Chỉ Ban Giám Đốc hoặc Kế toán trưởng mới có quyền thực hiện", "FORBIDDEN"));
  }
  next();
}

/**
 * verifyHRManager – Trưởng phòng Nhân sự + Kế toán trưởng + Admin (quản lý nhân sự, tính lương).
 */
export function verifyHRManager(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const roleCode = inferRoleCode(user);
  const allowed =
    isAdminUser(user) ||
    ["hr_manager", "chief_accountant"].includes(roleCode) ||
    hasPermission(user, ["hr.manage", "payroll.manage"]);

  if (!allowed) {
    return next(ApiError.forbidden("Chỉ Ban Giám Đốc, Nhân sự hoặc Kế toán trưởng mới có quyền thực hiện", "FORBIDDEN"));
  }
  next();
}

/**
 * verifyAttendanceManager – các cấp quản lý & nhân sự được phép chấm công.
 */
export function verifyAttendanceManager(req, res, next) {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));

  const roleCode = inferRoleCode(user);
  const allowed =
    isAdminUser(user) ||
    user?.is_approver === true ||
    ["warehouse_manager", "sales_manager", "chief_accountant", "hr_manager", "hr_staff", "production_manager"].includes(roleCode) ||
    hasPermission(user, ["attendance.manage", "hr.manage"]);

  if (!allowed) {
    return next(ApiError.forbidden("Không có quyền chấm công nhân viên", "FORBIDDEN"));
  }
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

  const roleCode = inferRoleCode(user);
  const isProductionManager =
    isAdminUser(user) ||
    user?.is_production_manager === true ||
    roleCode === "production_manager" ||
    hasPermission(user, ["production.manage", "bom.manage"]);

  if (!isProductionManager) {
    return next(ApiError.forbidden("Không có quyền tạo lệnh sản xuất", "FORBIDDEN"));
  }
  next();
}

/**
 * verifyPermission – generic permission middleware factory.
 */
export function verifyPermission(requiredPerm) {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) return next(ApiError.unauthorized("Chưa xác thực", "UNAUTHORIZED"));
    if (!hasPermission(user, requiredPerm)) {
      return next(ApiError.forbidden("Bạn không có quyền thực hiện thao tác này", "FORBIDDEN"));
    }
    next();
  };
}

/**
 * verifySelfOrAdminByMaNV – scope a request to either the user identified by
 * `ma_nv` in body/query OR an admin/approver/HR/manager. Used for payroll + attendance
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

  const roleCode = inferRoleCode(user);
  // Admin, quản lý phòng ban, nhân sự, kế toán trưởng, thủ kho được xem chấm công/lương theo phạm vi
  if (
    isAdminUser(user) ||
    ["warehouse_manager", "hr_manager", "hr_staff", "chief_accountant", "sales_manager", "production_manager"].includes(roleCode) ||
    hasPermission(user, ["attendance.manage", "hr.view", "payroll.manage"])
  ) {
    return next();
  }

  const targetMaNV = req?.body?.ma_nv ?? req?.query?.ma_nv;
  if (!targetMaNV) {
    return next(ApiError.badRequest("Thiếu ma_nv", "VALIDATION_ERROR"));
  }
  if (String(user.ma_nv || "") === String(targetMaNV)) return next();

  return next(ApiError.forbidden("Không có quyền xem dữ liệu chấm công / lương của nhân viên khác", "FORBIDDEN"));
}
