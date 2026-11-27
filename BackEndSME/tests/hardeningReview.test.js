import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "..");

test("Hardening - Attendance QR token route enforces verifyAttendanceManager", () => {
  const src = fs.readFileSync(path.join(ROOT, "BackEndSME/routes/v1/hr-request.route.js"), "utf8");
  assert.match(src, /router\.get\(["']\/attendance\/qr-token["'],\s*verifyAttendanceManager,/);
});

test("Hardening - CRM Pipeline routes enforce sales RBAC permissions", () => {
  const src = fs.readFileSync(path.join(ROOT, "BackEndSME/routes/v1/crm-pipeline.route.js"), "utf8");
  assert.match(src, /verifyPermission\(\["sales\.view"/);
  assert.match(src, /router\.post\(["']\/["'],\s*canCreateSales,/);
});

test("Hardening - POS shift close checks cashier ownership unless override permitted", () => {
  const daoSrc = fs.readFileSync(path.join(ROOT, "BackEndSME/models/posShiftDAO.js"), "utf8");
  const ctrlSrc = fs.readFileSync(path.join(ROOT, "BackEndSME/controllers/posShiftController.js"), "utf8");
  assert.match(daoSrc, /allowOverride\s*=\s*false/);
  assert.match(daoSrc, /forbidden:\s*true/);
  assert.match(ctrlSrc, /POS_SHIFT_FORBIDDEN/);
});

test("Hardening - Warehouse dispatchTransfer implements compensation rollback on partial failure", () => {
  const src = fs.readFileSync(path.join(ROOT, "BackEndSME/models/warehouseDAO.js"), "utf8");
  assert.match(src, /const deductedItems = \[\]/);
  assert.match(src, /const rollbackDeducted = async/);
  assert.match(src, /await rollbackDeducted\(\)/);
});

test("Hardening - E-commerce order import checks idempotency by external_order_id", () => {
  const src = fs.readFileSync(path.join(ROOT, "BackEndSME/models/ecommerceSyncDAO.js"), "utf8");
  assert.match(src, /existingImport = await syncLogsCol\.findOne/);
  assert.match(src, /idempotent:\s*true/);
});

test("Hardening - Frontend UI links approvals PR tab, portal loyalty card, and all 8 new CommandPalette routes", () => {
  const approvalsSrc = fs.readFileSync(
    path.join(ROOT, "FrontEndSME/src/app/(modules)/approvals/page.tsx"),
    "utf8"
  );
  const portalSrc = fs.readFileSync(path.join(ROOT, "FrontEndSME/src/app/portal/page.tsx"), "utf8");
  const paletteSrc = fs.readFileSync(path.join(ROOT, "FrontEndSME/src/components/command-palette.tsx"), "utf8");

  assert.match(approvalsSrc, /purchase_request/);
  assert.match(approvalsSrc, /pending\.purchaseRequests/);
  assert.match(portalSrc, /result\.loyalty/);

  for (const route of [
    "/settings",
    "/promotions",
    "/hr-requests",
    "/warehouses",
    "/crm-pipeline",
    "/procurement",
    "/fixed-assets",
    "/ecommerce-sync",
  ]) {
    assert.ok(paletteSrc.includes(route), `CommandPalette missing shortcut for ${route}`);
  }
});
