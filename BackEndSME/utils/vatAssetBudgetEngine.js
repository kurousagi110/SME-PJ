/**
 * Pure Accounting Expansion Engine:
 * 1. Bảng kê Thuế GTGT (VAT Đầu ra / Đầu vào) chuẩn kê khai HTKK.
 * 2. Tài sản cố định & Khấu hao đường thẳng (Straight-Line Depreciation).
 * 3. Dự toán Ngân sách theo phòng ban (Budget vs Actual Variance).
 */

/* ══════════════════ 1. THUẾ GTGT (VAT DECLARATION) ══════════════════ */

export function computeVatDeclaration({
  salesOrders = [],
  purchaseOrders = [],
  defaultVatRate = 8,
} = {}) {
  const fallbackRate = Math.max(0, Number(defaultVatRate) || 0);

  const outputInvoices = [];
  let totalOutputTaxable = 0;
  let totalOutputVat = 0;

  for (const o of Array.isArray(salesOrders) ? salesOrders : []) {
    const subtotal = Math.max(0, Number(o.tam_tinh ?? o.tong_tien ?? 0) - Number(o.giam_gia || 0));
    const hasExplicitVat = Number(o.thue_tien || 0) > 0 || Number(o.thue_rate || 0) > 0;
    const vatRate = hasExplicitVat ? Number(o.thue_rate || 0) : fallbackRate;
    const vatAmount =
      Number(o.thue_tien || 0) > 0
        ? Math.round(Number(o.thue_tien))
        : Math.round((subtotal * vatRate) / 100);

    totalOutputTaxable += subtotal;
    totalOutputVat += vatAmount;

    outputInvoices.push({
      ma_chung_tu: o.ma_dh || String(o._id || ""),
      ngay: o.ngay_dat || o.created_at || null,
      doi_tuong: o.khach_hang_ten || "Khách hàng lẻ",
      doanh_thu_chua_thue: Math.round(subtotal),
      thue_suat: vatRate,
      tien_thue_gtgt: vatAmount,
      tong_thanh_toan: Math.round(subtotal + vatAmount),
    });
  }

  const inputInvoices = [];
  let totalInputTaxable = 0;
  let totalInputVat = 0;

  for (const p of Array.isArray(purchaseOrders) ? purchaseOrders : []) {
    const subtotal = Math.max(0, Number(p.tam_tinh ?? p.tong_tien ?? 0) - Number(p.giam_gia || 0));
    const hasExplicitVat = Number(p.thue_tien || 0) > 0 || Number(p.thue_rate || 0) > 0;
    const vatRate = hasExplicitVat ? Number(p.thue_rate || 0) : fallbackRate;
    const vatAmount =
      Number(p.thue_tien || 0) > 0
        ? Math.round(Number(p.thue_tien))
        : Math.round((subtotal * vatRate) / 100);

    totalInputTaxable += subtotal;
    totalInputVat += vatAmount;

    inputInvoices.push({
      ma_chung_tu: p.ma_dh || String(p._id || ""),
      ngay: p.ngay_dat || p.created_at || null,
      doi_tuong: p.nha_cung_cap_ten || "Nhà cung cấp",
      gia_tri_chua_thue: Math.round(subtotal),
      thue_suat: vatRate,
      tien_thue_gtgt: vatAmount,
      tong_thanh_toan: Math.round(subtotal + vatAmount),
    });
  }

  const netVat = Math.round(totalOutputVat - totalInputVat);
  return {
    summary: {
      output_invoice_count: outputInvoices.length,
      input_invoice_count: inputInvoices.length,
      total_output_taxable: Math.round(totalOutputTaxable),
      total_output_vat: Math.round(totalOutputVat),
      total_input_taxable: Math.round(totalInputTaxable),
      total_input_vat: Math.round(totalInputVat),
      vat_payable: Math.max(0, netVat),
      vat_credit_carryforward: Math.max(0, -netVat),
      net_vat: netVat,
    },
    output_invoices: outputInvoices,
    input_invoices: inputInvoices,
  };
}

/* ══════════════════ 2. TÀI SẢN CỐ ĐỊNH & KHẤU HAO ĐƯỜNG THẲNG ══════════════════ */

export function computeMonthlyDepreciation(asset = {}) {
  const originalCost = Math.max(0, Number(asset.original_cost || 0));
  const salvageValue = Math.min(originalCost, Math.max(0, Number(asset.salvage_value || 0)));
  const usefulMonths = Math.max(1, Math.floor(Number(asset.useful_life_months || 36)));
  const accumulated = Math.min(
    originalCost - salvageValue,
    Math.max(0, Number(asset.accumulated_depreciation || 0))
  );

  const depreciableBase = Math.max(0, originalCost - salvageValue);
  const remainingDepreciable = Math.max(0, depreciableBase - accumulated);
  const rawMonthly = Math.round(depreciableBase / usefulMonths);
  const nextMonthlyAmount = remainingDepreciable > 0 ? Math.min(rawMonthly, remainingDepreciable) : 0;
  const netBookValue = Math.max(salvageValue, originalCost - accumulated);
  const remainingMonths = rawMonthly > 0 ? Math.ceil(remainingDepreciable / rawMonthly) : 0;

  return {
    original_cost: originalCost,
    salvage_value: salvageValue,
    useful_life_months: usefulMonths,
    accumulated_depreciation: Math.round(accumulated),
    net_book_value: Math.round(netBookValue),
    monthly_depreciation: rawMonthly,
    next_depreciation_amount: nextMonthlyAmount,
    remaining_months: remainingMonths,
    is_fully_depreciated: remainingDepreciable <= 0,
  };
}

export function computeBatchDepreciationRun(assets = [], { month, year } = {}) {
  const periodKey = `${year}-${String(month).padStart(2, "0")}`;
  const entries = [];
  let totalAmount = 0;

  for (const asset of Array.isArray(assets) ? assets : []) {
    if (asset.status === "disposed" || asset.status === "deleted") continue;
    const historyPeriods = Array.isArray(asset.depreciated_periods) ? asset.depreciated_periods : [];
    if (historyPeriods.includes(periodKey)) continue;

    const calc = computeMonthlyDepreciation(asset);
    if (calc.next_depreciation_amount <= 0) continue;

    totalAmount += calc.next_depreciation_amount;
    entries.push({
      asset_id: asset._id,
      ma_tai_san: asset.ma_tai_san,
      ten_tai_san: asset.ten_tai_san,
      department: asset.department || "Xưởng sản xuất",
      amount: calc.next_depreciation_amount,
      new_accumulated: calc.accumulated_depreciation + calc.next_depreciation_amount,
      new_book_value: Math.max(calc.salvage_value, calc.net_book_value - calc.next_depreciation_amount),
    });
  }

  return {
    period_key: periodKey,
    asset_count: entries.length,
    total_depreciation: Math.round(totalAmount),
    entries,
  };
}

/* ══════════════════ 3. DỰ TOÁN NGÂN SÁCH (BUDGET VS ACTUAL) ══════════════════ */

export function computeBudgetVarianceRows(budgets = [], actualSpendByKey = new Map()) {
  let totalPlanned = 0;
  let totalActual = 0;
  let exceededCount = 0;
  let warningCount = 0;

  const rows = (Array.isArray(budgets) ? budgets : []).map((b) => {
    const planned = Math.max(0, Number(b.planned_amount || 0));
    const key = `${String(b.department || "").toLowerCase()}|${String(b.category || "all").toLowerCase()}`;
    const fallbackKey = `${String(b.department || "").toLowerCase()}|all`;
    const actual = Math.max(
      0,
      Number(actualSpendByKey.get(key) ?? actualSpendByKey.get(fallbackKey) ?? b.actual_amount ?? 0)
    );
    const remaining = Math.round(planned - actual);
    const utilizationPct = planned > 0 ? Math.round((actual / planned) * 1000) / 10 : actual > 0 ? 100 : 0;

    let alertStatus = "OK";
    if (utilizationPct > 100) {
      alertStatus = "EXCEEDED";
      exceededCount += 1;
    } else if (utilizationPct >= 80) {
      alertStatus = "WARNING";
      warningCount += 1;
    }

    totalPlanned += planned;
    totalActual += actual;

    return {
      ...b,
      planned_amount: Math.round(planned),
      actual_amount: Math.round(actual),
      remaining_amount: remaining,
      utilization_pct: utilizationPct,
      alert_status: alertStatus,
    };
  });

  return {
    summary: {
      total_planned: Math.round(totalPlanned),
      total_actual: Math.round(totalActual),
      total_remaining: Math.round(totalPlanned - totalActual),
      overall_utilization_pct:
        totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 1000) / 10 : 0,
      exceeded_count: exceededCount,
      warning_count: warningCount,
    },
    rows,
  };
}
