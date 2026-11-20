/**
 * bankReconcileEngine.js — Thuật toán đối soát sao kê ngân hàng thông minh (pure module)
 *
 * Cải tiến so với đối soát cũ (findOne từng dòng):
 * - Nhận toàn bộ tập ứng viên sổ quỹ đã batch-fetch (khử N+1 query).
 * - Trích xuất mã chứng từ (DH-..., HD-..., PT-..., PC-..., BG-...) từ nội dung chuyển khoản.
 * - Chấm điểm đa tiêu chí: Mã chứng từ + Số tiền + Độ gần ngày giao dịch + Tên đối tác.
 * - Chống khớp trùng 1 phiếu sổ quỹ cho 2 giao dịch ngân hàng cùng số tiền (usedLedgerIds).
 */

function normalizeText(str = "") {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Trích xuất các mã chứng từ ERP phổ biến từ nội dung giao dịch ngân hàng.
 * Ví dụ: "CK thanh toan DH-2026-0012", "Thu tien dot 1 HD-2026-0005", "PT-123456"
 * @param {string} content
 * @returns {string[]}
 */
export function extractReferenceCodes(content = "") {
  const raw = String(content || "").toUpperCase();
  const matches = raw.match(/\b(?:DH|HD|PT|PC|BG|RMA|PO|LSX)[-_]?[A-Z0-9_-]{3,24}\b/g) || [];
  return [...new Set(matches.map((m) => m.replace(/_/g, "-")))];
}

function parseDateSafe(val) {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diffDaysAbs(d1, d2) {
  if (!d1 || !d2) return null;
  return Math.abs(d1.getTime() - d2.getTime()) / 86_400_000;
}

/**
 * Chấm điểm mức độ khớp giữa 1 giao dịch sao kê và 1 phiếu sổ quỹ.
 */
function scoreCandidate({ txContentNorm, txCodes, txDate, entry }) {
  let score = 40; // Đã khớp đúng loại (thu/chi) và số tiền
  const reasons = ["Khớp số tiền & loại giao dịch"];

  const entryCode = String(entry.ma_phieu || "").toUpperCase();
  const refDocCode = String(entry.ma_chung_tu || "").toUpperCase();
  const entryNoteNorm = normalizeText(`${entry.ghi_chu || ""} ${entry.ly_do || ""}`);
  const partnerNameNorm = normalizeText(entry.doi_tuong?.ten || "");

  // 1. Khớp mã chứng từ (ưu tiên cao nhất)
  let hasCodeMatch = false;
  if (txCodes.length > 0) {
    for (const code of txCodes) {
      const compactCode = code.replace(/-/g, "");
      const compactEntry = entryCode.replace(/-/g, "");
      const compactRef = refDocCode.replace(/-/g, "");
      if (
        (entryCode && (code === entryCode || compactCode === compactEntry)) ||
        (refDocCode && (code === refDocCode || compactCode === compactRef)) ||
        (entryNoteNorm && entryNoteNorm.includes(code.toLowerCase()))
      ) {
        score += 45;
        hasCodeMatch = true;
        reasons.push(`Khớp mã chứng từ ${code}`);
        break;
      }
    }
  } else if (refDocCode && txContentNorm.includes(refDocCode.toLowerCase())) {
    score += 45;
    hasCodeMatch = true;
    reasons.push(`Khớp mã chứng từ ${refDocCode}`);
  }

  // 2. Độ gần ngày ghi nhận
  const entryDate = parseDateSafe(entry.ngay_ghi_nhan || entry.created_at);
  const daysDelta = diffDaysAbs(txDate, entryDate);
  if (daysDelta !== null) {
    if (daysDelta <= 1.5) {
      score += 15;
      reasons.push("Cùng ngày hoặc lệch ≤ 1 ngày");
    } else if (daysDelta <= 3.5) {
      score += 10;
      reasons.push(`Lệch ${Math.round(daysDelta)} ngày`);
    } else if (daysDelta <= 7.5) {
      score += 5;
      reasons.push(`Lệch ${Math.round(daysDelta)} ngày`);
    } else if (daysDelta > 30) {
      score -= 10;
    }
  }

  // 3. Khớp tên đối tác trong nội dung chuyển khoản
  if (partnerNameNorm.length >= 3 && txContentNorm.includes(partnerNameNorm)) {
    score += 10;
    reasons.push("Khớp tên đối tác");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const matchQuality = hasCodeMatch
    ? "EXACT_REF"
    : daysDelta !== null && daysDelta <= 3.5
    ? "EXACT_AMOUNT_DATE"
    : "AMOUNT_ONLY";

  return { score: finalScore, matchQuality, reasons, daysDelta };
}

/**
 * Đối soát danh sách giao dịch sao kê với danh sách phiếu sổ quỹ đã nạp sẵn.
 * @param {Array<object>} transactions
 * @param {Array<object>} ledgerEntries
 */
export function reconcileBankTransactions(transactions = [], ledgerEntries = []) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { ok: false, message: "Danh sách giao dịch sao kê trống" };
  }

  // Đánh chỉ mục phiếu sổ quỹ theo khóa `${loai_phieu}:${so_tien}` để tra cứu O(1)
  const bucketMap = new Map();
  for (const entry of ledgerEntries || []) {
    if (!entry) continue;
    if (entry.trang_thai && entry.trang_thai !== "active") continue;
    const type = entry.loai_phieu === "chi" ? "chi" : "thu";
    const amount = Math.round(Math.abs(Number(entry.so_tien || 0)));
    const key = `${type}:${amount}`;
    if (!bucketMap.has(key)) bucketMap.set(key, []);
    bucketMap.get(key).push(entry);
  }

  const usedLedgerIds = new Set();
  const matched = [];
  const unmatchedBank = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i] || {};
    const rawAmt = Number(tx.amount ?? tx.so_tien ?? 0);
    const amount = Math.round(Math.abs(rawAmt));
    const type =
      String(tx.type || "").toUpperCase() === "OUT" ||
      String(tx.loai_phieu || "").toLowerCase() === "chi" ||
      rawAmt < 0
        ? "chi"
        : "thu";

    const content = String(tx.content || tx.description || tx.noi_dung || "").trim();
    const txContentNorm = normalizeText(content);
    const txCodes = extractReferenceCodes(content);
    const txDate = parseDateSafe(tx.date || tx.ngay || tx.transaction_date);

    const candidates = (bucketMap.get(`${type}:${amount}`) || []).filter((entry, idx) => {
      const entryKey = String(entry._id || entry.ma_phieu || `${type}:${amount}:${idx}`);
      return !usedLedgerIds.has(entryKey);
    });

    let bestCandidate = null;
    let bestEval = null;
    let bestKey = null;

    for (let j = 0; j < candidates.length; j++) {
      const entry = candidates[j];
      const entryKey = String(entry._id || entry.ma_phieu || `${type}:${amount}:c${j}`);
      const evaluation = scoreCandidate({ txContentNorm, txCodes, txDate, entry });

      if (
        !bestEval ||
        evaluation.score > bestEval.score ||
        (evaluation.score === bestEval.score &&
          (evaluation.daysDelta ?? 9999) < (bestEval.daysDelta ?? 9999))
      ) {
        bestCandidate = entry;
        bestEval = evaluation;
        bestKey = entryKey;
      }
    }

    if (bestCandidate && bestEval) {
      usedLedgerIds.add(bestKey);
      matched.push({
        bankTx: tx,
        ledgerEntry: {
          _id: bestCandidate._id ? String(bestCandidate._id) : undefined,
          ma_phieu: bestCandidate.ma_phieu,
          ma_chung_tu: bestCandidate.ma_chung_tu || null,
          ngay_ghi_nhan: bestCandidate.ngay_ghi_nhan,
          so_tien: bestCandidate.so_tien,
          loai_phieu: bestCandidate.loai_phieu,
          ly_do: bestCandidate.ly_do || bestCandidate.ghi_chu || "",
        },
        status: "MATCHED",
        confidenceScore: bestEval.score,
        matchQuality: bestEval.matchQuality,
        matchReasons: bestEval.reasons,
      });
    } else {
      const duplicateHint =
        (bucketMap.get(`${type}:${amount}`) || []).length > 0
          ? " (Lưu ý: phiếu sổ quỹ cùng số tiền đã được ghép cho giao dịch khác)"
          : "";
      unmatchedBank.push({
        bankTx: tx,
        extractedCodes: txCodes,
        status: "UNMATCHED_IN_LEDGER",
        suggestedAction: `Cần lập ${type === "thu" ? "Phiếu Thu" : "Phiếu Chi"} số tiền ${amount.toLocaleString(
          "vi-VN"
        )} đ${duplicateHint}`,
      });
    }
  }

  return {
    ok: true,
    totalChecked: transactions.length,
    matchedCount: matched.length,
    unmatchedCount: unmatchedBank.length,
    matchedRate: Math.round((matched.length / transactions.length) * 100),
    matched,
    unmatchedBank,
  };
}
