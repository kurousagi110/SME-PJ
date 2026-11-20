/**
 * permissions.js — Single source of truth for RBAC Roles & Granular Permissions.
 *
 * Hỗ trợ 2 lớp phân quyền:
 *   1. Role hệ thống (`role` / `chuc_vu.role_code`)
 *   2. Quyền chi tiết (`quyen_han` / `chuc_vu.quyen_han`)
 */

export const PERMISSION_LIST = [
  // Kinh doanh & Bán hàng
  { code: "sales.view", label: "Xem đơn bán hàng & báo giá", group: "Kinh doanh" },
  { code: "sales.create", label: "Tạo đơn bán hàng / POS / Báo giá", group: "Kinh doanh" },
  { code: "sales.approve", label: "Duyệt & vận hành đơn bán hàng", group: "Kinh doanh" },
  { code: "partners.manage", label: "Quản lý khách hàng & nhà cung cấp", group: "Kinh doanh" },

  // Kho & Mua hàng
  { code: "warehouse.view", label: "Xem tồn kho & thẻ kho", group: "Kho & Mua hàng" },
  { code: "stock_adjustment.create", label: "Tạo phiếu kiểm kê / điều chỉnh kho", group: "Kho & Mua hàng" },
  { code: "warehouse.approve", label: "Duyệt điều chỉnh kho & xuất nhập kho", group: "Kho & Mua hàng" },
  { code: "purchase.manage", label: "Tạo & duyệt đơn nhập mua vật tư", group: "Kho & Mua hàng" },
  { code: "rma.qc", label: "Kiểm định QC & hoàn tất đổi trả (RMA)", group: "Kho & Mua hàng" },

  // Sản xuất
  { code: "production.view", label: "Xem lệnh sản xuất & Kanban", group: "Sản xuất" },
  { code: "production.update_stage", label: "Cập nhật tiến độ công đoạn SX", group: "Sản xuất" },
  { code: "production.manage", label: "Tạo lệnh sản xuất & phiếu nhập thành phẩm", group: "Sản xuất" },
  { code: "bom.manage", label: "Thiết lập định mức nguyên vật liệu (BOM)", group: "Sản xuất" },

  // Tài chính & Kế toán
  { code: "finance.view", label: "Xem sổ quỹ & báo cáo tài chính", group: "Tài chính" },
  { code: "cashbook.create", label: "Tạo phiếu thu / phiếu chi sổ quỹ", group: "Tài chính" },
  { code: "cashbook.close_period", label: "Khóa sổ / mở khóa kỳ kế toán & hủy phiếu", group: "Tài chính" },
  { code: "finance.manage", label: "Quản lý giá vốn COGS & báo cáo P&L", group: "Tài chính" },

  // Nhân sự & Tiền lương
  { code: "hr.view", label: "Xem hồ sơ nhân sự & chấm công", group: "Nhân sự" },
  { code: "hr.manage", label: "Quản lý danh sách nhân sự", group: "Nhân sự" },
  { code: "attendance.manage", label: "Chấm công nhân viên", group: "Nhân sự" },
  { code: "payroll.view", label: "Xem bảng lương", group: "Nhân sự" },
  { code: "payroll.manage", label: "Tính lương & duyệt chi trả lương", group: "Nhân sự" },

  // Phê duyệt & Hệ thống
  { code: "approvals.view", label: "Truy cập Hộp thư Trình ký & Phê duyệt", group: "Hệ thống" },
  { code: "all", label: "Toàn quyền quản trị hệ thống (Admin)", group: "Hệ thống" },
];

export const ROLE_DEFINITIONS = {
  admin: {
    code: "admin",
    label: "Quản trị viên / Giám đốc",
    permissions: ["all"],
  },
  sales_manager: {
    code: "sales_manager",
    label: "Trưởng phòng Kinh doanh",
    permissions: ["sales.view", "sales.create", "sales.approve", "partners.manage", "approvals.view"],
  },
  sales_staff: {
    code: "sales_staff",
    label: "Nhân viên Kinh doanh",
    permissions: ["sales.view", "sales.create", "partners.manage"],
  },
  chief_accountant: {
    code: "chief_accountant",
    label: "Kế toán trưởng",
    permissions: [
      "finance.view",
      "finance.manage",
      "cashbook.create",
      "cashbook.close_period",
      "payroll.view",
      "payroll.manage",
      "approvals.view",
    ],
  },
  accountant: {
    code: "accountant",
    label: "Nhân viên Kế toán",
    permissions: ["finance.view", "cashbook.create"],
  },
  hr_manager: {
    code: "hr_manager",
    label: "Trưởng phòng Nhân sự",
    permissions: ["hr.view", "hr.manage", "attendance.manage", "payroll.view", "payroll.manage", "approvals.view"],
  },
  hr_staff: {
    code: "hr_staff",
    label: "Nhân viên Nhân sự",
    permissions: ["hr.view", "attendance.manage"],
  },
  warehouse_manager: {
    code: "warehouse_manager",
    label: "Thủ kho / Trưởng kho",
    permissions: [
      "warehouse.view",
      "warehouse.approve",
      "purchase.manage",
      "stock_adjustment.create",
      "rma.qc",
      "approvals.view",
    ],
  },
  warehouse_staff: {
    code: "warehouse_staff",
    label: "Nhân viên Kho",
    permissions: ["warehouse.view", "stock_adjustment.create"],
  },
  production_manager: {
    code: "production_manager",
    label: "Trưởng xưởng / Quản đốc",
    permissions: ["production.view", "production.update_stage", "production.manage", "bom.manage"],
  },
  production_staff: {
    code: "production_staff",
    label: "Công nhân Sản xuất",
    permissions: ["production.view", "production.update_stage"],
  },
  user: {
    code: "user",
    label: "Nhân viên cơ bản",
    permissions: [],
  },
};

export function isAdminUserRecord(user) {
  if (!user) return false;
  if (user.role === "admin" || user.is_admin === true || user.role_id === 1) return true;
  if (user.tai_khoan === "admin") return true;

  const deptName = (user?.phong_ban?.ten || user?.phong_ban?.code || user?.department || "").toLowerCase().trim();
  const titleName = (user?.chuc_vu?.ten || user?.chuc_vu?.code || user?.position || "").toLowerCase().trim();
  const chucVuRoleCode = (user?.chuc_vu?.role_code || "").toLowerCase().trim();

  if (chucVuRoleCode === "admin") return true;
  if (titleName === "thư ký") return false;

  return (
    deptName === "phòng giám đốc" ||
    deptName === "ban giám đốc" ||
    deptName === "board" ||
    deptName === "admin" ||
    titleName === "giám đốc" ||
    titleName === "tổng giám đốc" ||
    titleName === "director" ||
    titleName === "admin"
  );
}

/**
 * Suy luận role_code chuẩn của user từ:
 * 1. user.role (nếu khác "user" và hợp lệ)
 * 2. user.chuc_vu.role_code
 * 3. Tên chức vụ + tên phòng ban (tương thích ngược dữ liệu cũ)
 */
export function inferRoleCode(user) {
  if (!user) return "user";
  if (isAdminUserRecord(user)) return "admin";

  const directRole = String(user.role || "").trim().toLowerCase();
  if (directRole && directRole !== "user" && ROLE_DEFINITIONS[directRole]) {
    return directRole;
  }

  const posRole = String(user?.chuc_vu?.role_code || "").trim().toLowerCase();
  if (posRole && ROLE_DEFINITIONS[posRole]) {
    return posRole;
  }

  const titleName = (user?.chuc_vu?.ten || user?.chuc_vu?.code || user?.position || "").toLowerCase().trim();
  const deptName = (user?.phong_ban?.ten || user?.phong_ban?.code || user?.department || "").toLowerCase().trim();

  if (titleName.includes("thủ kho") || titleName.includes("trưởng kho") || titleName === "warehouse_manager") {
    return "warehouse_manager";
  }
  if (titleName.includes("nhân viên kho")) return "warehouse_staff";

  if (titleName.includes("trưởng xưởng") || titleName.includes("quản đốc") || titleName === "production_manager") {
    return "production_manager";
  }
  if (titleName.includes("công nhân") || titleName.includes("sản xuất")) return "production_staff";

  if (titleName.includes("kế toán trưởng")) return "chief_accountant";
  if (titleName.includes("kế toán")) return "accountant";

  if (titleName.includes("trưởng phòng kinh doanh")) return "sales_manager";
  if (titleName.includes("trưởng phòng nhân sự")) return "hr_manager";

  if (titleName === "trưởng phòng") {
    if (deptName.includes("kinh doanh")) return "sales_manager";
    if (deptName.includes("nhân sự")) return "hr_manager";
    if (deptName.includes("kế toán")) return "chief_accountant";
    if (deptName.includes("kho")) return "warehouse_manager";
    if (deptName.includes("sản xuất")) return "production_manager";
  }

  if (titleName.includes("kinh doanh") || titleName.includes("sale")) return "sales_staff";
  if (titleName.includes("nhân sự")) return "hr_staff";

  if (deptName.includes("kho") && user?.is_approver) return "warehouse_manager";
  if (deptName.includes("sản xuất") && user?.is_production_manager) return "production_manager";

  return "user";
}

export function getEffectivePermissions(user) {
  if (!user) return new Set();
  const roleCode = inferRoleCode(user);
  const rolePerms = ROLE_DEFINITIONS[roleCode]?.permissions || [];
  const posPerms = Array.isArray(user?.chuc_vu?.quyen_han) ? user.chuc_vu.quyen_han : [];
  const userPerms = Array.isArray(user?.quyen_han) ? user.quyen_han : [];

  const merged = new Set([...rolePerms, ...posPerms, ...userPerms]);
  if (isAdminUserRecord(user)) {
    merged.add("all");
  }
  return merged;
}

export function hasPermission(user, required) {
  if (!user) return false;
  const perms = getEffectivePermissions(user);
  if (perms.has("all")) return true;
  if (Array.isArray(required)) {
    return required.some((p) => perms.has(p));
  }
  return perms.has(required);
}
