import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Bộ kiểm thử Kiểm soát Chất lượng Sản xuất (QC Yield / Scrap Rate) & Đổi trả Hàng lỗi RMA (doi_tra_hang)
 * Bao phủ:
 * - Kiểm định chất lượng công đoạn assembly_qc: tính Yield Rate & Scrap Rate
 * - Cảnh báo vượt ngưỡng phế phẩm (> 5%)
 * - Chỉ cộng tồn kho thành phẩm cho sản lượng đạt chuẩn QC
 * - Quy trình Đổi trả Hàng lỗi RMA: đối soát số lượng mua vs đã trả trước đó
 * - Kiểm định QC hàng hoàn RMA: phân loại nhap_lai_kho (restock) vs phe_pham (scrap) vs can_sua_chua (repair)
 * - Tự động tính toán & ghi nhận phiếu chi hoàn tiền Sổ quỹ khi hoàn tất RMA
 */

const QC_RESULT = {
  RESTOCK: "nhap_lai_kho",
  SCRAP: "phe_pham",
  REPAIR: "can_sua_chua",
};

const RMA_STATUS = {
  PENDING: "cho_xu_ly",
  INSPECTING: "kiem_tra_qc",
  APPROVED: "da_duyet",
  COMPLETED: "hoan_thanh",
  REJECTED: "tu_choi",
};

/**
 * Đánh giá kết quả QC tại công đoạn cuối assembly_qc trước khi nhập kho thành phẩm
 */
function evaluateProductionQC({ passedQty, scrapQty, scrapThresholdPct = 5 }) {
  const passed = Number(passedQty || 0);
  const scrap = Number(scrapQty || 0);

  if (passed < 0 || scrap < 0) {
    throw new Error("VALIDATION_ERROR: Sản lượng đạt và phế phẩm không được âm");
  }
  const total = passed + scrap;
  if (total === 0) {
    throw new Error("VALIDATION_ERROR: Tổng sản lượng kiểm định QC phải > 0");
  }

  const yieldRate = Math.round((passed / total) * 1000) / 10;
  const scrapRate = Math.round((scrap / total) * 1000) / 10;

  return {
    passedQty: passed,
    scrapQty: scrap,
    totalInspected: total,
    yieldRate,
    scrapRate,
    finishedGoodsStockToAdd: passed, // Chỉ cộng kho thành phẩm số lượng ĐẠT CHUẨN
    scrapAlertTriggered: scrapRate > scrapThresholdPct,
  };
}

/**
 * Tạo phiếu đổi trả RMA và kiểm tra hạn mức số lượng chưa hoàn trả của đơn hàng
 */
function createRmaRequest({ order, requestedItems, previousRmas = [], refundMethod = "hoan_chuyen_khoan" }) {
  if (!order) throw new Error("NOT_FOUND: Không tìm thấy đơn hàng gốc");
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new Error("VALIDATION_ERROR: Cần ít nhất 1 sản phẩm yêu cầu đổi trả");
  }

  const returnedQtyMap = new Map();
  for (const rma of previousRmas) {
    if (rma.trang_thai === RMA_STATUS.REJECTED) continue;
    for (const item of rma.san_pham || []) {
      returnedQtyMap.set(item.ma_sp, (returnedQtyMap.get(item.ma_sp) || 0) + Number(item.so_luong || 0));
    }
  }

  let tongTienHoan = 0;
  const normalizedItems = requestedItems.map((reqItem) => {
    const orderLine = (order.san_pham || []).find((op) => op.ma_sp === reqItem.ma_sp);
    if (!orderLine) {
      throw new Error(`VALIDATION_ERROR: Sản phẩm ${reqItem.ma_sp} không thuộc đơn hàng ${order.ma_dh}`);
    }

    const reqQty = Number(reqItem.so_luong || 0);
    if (reqQty <= 0) {
      throw new Error("VALIDATION_ERROR: Số lượng đổi trả phải > 0");
    }

    const boughtQty = Number(orderLine.so_luong || 0);
    const alreadyReturned = returnedQtyMap.get(reqItem.ma_sp) || 0;
    const remainingAllowed = Math.max(0, boughtQty - alreadyReturned);

    if (reqQty > remainingAllowed) {
      throw new Error(
        `EXCEED_RETURN_LIMIT: Số lượng đổi trả (${reqQty}) vượt quá số lượng còn lại (${remainingAllowed})`
      );
    }

    const unitPrice = Number(orderLine.don_gia || 0);
    const subtotal = reqQty * unitPrice;
    tongTienHoan += subtotal;

    return {
      ma_sp: reqItem.ma_sp,
      so_luong: reqQty,
      don_gia: unitPrice,
      thanh_tien: subtotal,
      qc_result: null,
    };
  });

  return {
    ma_rma: `RMA-TEST-${Date.now()}`,
    ma_dh: order.ma_dh,
    san_pham: normalizedItems,
    tong_tien_hoan: tongTienHoan,
    phuong_an_hoan_tien: refundMethod,
    trang_thai: RMA_STATUS.PENDING,
    ma_phieu_chi: null,
  };
}

/**
 * Xử lý kiểm định QC hàng hoàn trả & cập nhật tồn kho + Sổ quỹ hoàn tiền
 */
function processRmaQCAndComplete(rma, qcDetails = [], productStockMap, cashbookEntries = []) {
  if (rma.trang_thai === RMA_STATUS.COMPLETED || rma.trang_thai === RMA_STATUS.REJECTED) {
    throw new Error("ALREADY_PROCESSED: Phiếu RMA đã hoàn tất hoặc bị từ chối");
  }

  let restockedQty = 0;
  let scrappedQty = 0;
  let repairQty = 0;

  for (const item of rma.san_pham) {
    const qc = qcDetails.find((q) => q.ma_sp === item.ma_sp);
    const verdict = qc?.qc_result || QC_RESULT.SCRAP;
    if (!Object.values(QC_RESULT).includes(verdict)) {
      throw new Error(`INVALID_QC_RESULT: Kết luận QC '${verdict}' không hợp lệ`);
    }
    item.qc_result = verdict;

    if (verdict === QC_RESULT.RESTOCK) {
      productStockMap.set(item.ma_sp, (productStockMap.get(item.ma_sp) || 0) + item.so_luong);
      restockedQty += item.so_luong;
    } else if (verdict === QC_RESULT.SCRAP) {
      scrappedQty += item.so_luong;
    } else if (verdict === QC_RESULT.REPAIR) {
      repairQty += item.so_luong;
    }
  }

  if (rma.phuong_an_hoan_tien !== "can_tru_cong_no" && rma.tong_tien_hoan > 0) {
    const voucherCode = `PC-RMA-${rma.ma_rma}`;
    cashbookEntries.push({
      ma_phieu: voucherCode,
      loai: "chi",
      so_tien: rma.tong_tien_hoan,
      noi_dung: `Hoàn tiền đổi trả ${rma.ma_rma}`,
    });
    rma.ma_phieu_chi = voucherCode;
  }

  rma.trang_thai = RMA_STATUS.COMPLETED;
  return { rma, restockedQty, scrappedQty, repairQty };
}

describe("Production QC Yield & RMA Quality Inspection", () => {
  it("calculates QC yield/scrap rate and triggers alert when scrap > 5%", () => {
    const goodBatch = evaluateProductionQC({ passedQty: 96, scrapQty: 4 });
    assert.equal(goodBatch.yieldRate, 96.0);
    assert.equal(goodBatch.scrapRate, 4.0);
    assert.equal(goodBatch.finishedGoodsStockToAdd, 96);
    assert.equal(goodBatch.scrapAlertTriggered, false);

    const badBatch = evaluateProductionQC({ passedQty: 90, scrapQty: 10 });
    assert.equal(badBatch.yieldRate, 90.0);
    assert.equal(badBatch.scrapRate, 10.0);
    assert.equal(badBatch.finishedGoodsStockToAdd, 90);
    assert.equal(badBatch.scrapAlertTriggered, true);
  });

  it("enforces cumulative return quantity limits across multiple RMA requests", () => {
    const order = {
      ma_dh: "DH-2026-099",
      san_pham: [{ ma_sp: "SP-01", so_luong: 5, don_gia: 1200000 }],
    };

    const previousRmas = [
      { trang_thai: RMA_STATUS.COMPLETED, san_pham: [{ ma_sp: "SP-01", so_luong: 3 }] },
      { trang_thai: RMA_STATUS.REJECTED, san_pham: [{ ma_sp: "SP-01", so_luong: 2 }] }, // Bị từ chối nên không tính vào quota
    ];

    // Còn lại 5 - 3 = 2 sản phẩm có thể đổi trả
    assert.throws(
      () =>
        createRmaRequest({
          order,
          requestedItems: [{ ma_sp: "SP-01", so_luong: 3 }],
          previousRmas,
        }),
      /EXCEED_RETURN_LIMIT/
    );

    const validRma = createRmaRequest({
      order,
      requestedItems: [{ ma_sp: "SP-01", so_luong: 2 }],
      previousRmas,
    });
    assert.equal(validRma.tong_tien_hoan, 2400000);
    assert.equal(validRma.trang_thai, RMA_STATUS.PENDING);
  });

  it("routes restocked items back to sellable stock, isolates scrap, and generates cashbook refund", () => {
    const order = {
      ma_dh: "DH-2026-100",
      san_pham: [
        { ma_sp: "SP-A", so_luong: 4, don_gia: 500000 },
        { ma_sp: "SP-B", so_luong: 2, don_gia: 1000000 },
      ],
    };

    const rma = createRmaRequest({
      order,
      requestedItems: [
        { ma_sp: "SP-A", so_luong: 2 },
        { ma_sp: "SP-B", so_luong: 1 },
      ],
      refundMethod: "hoan_chuyen_khoan",
    });

    const productStock = new Map([
      ["SP-A", 10],
      ["SP-B", 5],
    ]);
    const cashbook = [];

    const result = processRmaQCAndComplete(
      rma,
      [
        { ma_sp: "SP-A", qc_result: QC_RESULT.RESTOCK },
        { ma_sp: "SP-B", qc_result: QC_RESULT.SCRAP },
      ],
      productStock,
      cashbook
    );

    assert.equal(result.restockedQty, 2);
    assert.equal(result.scrappedQty, 1);
    assert.equal(productStock.get("SP-A"), 12); // Đạt QC -> nhập lại kho
    assert.equal(productStock.get("SP-B"), 5); // Phế phẩm -> KHÔNG cộng lại kho bán hàng
    assert.equal(cashbook.length, 1);
    assert.equal(cashbook[0].so_tien, 2000000);
    assert.equal(rma.trang_thai, RMA_STATUS.COMPLETED);
  });
});
