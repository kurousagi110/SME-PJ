import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Bộ kiểm thử Quản lý Lô (Batch), Thuật toán Xuất kho FEFO & Sổ cái Thẻ kho (Stock Ledger)
 * Bao phủ:
 * - Thuật toán FEFO (First-Expired, First-Out): ưu tiên xuất lô hạn dùng gần nhất còn hiệu lực
 * - Loại bỏ lô hết hạn (expired), lô bị khóa chất lượng (quarantine/recalled) và lô hết tồn
 * - Phân bổ xuất kho qua nhiều lô (Multi-batch split) & báo lỗi thiếu tồn khả dụng
 * - Cảnh báo lô cận hạn (cận date <= N ngày)
 * - Đối soát phương trình cân bằng Thẻ kho: Tồn cuối = Tồn đầu + Nhập - Xuất ± Điều chỉnh
 */

/**
 * Thuật toán gợi ý phân bổ xuất kho theo chuẩn FEFO
 */
function suggestFEFOAllocation(batches = [], requestedQty, referenceDate = new Date()) {
  const qtyNeeded = Number(requestedQty);
  if (!Number.isFinite(qtyNeeded) || qtyNeeded <= 0) {
    throw new Error("VALIDATION_ERROR: Số lượng yêu cầu xuất kho phải > 0");
  }

  const nowTs = new Date(referenceDate).getTime();

  // Lọc lô hợp lệ: đang active, còn tồn > 0, và chưa hết hạn
  const eligibleBatches = batches
    .filter((b) => {
      if (b.trang_thai !== "active") return false;
      if (Number(b.so_luong_ton || 0) <= 0) return false;
      if (b.han_su_dung && new Date(b.han_su_dung).getTime() < nowTs) return false;
      return true;
    })
    .sort((a, b) => {
      // Lô có hạn sử dụng xếp trước theo hạn tăng dần; lô không có HSD xếp sau cùng theo ngày tạo
      if (a.han_su_dung && b.han_su_dung) {
        return new Date(a.han_su_dung).getTime() - new Date(b.han_su_dung).getTime();
      }
      if (a.han_su_dung) return -1;
      if (b.han_su_dung) return 1;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

  let remaining = qtyNeeded;
  const allocations = [];

  for (const batch of eligibleBatches) {
    if (remaining <= 0) break;
    const available = Number(batch.so_luong_ton);
    const take = Math.min(available, remaining);
    allocations.push({
      so_lo: batch.so_lo,
      han_su_dung: batch.han_su_dung,
      so_luong_xuat: take,
      ton_con_lai_sau_xuat: available - take,
    });
    remaining -= take;
  }

  return {
    requestedQty: qtyNeeded,
    allocatedQty: qtyNeeded - remaining,
    shortfallQty: remaining,
    sufficient: remaining === 0,
    allocations,
  };
}

/**
 * Phát hiện các lô hàng sắp hết hạn trong vòng `days` ngày tới
 */
function findExpiringBatches(batches = [], days = 30, referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const threshold = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);

  return batches.filter((b) => {
    if (Number(b.so_luong_ton || 0) <= 0) return false;
    if (!b.han_su_dung) return false;
    const exp = new Date(b.han_su_dung);
    return exp >= now && exp <= threshold;
  });
}

/**
 * Tính cân bằng Thẻ kho (Stock Ledger) và Giá vốn bình quân gia quyền
 */
function computeStockLedgerBalance(openingQty, openingCost, movements = []) {
  let runningQty = Number(openingQty || 0);
  let totalValue = runningQty * Number(openingCost || 0);

  let totalIn = 0;
  let totalOut = 0;
  let totalAdjust = 0;

  const entries = movements.map((m) => {
    const qtyIn = Number(m.so_luong_nhap || 0);
    const qtyOut = Number(m.so_luong_xuat || 0);
    const qtyAdjust = Number(m.so_luong_dieu_chinh || 0);
    const unitPrice = Number(m.don_gia || 0);

    if (qtyIn > 0) {
      totalValue += qtyIn * unitPrice;
      runningQty += qtyIn;
      totalIn += qtyIn;
    }

    const avgCost = runningQty > 0 ? totalValue / runningQty : Number(openingCost || 0);

    if (qtyOut > 0) {
      totalValue -= qtyOut * avgCost;
      runningQty -= qtyOut;
      totalOut += qtyOut;
    }

    if (qtyAdjust !== 0) {
      totalValue += qtyAdjust * avgCost;
      runningQty += qtyAdjust;
      totalAdjust += qtyAdjust;
    }

    return {
      ma_chung_tu: m.ma_chung_tu,
      loai_giao_dich: m.loai_giao_dich,
      ton_sau_giao_dich: runningQty,
    };
  });

  const closingQty = Number(openingQty || 0) + totalIn - totalOut + totalAdjust;
  const weightedAvgCost = runningQty > 0 ? Math.round(totalValue / runningQty) : 0;

  return {
    openingQty: Number(openingQty || 0),
    totalIn,
    totalOut,
    totalAdjust,
    closingQty,
    invariantMatched: closingQty === runningQty,
    weightedAvgCost,
    entries,
  };
}

describe("Batch FEFO & Stock Ledger Reconciliation", () => {
  const refDate = new Date("2026-11-13T00:00:00Z");

  it("selects earliest-expiring active batch first (FEFO) and skips expired/quarantined batches", () => {
    const batches = [
      { so_lo: "LOT-EXPIRED", trang_thai: "active", so_luong_ton: 50, han_su_dung: "2026-11-01T00:00:00Z" },
      { so_lo: "LOT-QUARANTINE", trang_thai: "quarantine", so_luong_ton: 40, han_su_dung: "2026-11-20T00:00:00Z" },
      { so_lo: "LOT-LATE", trang_thai: "active", so_luong_ton: 30, han_su_dung: "2027-02-15T00:00:00Z" },
      { so_lo: "LOT-SOON", trang_thai: "active", so_luong_ton: 25, han_su_dung: "2026-11-28T00:00:00Z" },
      { so_lo: "LOT-EMPTY", trang_thai: "active", so_luong_ton: 0, han_su_dung: "2026-11-18T00:00:00Z" },
    ];

    const plan = suggestFEFOAllocation(batches, 40, refDate);
    assert.equal(plan.sufficient, true);
    assert.equal(plan.allocatedQty, 40);
    assert.equal(plan.shortfallQty, 0);
    assert.equal(plan.allocations.length, 2);
    assert.equal(plan.allocations[0].so_lo, "LOT-SOON");
    assert.equal(plan.allocations[0].so_luong_xuat, 25);
    assert.equal(plan.allocations[0].ton_con_lai_sau_xuat, 0);
    assert.equal(plan.allocations[1].so_lo, "LOT-LATE");
    assert.equal(plan.allocations[1].so_luong_xuat, 15);
    assert.equal(plan.allocations[1].ton_con_lai_sau_xuat, 15);
  });

  it("reports shortfall when active non-expired batch stock is insufficient", () => {
    const batches = [
      { so_lo: "LOT-A", trang_thai: "active", so_luong_ton: 12, han_su_dung: "2026-12-10T00:00:00Z" },
      { so_lo: "LOT-EXP", trang_thai: "active", so_luong_ton: 100, han_su_dung: "2026-10-01T00:00:00Z" },
    ];

    const plan = suggestFEFOAllocation(batches, 20, refDate);
    assert.equal(plan.sufficient, false);
    assert.equal(plan.allocatedQty, 12);
    assert.equal(plan.shortfallQty, 8);
  });

  it("identifies batches expiring within threshold days", () => {
    const batches = [
      { so_lo: "LOT-10D", so_luong_ton: 10, han_su_dung: "2026-11-23T00:00:00Z" },
      { so_lo: "LOT-60D", so_luong_ton: 20, han_su_dung: "2027-01-12T00:00:00Z" },
      { so_lo: "LOT-ZERO", so_luong_ton: 0, han_su_dung: "2026-11-20T00:00:00Z" },
    ];

    const expiring = findExpiringBatches(batches, 30, refDate);
    assert.equal(expiring.length, 1);
    assert.equal(expiring[0].so_lo, "LOT-10D");
  });

  it("maintains Stock Ledger balance invariant and weighted average cost", () => {
    // Tồn đầu: 10 cái @ 100,000đ = 1,000,000đ
    // Nhập mua: +10 cái @ 120,000đ -> tổng 20 cái = 2,200,000đ (giá bình quân = 110,000đ)
    // Xuất bán: -5 cái -> còn 15 cái
    // Kiểm kê điều chỉnh: -2 cái -> còn 13 cái
    const ledger = computeStockLedgerBalance(10, 100000, [
      { ma_chung_tu: "PO-001", loai_giao_dich: "NHAP_MUA_HANG", so_luong_nhap: 10, don_gia: 120000 },
      { ma_chung_tu: "DH-001", loai_giao_dich: "XUAT_BAN", so_luong_xuat: 5 },
      { ma_chung_tu: "DCK-001", loai_giao_dich: "KIEM_KE_DIEU_CHINH", so_luong_dieu_chinh: -2 },
    ]);

    assert.equal(ledger.invariantMatched, true);
    assert.equal(ledger.totalIn, 10);
    assert.equal(ledger.totalOut, 5);
    assert.equal(ledger.totalAdjust, -2);
    assert.equal(ledger.closingQty, 13);
    assert.equal(ledger.weightedAvgCost, 110000);
    assert.equal(ledger.entries[2].ton_sau_giao_dich, 13);
  });
});
