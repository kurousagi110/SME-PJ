/**
 * permissions.ts — Hệ thống Role & Quyền hạn (RBAC) dùng chung cho Frontend.
 * Đồng bộ với BackEndSME/utils/permissions.js.
 */

export interface PermissionItem {
  code: string;
  label: string;
  group: string;
}

export interface RoleDefinition {
  code: string;
  label: string;
  permissions: string[];
}

export const PERMISSION_LIST: PermissionItem[] = [
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

export const ROLE_OPTIONS: RoleDefinition[] = [
  {
    code: "admin",
    label: "Quản trị viên / Giám đốc",
    permissions: ["all"],
  },
  {
    code: "sales_manager",
    label: "Trưởng phòng Kinh doanh",
    permissions: ["sales.view", "sales.create", "sales.approve", "partners.manage", "approvals.view"],
  },
  {
    code: "sales_staff",
    label: "Nhân viên Kinh doanh",
    permissions: ["sales.view", "sales.create", "partners.manage"],
  },
  {
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
  {
    code: "accountant",
    label: "Nhân viên Kế toán",
    permissions: ["finance.view", "cashbook.create"],
  },
  {
    code: "hr_manager",
    label: "Trưởng phòng Nhân sự",
    permissions: ["hr.view", "hr.manage", "attendance.manage", "payroll.view", "payroll.manage", "approvals.view"],
  },
  {
    code: "hr_staff",
    label: "Nhân viên Nhân sự",
    permissions: ["hr.view", "attendance.manage"],
  },
  {
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
  {
    code: "warehouse_staff",
    label: "Nhân viên Kho",
    permissions: ["warehouse.view", "stock_adjustment.create"],
  },
  {
    code: "production_manager",
    label: "Trưởng xưởng / Quản đốc",
    permissions: ["production.view", "production.update_stage", "production.manage", "bom.manage"],
  },
  {
    code: "production_staff",
    label: "Công nhân Sản xuất",
    permissions: ["production.view", "production.update_stage"],
  },
  {
    code: "user",
    label: "Nhân viên cơ bản",
    permissions: [],
  },
];

export const ROLE_MAP: Record<string, RoleDefinition> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.code, r])
);

export function getRoleLabel(code?: string): string {
  if (!code) return "Nhân viên cơ bản";
  return ROLE_MAP[code]?.label || code;
}

export function isAdminOrDirector(profile: any): boolean {
  if (!profile) return false;
  if (profile.role === "admin" || profile.is_admin === true || profile.role_id === 1) return true;
  if (profile.tai_khoan === "admin") return true;

  const deptName = (profile?.phong_ban?.ten || "").toLowerCase().trim();
  const titleName = (profile?.chuc_vu?.ten || "").toLowerCase().trim();
  const posRole = (profile?.chuc_vu?.role_code || "").toLowerCase().trim();

  if (posRole === "admin") return true;
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

export function inferUserRoleCode(profile: any): string {
  if (!profile) return "user";
  if (isAdminOrDirector(profile)) return "admin";

  const directRole = String(profile.role || "").trim().toLowerCase();
  if (directRole && directRole !== "user" && ROLE_MAP[directRole]) {
    return directRole;
  }

  const posRole = String(profile?.chuc_vu?.role_code || "").trim().toLowerCase();
  if (posRole && ROLE_MAP[posRole]) {
    return posRole;
  }

  const titleName = (profile?.chuc_vu?.ten || "").toLowerCase().trim();
  const deptName = (profile?.phong_ban?.ten || "").toLowerCase().trim();

  if (titleName.includes("thủ kho") || titleName.includes("trưởng kho")) return "warehouse_manager";
  if (titleName.includes("nhân viên kho")) return "warehouse_staff";

  if (titleName.includes("trưởng xưởng") || titleName.includes("quản đốc")) return "production_manager";
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

  return "user";
}

export function getUserEffectivePermissions(profile: any): Set<string> {
  if (!profile) return new Set();
  const roleCode = inferUserRoleCode(profile);
  const rolePerms = ROLE_MAP[roleCode]?.permissions || [];
  const posPerms = Array.isArray(profile?.chuc_vu?.quyen_han) ? profile.chuc_vu.quyen_han : [];
  const userPerms = Array.isArray(profile?.quyen_han) ? profile.quyen_han : [];

  const merged = new Set([...rolePerms, ...posPerms, ...userPerms]);
  if (isAdminOrDirector(profile)) merged.add("all");
  return merged;
}

export function hasPermission(profile: any, required: string | string[]): boolean {
  if (!profile) return false;
  const perms = getUserEffectivePermissions(profile);
  if (perms.has("all")) return true;
  if (Array.isArray(required)) {
    return required.some((p) => perms.has(p));
  }
  return perms.has(required);
}

export function isDepartmentManager(profile: any): boolean {
  if (!profile) return false;
  if (isAdminOrDirector(profile)) return true;
  const roleCode = inferUserRoleCode(profile);
  if (
    ["sales_manager", "chief_accountant", "hr_manager", "warehouse_manager", "production_manager"].includes(
      roleCode
    )
  ) {
    return true;
  }
  const titleName = (profile?.chuc_vu?.ten || "").toLowerCase().trim();
  return titleName.includes("trưởng phòng") || titleName.includes("kế toán trưởng") || titleName.includes("thủ kho") || titleName.includes("trưởng xưởng");
}

export function canAccessApprovalsHub(profile: any): boolean {
  return (
    isAdminOrDirector(profile) ||
    isDepartmentManager(profile) ||
    hasPermission(profile, ["approvals.view", "warehouse.approve", "sales.approve", "payroll.manage"])
  );
}

export function canApproveSalesOrders(profile: any): boolean {
  return isAdminOrDirector(profile) || hasPermission(profile, "sales.approve");
}

export function canApproveWarehouseOrders(profile: any): boolean {
  return isAdminOrDirector(profile) || hasPermission(profile, ["warehouse.approve", "purchase.manage"]);
}

export function canManageFinance(profile: any): boolean {
  return isAdminOrDirector(profile) || hasPermission(profile, ["finance.manage", "cashbook.close_period"]);
}

export function canManageAttendance(profile: any): boolean {
  return isAdminOrDirector(profile) || isDepartmentManager(profile) || hasPermission(profile, ["attendance.manage", "hr.manage"]);
}

export function canManageProduction(profile: any): boolean {
  return isAdminOrDirector(profile) || hasPermission(profile, "production.manage");
}
