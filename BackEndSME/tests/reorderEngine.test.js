import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeReorderQty, planAutoReorderBatches } from "../utils/reorderEngine.js";

describe("Auto-Reorder Engine (Draft PO generation)", () => {
  it("computes reorder quantity as max(minStock * 2 - stock, MOQ) when stock <= minStock", () => {
    assert.equal(computeReorderQty({ so_luong: 10, ton_toi_thieu: 15 }), 20);
    assert.equal(computeReorderQty({ so_luong: 15, ton_toi_thieu: 15, moq: 25 }), 25);
    assert.equal(computeReorderQty({ so_luong: 16, ton_toi_thieu: 15 }), 0);
    assert.equal(computeReorderQty({ so_luong: 0, ton_toi_thieu: 0 }), 0);
  });

  it("excludes materials already in pending POs and groups by latest supplier", () => {
    const materials = [
      { _id: "m1", ma_nl: "NL01", ten_nl: "Gỗ MDF", so_luong: 5, ton_toi_thieu: 20, gia_nhap: 300000 },
      { _id: "m2", ma_nl: "NL02", ten_nl: "Sơn trắng", so_luong: 3, ton_toi_thieu: 10, gia_nhap: 80000 },
      { _id: "m3", ma_nl: "NL03", ten_nl: "Keo PVA", so_luong: 2, ton_toi_thieu: 10, gia_nhap: 45000 },
      { _id: "m4", ma_nl: "NL04", ten_nl: "Ốc vít", so_luong: 500, ton_toi_thieu: 50, gia_nhap: 500 },
    ];

    const pendingPurchaseOrders = [
      {
        trang_thai: "draft",
        san_pham: [{ nguyen_lieu_id: "m3", ma_nl: "NL03", so_luong: 20 }],
      },
      {
        trang_thai: "confirmed",
        san_pham: [{ nguyen_lieu_id: "m5", ma_nl: "NL05", so_luong: 10 }],
      },
    ];

    materials.push({
      _id: "m5",
      ma_nl: "NL05",
      ten_nl: "Đinh vít",
      so_luong: 1,
      ton_toi_thieu: 10,
      gia_nhap: 10000,
    });

    const recentPurchaseOrders = [
      {
        nha_cung_cap_ten: "NCC Gỗ An Cường",
        created_at: "2026-11-10T00:00:00Z",
        san_pham: [{ nguyen_lieu_id: "m1", ma_nl: "NL01" }],
      },
      {
        nha_cung_cap_ten: "NCC Sơn Nippon",
        created_at: "2026-11-01T00:00:00Z",
        san_pham: [{ nguyen_lieu_id: "m2", ma_nl: "NL02" }],
      },
    ];

    const plan = planAutoReorderBatches({
      materials,
      pendingPurchaseOrders,
      recentPurchaseOrders,
    });

    assert.equal(plan.totalItems, 2);
    assert.equal(plan.skippedDuplicateCount, 2);
    assert.equal(plan.batches.length, 2);

    const goBatch = plan.batches.find((b) => b.nha_cung_cap_ten === "NCC Gỗ An Cường");
    assert.ok(goBatch);
    assert.equal(goBatch.items[0].so_luong, 35); // 20*2 - 5

    const sonBatch = plan.batches.find((b) => b.nha_cung_cap_ten === "NCC Sơn Nippon");
    assert.ok(sonBatch);
    assert.equal(sonBatch.items[0].so_luong, 17); // 10*2 - 3
  });
});
