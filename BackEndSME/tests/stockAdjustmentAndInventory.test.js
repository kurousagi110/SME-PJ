import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Bộ kiểm thử Hệ thống Kiểm kê Kho & Điều chỉnh Tồn kho (Stock Adjustment & Inventory Audit)
 * Bao phủ:
 * - Tính chênh lệch kiểm kê thực tế vs sổ sách (thừa / thiếu / khớp)
 * - Ràng buộc kiểm kê (chặn số lượng âm, delta = 0, bắt buộc lý do)
 * - Quy trình phê duyệt: cho_duyet -> da_duyet / tu_choi
 * - Chống tự duyệt (trừ Admin) và chống duyệt trùng (idempotency)
 * - Cảnh báo tồn kho dưới định mức tối thiểu (muc_ton_toi_thieu)
 */

const VALID_ITEM_TYPES = ["nguyen_lieu", "san_pham"];
const ADJUSTMENT_STATUS = {
  PENDING: "cho_duyet",
  APPROVED: "da_duyet",
  REJECTED: "tu_choi",
};

/**
 * Tạo phiếu kiểm kê & tính chênh lệch tồn kho
 */
function createStockAuditTicket({
  loai,
  itemId,
  maHang,
  tenHang,
  tonKhoTruoc,
  soLuongThucTe,
  lyDo,
  createdBy,
}) {
  if (!VALID_ITEM_TYPES.includes(loai)) {
    throw new Error("VALIDATION_ERROR: loai phải là 'nguyen_lieu' hoặc 'san_pham'");
  }
  if (!itemId || !maHang || !tenHang) {
    throw new Error("VALIDATION_ERROR: Thiếu thông tin định danh mặt hàng");
  }
  const beforeQty = Number(tonKhoTruoc);
  const actualQty = Number(soLuongThucTe);

  if (!Number.isFinite(beforeQty) || beforeQty < 0) {
    throw new Error("VALIDATION_ERROR: Tồn kho sổ sách không hợp lệ");
  }
  if (!Number.isFinite(actualQty) || actualQty < 0) {
    throw new Error("VALIDATION_ERROR: Số lượng kiểm kê thực tế không được âm");
  }

  const delta = actualQty - beforeQty;
  if (delta === 0) {
    throw new Error("VALIDATION_ERROR: Số lượng điều chỉnh không được bằng 0");
  }
  if (!lyDo || !String(lyDo).trim()) {
    throw new Error("VALIDATION_ERROR: Bắt buộc nhập lý do kiểm kê/điều chỉnh");
  }

  return {
    id: `DCK-${Date.now()}`,
    loai,
    item_id: itemId,
    ma_hang: maHang,
    ten_hang: tenHang,
    ton_kho_truoc: beforeQty,
    so_luong_thuc_te: actualQty,
    so_luong_dieu_chinh: delta,
    ly_do: String(lyDo).trim(),
    trang_thai: ADJUSTMENT_STATUS.PENDING,
    created_by: createdBy,
    approved_by: null,
  };
}

/**
 * Xử lý phê duyệt / từ chối phiếu kiểm kê kèm cập nhật tồn kho nguyên tử (atomic)
 */
function processStockAuditTicket(ticket, inventoryMap, approver, action = "approve") {
  if (!ticket) throw new Error("NOT_FOUND: Không tìm thấy phiếu điều chỉnh kho");
  if (ticket.trang_thai !== ADJUSTMENT_STATUS.PENDING) {
    throw new Error("ALREADY_PROCESSED: Phiếu đã được xử lý trước đó");
  }

  const isAdmin = approver?.role === "admin" || approver?.role === "giam_doc";
  if (!isAdmin && ticket.created_by?.tai_khoan === approver?.tai_khoan) {
    throw new Error("SELF_APPROVE_FORBIDDEN: Không thể tự duyệt phiếu của mình");
  }

  if (action === "reject") {
    ticket.trang_thai = ADJUSTMENT_STATUS.REJECTED;
    ticket.approved_by = approver;
    return { ticket, newStock: inventoryMap.get(ticket.item_id) };
  }

  const currentStock = inventoryMap.get(ticket.item_id) ?? 0;
  const nextStock = currentStock + ticket.so_luong_dieu_chinh;
  if (nextStock < 0) {
    throw new Error("STOCK_ADJUST_FAILED: Tồn kho không đủ để điều chỉnh giảm (không cho phép tồn âm)");
  }

  inventoryMap.set(ticket.item_id, nextStock);
  ticket.trang_thai = ADJUSTMENT_STATUS.APPROVED;
  ticket.approved_by = approver;
  return { ticket, newStock: nextStock };
}

/**
 * Kiểm tra danh sách mặt hàng dưới định mức tồn tối thiểu
 */
function detectLowStockItems(items = []) {
  return items
    .filter((item) => Number(item.so_luong_ton || 0) <= Number(item.muc_ton_toi_thieu || 0))
    .map((item) => ({
      id: item.id,
      ma_hang: item.ma_hang,
      ten_hang: item.ten_hang,
      so_luong_ton: Number(item.so_luong_ton || 0),
      muc_ton_toi_thieu: Number(item.muc_ton_toi_thieu || 0),
      thieu_hut: Math.max(0, Number(item.muc_ton_toi_thieu || 0) - Number(item.so_luong_ton || 0)),
    }));
}

describe("Stock Adjustment & Inventory Audit System", () => {
  it("calculates positive and negative inventory discrepancy accurately", () => {
    const excessTicket = createStockAuditTicket({
      loai: "nguyen_lieu",
      itemId: "NVL-01",
      maHang: "THEP-304",
      tenHang: "Thép tấm Inox 304",
      tonKhoTruoc: 100,
      soLuongThucTe: 108,
      lyDo: "Kiểm kê định kỳ quý IV - phát hiện dư phôi",
      createdBy: { tai_khoan: "nvkho01" },
    });
    assert.equal(excessTicket.so_luong_dieu_chinh, 8);
    assert.equal(excessTicket.trang_thai, "cho_duyet");

    const deficitTicket = createStockAuditTicket({
      loai: "san_pham",
      itemId: "SP-01",
      maHang: "TU-INOX",
      tenHang: "Tủ điện Inox 600x800",
      tonKhoTruoc: 50,
      soLuongThucTe: 46,
      lyDo: "Hao hụt kiểm kê cuối tháng",
      createdBy: { tai_khoan: "nvkho01" },
    });
    assert.equal(deficitTicket.so_luong_dieu_chinh, -4);
  });

  it("rejects invalid audit tickets (negative actual qty, zero delta, empty reason, invalid type)", () => {
    assert.throws(
      () =>
        createStockAuditTicket({
          loai: "invalid_type",
          itemId: "SP-01",
          maHang: "SP01",
          tenHang: "SP",
          tonKhoTruoc: 10,
          soLuongThucTe: 12,
          lyDo: "Test",
        }),
      /VALIDATION_ERROR/
    );

    assert.throws(
      () =>
        createStockAuditTicket({
          loai: "san_pham",
          itemId: "SP-01",
          maHang: "SP01",
          tenHang: "SP",
          tonKhoTruoc: 10,
          soLuongThucTe: -2,
          lyDo: "Test",
        }),
      /không được âm/
    );

    assert.throws(
      () =>
        createStockAuditTicket({
          loai: "san_pham",
          itemId: "SP-01",
          maHang: "SP01",
          tenHang: "SP",
          tonKhoTruoc: 10,
          soLuongThucTe: 10,
          lyDo: "Khớp kho",
        }),
      /không được bằng 0/
    );

    assert.throws(
      () =>
        createStockAuditTicket({
          loai: "san_pham",
          itemId: "SP-01",
          maHang: "SP01",
          tenHang: "SP",
          tonKhoTruoc: 10,
          soLuongThucTe: 12,
          lyDo: "   ",
        }),
      /Bắt buộc nhập lý do/
    );
  });

  it("approves audit ticket, updates inventory atomically, and blocks double-approval", () => {
    const inventory = new Map([["NVL-01", 100]]);
    const ticket = createStockAuditTicket({
      loai: "nguyen_lieu",
      itemId: "NVL-01",
      maHang: "THEP-304",
      tenHang: "Thép tấm Inox 304",
      tonKhoTruoc: 100,
      soLuongThucTe: 92,
      lyDo: "Kiểm kê kho tháng 11",
      createdBy: { tai_khoan: "nvkho01" },
    });

    // Non-admin creator cannot self-approve
    assert.throws(
      () => processStockAuditTicket(ticket, inventory, { tai_khoan: "nvkho01", role: "nhan_vien_kho" }, "approve"),
      /SELF_APPROVE_FORBIDDEN/
    );

    // Warehouse manager approves
    const res = processStockAuditTicket(ticket, inventory, { tai_khoan: "thukho01", role: "thu_kho" }, "approve");
    assert.equal(res.newStock, 92);
    assert.equal(inventory.get("NVL-01"), 92);
    assert.equal(ticket.trang_thai, "da_duyet");

    // Double approval is blocked
    assert.throws(
      () => processStockAuditTicket(ticket, inventory, { tai_khoan: "admin", role: "admin" }, "approve"),
      /ALREADY_PROCESSED/
    );
  });

  it("allows admin to self-approve and preserves inventory when ticket is rejected", () => {
    const inventory = new Map([["SP-01", 30]]);
    const rejectTicket = createStockAuditTicket({
      loai: "san_pham",
      itemId: "SP-01",
      maHang: "SP01",
      tenHang: "Tủ công nghiệp",
      tonKhoTruoc: 30,
      soLuongThucTe: 25,
      lyDo: "Kiểm đếm nhầm khu A",
      createdBy: { tai_khoan: "nvkho01" },
    });

    const rejected = processStockAuditTicket(rejectTicket, inventory, { tai_khoan: "thukho01", role: "thu_kho" }, "reject");
    assert.equal(rejected.ticket.trang_thai, "tu_choi");
    assert.equal(inventory.get("SP-01"), 30);

    const adminTicket = createStockAuditTicket({
      loai: "san_pham",
      itemId: "SP-01",
      maHang: "SP01",
      tenHang: "Tủ công nghiệp",
      tonKhoTruoc: 30,
      soLuongThucTe: 35,
      lyDo: "Admin điều chỉnh nhập bổ sung kiểm kê",
      createdBy: { tai_khoan: "admin01" },
    });

    const approved = processStockAuditTicket(adminTicket, inventory, { tai_khoan: "admin01", role: "admin" }, "approve");
    assert.equal(approved.newStock, 35);
  });

  it("prevents inventory from going negative during approval", () => {
    const inventory = new Map([["NVL-02", 5]]);
    const ticket = createStockAuditTicket({
      loai: "nguyen_lieu",
      itemId: "NVL-02",
      maHang: "OC-M8",
      tenHang: "Ốc vít M8",
      tonKhoTruoc: 20,
      soLuongThucTe: 10, // delta = -10, while current stock already dropped to 5
      lyDo: "Hao hụt",
      createdBy: { tai_khoan: "nvkho01" },
    });

    assert.throws(
      () => processStockAuditTicket(ticket, inventory, { tai_khoan: "thukho01", role: "thu_kho" }, "approve"),
      /STOCK_ADJUST_FAILED/
    );
    assert.equal(inventory.get("NVL-02"), 5);
    assert.equal(ticket.trang_thai, "cho_duyet");
  });

  it("detects low-stock items at or below minimum threshold", () => {
    const alerts = detectLowStockItems([
      { id: "1", ma_hang: "M1", ten_hang: "Thép 2mm", so_luong_ton: 8, muc_ton_toi_thieu: 15 },
      { id: "2", ma_hang: "M2", ten_hang: "Sơn tĩnh điện", so_luong_ton: 10, muc_ton_toi_thieu: 10 },
      { id: "3", ma_hang: "M3", ten_hang: "Bulong M10", so_luong_ton: 120, muc_ton_toi_thieu: 50 },
    ]);

    assert.equal(alerts.length, 2);
    assert.equal(alerts[0].ma_hang, "M1");
    assert.equal(alerts[0].thieu_hut, 7);
    assert.equal(alerts[1].ma_hang, "M2");
    assert.equal(alerts[1].thieu_hut, 0);
  });
});
