import test from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_DEFINITIONS,
  PERMISSION_LIST,
  isAdminUserRecord,
  inferRoleCode,
  hasPermission,
  getEffectivePermissions,
} from "../utils/permissions.js";

test("RBAC - inferRoleCode resolves Vietnamese titles and explicit role_code", () => {
  assert.equal(inferRoleCode({ role: "admin" }), "admin");
  assert.equal(
    inferRoleCode({ chuc_vu: { ten: "Trưởng phòng kinh doanh" }, phong_ban: { ten: "Phòng kinh doanh" } }),
    "sales_manager"
  );
  assert.equal(
    inferRoleCode({ chuc_vu: { ten: "Kế toán trưởng" }, phong_ban: { ten: "Phòng kế toán" } }),
    "chief_accountant"
  );
  assert.equal(
    inferRoleCode({ chuc_vu: { ten: "Trưởng phòng nhân sự" }, phong_ban: { ten: "Phòng nhân sự" } }),
    "hr_manager"
  );
  assert.equal(
    inferRoleCode({ chuc_vu: { ten: "Thủ kho" }, phong_ban: { ten: "Phòng kho" } }),
    "warehouse_manager"
  );
  assert.equal(
    inferRoleCode({ chuc_vu: { ten: "Trưởng xưởng" }, phong_ban: { ten: "Phòng sản xuất" } }),
    "production_manager"
  );
  assert.equal(
    inferRoleCode({ chuc_vu: { ten: "Phó giám đốc phụ trách tài chính", role_code: "chief_accountant" } }),
    "chief_accountant"
  );
});

test("RBAC - Secretary in Phòng giám đốc does NOT get automatic admin", () => {
  const secretary = {
    role: "user",
    phong_ban: { ten: "Phòng giám đốc" },
    chuc_vu: { ten: "Thư ký" },
  };
  assert.equal(isAdminUserRecord(secretary), false);
  assert.notEqual(inferRoleCode(secretary), "admin");
  assert.equal(hasPermission(secretary, "all"), false);
});

test("RBAC - getEffectivePermissions merges role, position, and user custom permissions", () => {
  const customUser = {
    role: "sales_staff",
    chuc_vu: { ten: "Nhân viên kinh doanh", quyen_han: ["approvals.view"] },
    quyen_han: ["sales.approve"],
  };
  const perms = getEffectivePermissions(customUser);
  assert.equal(perms.has("sales.view"), true);
  assert.equal(perms.has("approvals.view"), true);
  assert.equal(perms.has("sales.approve"), true);
  assert.equal(perms.has("cashbook.close_period"), false);
});

test("RBAC - Department permissions match business roles", () => {
  const admin = { role: "admin" };
  const truongKd = { chuc_vu: { ten: "Trưởng phòng kinh doanh" }, phong_ban: { ten: "Phòng kinh doanh" } };
  const keToanTruong = { chuc_vu: { ten: "Kế toán trưởng" }, phong_ban: { ten: "Phòng kế toán" } };
  const nhanSuTr = { chuc_vu: { ten: "Trưởng phòng nhân sự" }, phong_ban: { ten: "Phòng nhân sự" } };
  const thuKho = { chuc_vu: { ten: "Thủ kho" }, phong_ban: { ten: "Phòng kho" } };
  const truongXuong = { chuc_vu: { ten: "Trưởng xưởng" }, phong_ban: { ten: "Phòng sản xuất" } };
  const saleStaff = { chuc_vu: { ten: "Nhân viên kinh doanh" }, phong_ban: { ten: "Phòng kinh doanh" } };

  assert.equal(hasPermission(admin, "cashbook.close_period"), true);
  assert.equal(hasPermission(keToanTruong, "cashbook.close_period"), true);
  assert.equal(hasPermission(thuKho, "cashbook.close_period"), false);

  assert.equal(hasPermission(truongKd, "sales.approve"), true);
  assert.equal(hasPermission(saleStaff, "sales.approve"), false);

  assert.equal(hasPermission(nhanSuTr, "hr.manage"), true);
  assert.equal(hasPermission(nhanSuTr, "attendance.manage"), true);
  assert.equal(hasPermission(saleStaff, "hr.manage"), false);

  assert.equal(hasPermission(thuKho, "warehouse.approve"), true);
  assert.equal(hasPermission(truongKd, "warehouse.approve"), false);

  assert.equal(hasPermission(truongXuong, "production.manage"), true);
  assert.equal(hasPermission(thuKho, "production.manage"), false);
});

test("RBAC - ROLE_DEFINITIONS and PERMISSION_LIST are complete", () => {
  assert.ok(ROLE_DEFINITIONS.admin);
  assert.ok(ROLE_DEFINITIONS.sales_manager);
  assert.ok(ROLE_DEFINITIONS.chief_accountant);
  assert.ok(ROLE_DEFINITIONS.hr_manager);
  assert.ok(ROLE_DEFINITIONS.warehouse_manager);
  assert.ok(ROLE_DEFINITIONS.production_manager);
  assert.ok(PERMISSION_LIST.length >= 20);
});
