/**
 * crmIntelligence.js — Phân tích CRM Thông Minh: RFM Segmentation & Churn Risk (pure module)
 *
 * - Recency (R): Số ngày kể từ lần mua gần nhất (càng nhỏ điểm càng cao)
 * - Frequency (F): Tổng số đơn hàng hợp lệ
 * - Monetary (M): Tổng giá trị mua hàng (LTV)
 * - Churn Risk: So sánh thời gian chưa quay lại với chu kỳ mua trung bình (avgCycleDays) của chính khách đó
 */

function scoreByQuantile(value, sortedAsc, invert = false) {
  if (!sortedAsc.length) return 1;
  let pos = 0;
  for (let i = 0; i < sortedAsc.length; i++) {
    if (value >= sortedAsc[i]) pos = i;
  }
  const pct = sortedAsc.length === 1 ? 1 : pos / (sortedAsc.length - 1);
  const raw = Math.min(5, Math.max(1, Math.ceil((pct + 0.0001) * 5)));
  return invert ? 6 - raw : raw;
}

function classifyRfmSegment(r, f, m, orderCount) {
  if (orderCount === 0) return { code: "NEW_INACTIVE", label: "Mới / Chưa mua" };
  if (r >= 4 && f >= 4 && m >= 4) return { code: "CHAMPIONS", label: "Khách VIP (Champions)" };
  if (r >= 3 && f >= 3) return { code: "LOYAL", label: "Trung thành (Loyal)" };
  if (r >= 4 && f <= 2) return { code: "POTENTIAL", label: "Tiềm năng (Potential)" };
  if (r <= 2 && (f >= 3 || m >= 3)) return { code: "AT_RISK", label: "Cần giữ chân (At Risk)" };
  return { code: "HIBERNATING", label: "Ngủ đông (Hibernating)" };
}

/**
 * Tính phân khúc RFM & nguy cơ rời bỏ (Churn Risk) cho danh sách khách hàng.
 */
export function computeCrmRfmAndChurn(partners = [], salesOrders = [], now = new Date()) {
  const nowMs = now.getTime();
  const ordersByPartnerId = new Map();
  const ordersByName = new Map();

  for (const order of salesOrders || []) {
    if (!order) continue;
    const status = String(order.trang_thai || "").toLowerCase();
    if (status === "cancelled" || status === "deleted" || status === "draft") continue;

    const d = new Date(order.ngay_dat || order.created_at || now);
    if (Number.isNaN(d.getTime())) continue;
    const amount = Math.max(0, Number(order.tong_tien || 0));

    const pid = order.doi_tac_id ? String(order.doi_tac_id) : "";
    const nameKey = String(order.khach_hang_ten || "").trim().toLowerCase();

    if (pid) {
      if (!ordersByPartnerId.has(pid)) ordersByPartnerId.set(pid, []);
      ordersByPartnerId.get(pid).push({ dateMs: d.getTime(), amount });
    } else if (nameKey) {
      if (!ordersByName.has(nameKey)) ordersByName.set(nameKey, []);
      ordersByName.get(nameKey).push({ dateMs: d.getTime(), amount });
    }
  }

  const rawRows = (partners || [])
    .filter((p) => p && p.loai_doi_tac !== "nha_cung_cap" && p.trang_thai !== "deleted")
    .map((p) => {
      const id = String(p._id || "");
      const nameKey = String(p.ten || p.ten_doi_tac || "").trim().toLowerCase();
      const list = [
        ...(ordersByPartnerId.get(id) || []),
        ...(ordersByName.get(nameKey) || []),
      ].sort((a, b) => a.dateMs - b.dateMs);

      const frequency = list.length;
      const monetary = list.reduce((s, o) => s + o.amount, 0);
      const lastOrderMs = frequency > 0 ? list[frequency - 1].dateMs : null;
      const recencyDays =
        lastOrderMs !== null ? Math.max(0, Math.round((nowMs - lastOrderMs) / 86_400_000)) : null;

      // Tính chu kỳ mua trung bình (ngày giữa các đơn) nếu khách có >= 2 đơn
      let avgCycleDays = null;
      if (frequency >= 2) {
        let totalGap = 0;
        for (let i = 1; i < list.length; i++) {
          totalGap += Math.max(1, (list[i].dateMs - list[i - 1].dateMs) / 86_400_000);
        }
        avgCycleDays = Math.round(totalGap / (frequency - 1));
      }

      return {
        _id: id,
        ma_doi_tac: p.ma_doi_tac || null,
        ten: p.ten || p.ten_doi_tac || "Khách hàng",
        so_dien_thoai: p.so_dien_thoai || "",
        nhom: p.nhom || "khach_le",
        frequency,
        monetary: Math.round(monetary),
        recencyDays,
        avgCycleDays,
        lastOrderDate: lastOrderMs ? new Date(lastOrderMs).toISOString().slice(0, 10) : null,
      };
    });

  const activeRows = rawRows.filter((r) => r.frequency > 0);
  const recenciesAsc = activeRows.map((r) => r.recencyDays).sort((a, b) => a - b);
  const freqsAsc = activeRows.map((r) => r.frequency).sort((a, b) => a - b);
  const moneysAsc = activeRows.map((r) => r.monetary).sort((a, b) => a - b);

  const customers = rawRows.map((row) => {
    const rScore = row.frequency > 0 ? scoreByQuantile(row.recencyDays, recenciesAsc, true) : 1;
    const fScore = row.frequency > 0 ? scoreByQuantile(row.frequency, freqsAsc, false) : 1;
    const mScore = row.frequency > 0 ? scoreByQuantile(row.monetary, moneysAsc, false) : 1;
    const segment = classifyRfmSegment(rScore, fScore, mScore, row.frequency);

    // Đánh giá nguy cơ rời bỏ (Churn Risk)
    let churnRisk = "low";
    let churnReason = "Đang duy trì nhịp mua ổn định";
    if (row.frequency === 0) {
      churnRisk = "low";
      churnReason = "Khách hàng mới chưa phát sinh đơn";
    } else if (
      (row.avgCycleDays !== null && row.recencyDays > Math.max(30, Math.round(row.avgCycleDays * 1.5))) ||
      row.recencyDays > 90
    ) {
      churnRisk = "high";
      churnReason =
        row.avgCycleDays !== null
          ? `Đã ${row.recencyDays} ngày chưa mua (vượt 1.5x chu kỳ TB ${row.avgCycleDays} ngày)`
          : `Đã ${row.recencyDays} ngày chưa quay lại mua hàng`;
    } else if (
      (row.avgCycleDays !== null && row.recencyDays > Math.max(21, Math.round(row.avgCycleDays * 1.2))) ||
      row.recencyDays > 60
    ) {
      churnRisk = "medium";
      churnReason =
        row.avgCycleDays !== null
          ? `Sắp vượt chu kỳ mua trung bình (${row.recencyDays}/${row.avgCycleDays} ngày)`
          : `Đã ${row.recencyDays} ngày kể từ đơn gần nhất`;
    }

    return {
      ...row,
      rfm: { r: rScore, f: fScore, m: mScore, score: `${rScore}${fScore}${mScore}` },
      segmentCode: segment.code,
      segmentLabel: segment.label,
      churnRisk,
      churnReason,
    };
  });

  // Ưu tiên hiển thị khách có nguy cơ rời bỏ cao và LTV lớn lên đầu
  const riskRank = { high: 0, medium: 1, low: 2 };
  customers.sort((a, b) => riskRank[a.churnRisk] - riskRank[b.churnRisk] || b.monetary - a.monetary);

  return {
    summary: {
      totalCustomers: customers.length,
      championsCount: customers.filter((c) => c.segmentCode === "CHAMPIONS").length,
      loyalCount: customers.filter((c) => c.segmentCode === "LOYAL").length,
      atRiskCount: customers.filter((c) => c.segmentCode === "AT_RISK").length,
      highChurnCount: customers.filter((c) => c.churnRisk === "high").length,
    },
    customers,
  };
}
