import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSafeSearchRegex,
  formatOmniSearchResults,
  resolveOrderRoute,
  getAllowedSearchScopes,
} from "../utils/omniSearch.js";

describe("Omni-Search Helpers (Ctrl + K Live Search)", () => {
  it("returns null for short queries (< 2 chars) and escapes ReDoS metacharacters", () => {
    assert.equal(buildSafeSearchRegex(""), null);
    assert.equal(buildSafeSearchRegex("a"), null);

    const rx = buildSafeSearchRegex("DH-(2026)+.*");
    assert.ok(rx instanceof RegExp);
    assert.equal(rx.test("DH-(2026)+.*123"), true);
    assert.equal(rx.test("DH-2026-anything"), false);
  });

  it("routes orders by real loai_don values", () => {
    assert.equal(resolveOrderRoute("sale"), "/sales");
    assert.equal(resolveOrderRoute("purchase_receipt"), "/material/orders");
    assert.equal(resolveOrderRoute("prod_receipt"), "/product/orders");
    assert.equal(resolveOrderRoute(undefined), "/sales");
  });

  it("formats real-schema DB documents into unified CommandPalette items", () => {
    const items = formatOmniSearchResults({
      orders: [{ _id: "o1", ma_dh: "DH-001", khach_hang_ten: "Anh Minh", trang_thai: "pending", loai_don: "purchase_receipt" }],
      products: [{ _id: "p1", ma_sp: "SP-01", ten_sp: "Bàn Gỗ Sồi", so_luong: 12, don_vi: "cái" }],
      materials: [{ _id: "m1", ma_nl: "NL001", ten_nl: "Gỗ MDF 18mm", so_luong: 200, don_vi: "tấm" }],
      partners: [{ _id: "d1", ma_doi_tac: "KH-01", ten: "Công ty ABC", so_dien_thoai: "0909123456", loai_doi_tac: "khach_hang", nhom: "vip" }],
      contracts: [{ _id: "c1", ma_hop_dong: "HD-2026-0001", ten_hop_dong: "Hợp đồng Nội thất", partner_name: "Công ty ABC" }],
      batches: [{ _id: "b1", so_lo: "LOT-2026-01", ten_hang: "Bàn Gỗ Sồi", so_luong_ton: 8 }],
    });

    assert.equal(items.length, 6);
    assert.deepEqual(
      items.map((x) => [x.category, x.route, x.title]),
      [
        ["order", "/material/orders", "DH-001"],
        ["product", "/product/catalog", "Bàn Gỗ Sồi"],
        ["material", "/material/catalog", "Gỗ MDF 18mm"],
        ["partner", "/partners", "Công ty ABC"],
        ["contract", "/contracts", "Hợp đồng Nội thất"],
        ["batch", "/traceability", "LOT-2026-01"],
      ]
    );
    assert.match(items[3].subtitle, /0909123456/);
    assert.match(items[5].subtitle, /SL còn: 8/);
  });

  it("enforces RBAC scopes for omni-search", () => {
    const adminScopes = getAllowedSearchScopes({ role: "admin", quyen_han: ["all"] });
    assert.deepEqual(adminScopes, {
      orders: true,
      orderTypes: ["sale", "purchase_receipt", "prod_receipt"],
      products: true,
      materials: true,
      partners: true,
      contracts: true,
      batches: true,
    });

    const hrScopes = getAllowedSearchScopes({ role: "hr_staff", quyen_han: ["hr.view", "attendance.manage"] });
    assert.deepEqual(hrScopes, {
      orders: false,
      orderTypes: [],
      products: false,
      materials: false,
      partners: false,
      contracts: false,
      batches: false,
    });

    const salesScopes = getAllowedSearchScopes({ role: "sales_staff", quyen_han: ["sales.view", "sales.create", "partners.manage"] });
    assert.equal(salesScopes.orders, true);
    assert.deepEqual(salesScopes.orderTypes, ["sale"]);
    assert.equal(salesScopes.contracts, true);
    assert.equal(salesScopes.partners, true);
    assert.equal(salesScopes.materials, false);
    assert.equal(salesScopes.batches, false);

    const prodScopes = getAllowedSearchScopes({ role: "production_staff", quyen_han: ["production.view"] });
    assert.deepEqual(prodScopes.orderTypes, ["prod_receipt"]);
  });
});
