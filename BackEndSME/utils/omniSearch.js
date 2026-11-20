/**
 * omniSearch.js — Hỗ trợ tìm kiếm toàn hệ thống (Omni-Search) cho Ctrl+K
 * Chuẩn hóa truy vấn an toàn (chống ReDoS) và định dạng kết quả thống nhất.
 * Tên field khớp schema thực tế: don_hang.loai_don, doi_tac.ten/so_dien_thoai/ma_doi_tac,
 * hop_dong.ma_hop_dong/ten_hop_dong/partner_name, lo_san_xuat.so_lo/so_luong_ton.
 */
import { escapeSafeRegexPattern } from "./securityHelpers.js";
import { isAdminUserRecord, hasPermission } from "./permissions.js";

export function getAllowedSearchScopes(user) {
  if (!user) {
    return {
      orders: false,
      orderTypes: [],
      products: false,
      materials: false,
      partners: false,
      contracts: false,
      batches: false,
    };
  }
  if (isAdminUserRecord(user)) {
    return {
      orders: true,
      orderTypes: ["sale", "purchase_receipt", "prod_receipt"],
      products: true,
      materials: true,
      partners: true,
      contracts: true,
      batches: true,
    };
  }

  const orderTypes = [];
  if (hasPermission(user, ["sales.view", "sales.create", "sales.approve"])) {
    orderTypes.push("sale");
  }
  if (hasPermission(user, ["warehouse.view", "purchase.manage"])) {
    orderTypes.push("purchase_receipt");
  }
  if (hasPermission(user, ["production.view", "production.manage"])) {
    orderTypes.push("prod_receipt");
  }

  return {
    orders: orderTypes.length > 0,
    orderTypes,
    products: hasPermission(user, [
      "sales.view",
      "sales.create",
      "warehouse.view",
      "production.view",
      "production.manage",
      "bom.manage",
    ]),
    materials: hasPermission(user, [
      "warehouse.view",
      "purchase.manage",
      "production.view",
      "production.manage",
      "bom.manage",
    ]),
    partners: hasPermission(user, [
      "sales.view",
      "sales.create",
      "partners.manage",
      "purchase.manage",
      "finance.view",
    ]),
    contracts: hasPermission(user, ["sales.view", "sales.approve", "finance.view", "finance.manage"]),
    batches: hasPermission(user, ["warehouse.view", "production.view", "production.manage", "rma.qc"]),
  };
}

export function buildSafeSearchRegex(rawQuery, maxLen = 80) {
  const cleaned = String(rawQuery || "").trim();
  if (cleaned.length < 2) return null;
  const escaped = escapeSafeRegexPattern(cleaned, maxLen);
  return new RegExp(escaped, "i");
}

const ORDER_ROUTE_BY_TYPE = {
  sale: "/sales",
  purchase_receipt: "/material/orders",
  prod_receipt: "/product/orders",
};

export function resolveOrderRoute(loaiDon) {
  return ORDER_ROUTE_BY_TYPE[loaiDon] || "/sales";
}

export function formatOmniSearchResults({
  orders = [],
  products = [],
  materials = [],
  partners = [],
  contracts = [],
  batches = [],
} = {}) {
  const results = [];

  for (const o of orders) {
    results.push({
      id: String(o._id || o.ma_dh),
      category: "order",
      categoryLabel: "Đơn hàng",
      code: o.ma_dh || "",
      title: o.ma_dh || "Đơn hàng",
      subtitle: [o.khach_hang_ten || o.nha_cung_cap_ten, o.trang_thai].filter(Boolean).join(" • "),
      route: resolveOrderRoute(o.loai_don),
    });
  }

  for (const p of products) {
    results.push({
      id: String(p._id || p.ma_sp),
      category: "product",
      categoryLabel: "Thành phẩm",
      code: p.ma_sp || "",
      title: p.ten_sp || p.ma_sp || "Sản phẩm",
      subtitle: `${p.ma_sp || ""} • Tồn: ${Number(p.so_luong ?? 0)} ${p.don_vi || "cái"}`,
      route: "/product/catalog",
    });
  }

  for (const m of materials) {
    results.push({
      id: String(m._id || m.ma_nl),
      category: "material",
      categoryLabel: "Nguyên vật liệu",
      code: m.ma_nl || "",
      title: m.ten_nl || m.ma_nl || "Vật tư",
      subtitle: `${m.ma_nl || ""} • Tồn: ${Number(m.so_luong ?? 0)} ${m.don_vi || ""}`,
      route: "/material/catalog",
    });
  }

  for (const d of partners) {
    results.push({
      id: String(d._id || d.ma_doi_tac),
      category: "partner",
      categoryLabel: d.loai_doi_tac === "nha_cung_cap" ? "Nhà cung cấp" : "Khách hàng",
      code: d.ma_doi_tac || "",
      title: d.ten || d.ma_doi_tac || "Đối tác",
      subtitle: [d.so_dien_thoai, d.nhom].filter(Boolean).join(" • ") || d.ma_doi_tac || "",
      route: "/partners",
    });
  }

  for (const c of contracts) {
    results.push({
      id: String(c._id || c.ma_hop_dong),
      category: "contract",
      categoryLabel: "Hợp đồng B2B",
      code: c.ma_hop_dong || "",
      title: c.ten_hop_dong || c.ma_hop_dong || "Hợp đồng",
      subtitle: [c.ma_hop_dong, c.partner_name].filter(Boolean).join(" • "),
      route: "/contracts",
    });
  }

  for (const b of batches) {
    results.push({
      id: String(b._id || b.so_lo),
      category: "batch",
      categoryLabel: "Lô hàng FEFO",
      code: b.so_lo || "",
      title: b.so_lo || "Lô hàng",
      subtitle: [b.ten_hang, `SL còn: ${Number(b.so_luong_ton ?? 0)}`].filter(Boolean).join(" • "),
      route: "/traceability",
    });
  }

  return results;
}
