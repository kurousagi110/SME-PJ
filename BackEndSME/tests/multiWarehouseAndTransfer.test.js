import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_WAREHOUSES,
  TRANSFER_STATUS,
  canTransitionTransfer,
  validateTransferDraft,
  computeTransferReceiptDelta,
} from "../utils/warehouseTransferEngine.js";

test("MultiWarehouse - provides 4 default operational warehouses", () => {
  const codes = DEFAULT_WAREHOUSES.map((w) => w.code);
  assert.deepEqual(codes, ["KHO-TONG", "KHO-XUONG", "KHO-SHOWROOM", "KHO-QC"]);
});

test("StockTransfer - enforces strict state transitions", () => {
  assert.equal(canTransitionTransfer(TRANSFER_STATUS.DRAFT, TRANSFER_STATUS.IN_TRANSIT), true);
  assert.equal(canTransitionTransfer(TRANSFER_STATUS.DRAFT, TRANSFER_STATUS.RECEIVED), false);
  assert.equal(canTransitionTransfer(TRANSFER_STATUS.IN_TRANSIT, TRANSFER_STATUS.RECEIVED), true);
  assert.equal(canTransitionTransfer(TRANSFER_STATUS.RECEIVED, TRANSFER_STATUS.CANCELLED), false);
});

test("StockTransfer - rejects same source/dest warehouse and insufficient source stock", () => {
  const stockMap = new Map([["san_pham:sp1", 10]]);

  const sameRes = validateTransferDraft({
    fromWarehouse: "KHO-TONG",
    toWarehouse: "KHO-TONG",
    items: [{ item_id: "sp1", item_type: "san_pham", quantity: 5 }],
    sourceStockMap: stockMap,
  });
  assert.equal(sameRes.valid, false);

  const shortRes = validateTransferDraft({
    fromWarehouse: "KHO-TONG",
    toWarehouse: "KHO-SHOWROOM",
    items: [{ item_id: "sp1", item_type: "san_pham", item_code: "SP-01", quantity: 15 }],
    sourceStockMap: stockMap,
  });
  assert.equal(shortRes.valid, false);
  assert.equal(shortRes.code, "INSUFFICIENT_SOURCE_STOCK");

  const okRes = validateTransferDraft({
    fromWarehouse: "KHO-TONG",
    toWarehouse: "KHO-SHOWROOM",
    items: [{ item_id: "sp1", item_type: "san_pham", item_code: "SP-01", quantity: 8 }],
    sourceStockMap: stockMap,
  });
  assert.equal(okRes.valid, true);
  assert.equal(okRes.items[0].quantity, 8);
});

test("StockTransfer - computes transit receipt discrepancy & loss accurately", () => {
  const delta = computeTransferReceiptDelta(
    [
      { item_id: "sp1", item_type: "san_pham", quantity: 10 },
      { item_id: "sp2", item_type: "san_pham", quantity: 5 },
    ],
    [{ item_id: "sp1", item_type: "san_pham", received_qty: 8 }]
  );

  assert.equal(delta.total_dispatched, 15);
  assert.equal(delta.total_received, 13);
  assert.equal(delta.total_loss, 2);
  assert.equal(delta.has_discrepancy, true);
  assert.equal(delta.lines[0].loss_qty, 2);
  assert.equal(delta.lines[1].received_qty, 5);
});
