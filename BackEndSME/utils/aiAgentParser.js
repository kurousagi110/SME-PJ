/**
 * Pure Agentic Intent, RBAC Tool Filtering, Chat History & Invoice OCR Parser
 * (zero external dependencies)
 */

import { isAdminUserRecord, hasPermission } from "./permissions.js";

function removeAccents(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Chuẩn hóa lịch sử hội thoại nhiều lượt (Multi-turn) gửi lên LLM.
 * Giới hạn số lượt và độ dài mỗi tin nhắn để chống tràn context / prompt bloat.
 */
export function sanitizeChatHistory(history = [], maxMessages = 10, maxChars = 1200) {
  if (!Array.isArray(history)) return [];
  const clean = [];
  for (const item of history.slice(-maxMessages)) {
    if (!item || typeof item !== "object") continue;
    const rawRole = String(item.role || item.sender || "").toLowerCase();
    const role = rawRole === "user" ? "user" : rawRole === "assistant" || rawRole === "ai" || rawRole === "model" ? "assistant" : null;
    const text = String(item.content ?? item.text ?? "").trim();
    if (!role || !text) continue;
    clean.push({
      role,
      content: text.length > maxChars ? `${text.slice(0, maxChars)}…` : text,
    });
  }
  return clean;
}

/**
 * Định nghĩa các công cụ (Tools) đọc dữ liệu thời gian thực cho AI Copilot
 * kèm danh sách quyền RBAC cần thiết (fail-closed).
 */
export const AI_TOOL_DEFINITIONS = [
  {
    name: "lookup_order",
    label: "Tra cứu đơn hàng",
    description:
      "Tra cứu thông tin chi tiết đơn bán hàng, đơn mua hàng hoặc lệnh sản xuất theo mã đơn (ví dụ DH-..., PO-..., LSX-...) hoặc tên khách hàng.",
    requiredPermissions: ["sales.view", "sales.create", "warehouse.view", "production.view", "finance.view"],
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Mã đơn hàng hoặc tên khách hàng/nhà cung cấp" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "lookup_partner_debt",
    label: "Công nợ đối tác",
    description: "Tra cứu công nợ, hạn mức tín dụng và kỳ hạn thanh toán của một khách hàng hoặc nhà cung cấp.",
    requiredPermissions: ["sales.view", "partners.manage", "finance.view", "finance.manage"],
    parameters: {
      type: "object",
      properties: {
        partner_name: { type: "string", description: "Tên, mã hoặc SĐT đối tác" },
      },
      required: ["partner_name"],
    },
  },
  {
    name: "get_low_stock_and_fefo",
    label: "Tồn kho thấp & Lô FEFO",
    description: "Lấy danh sách nguyên vật liệu, thành phẩm dưới mức tồn tối thiểu và các lô hàng sắp hết hạn.",
    requiredPermissions: ["warehouse.view", "production.view", "purchase.manage"],
    parameters: {
      type: "object",
      properties: {
        fefo_days: { type: "number", description: "Số ngày cảnh báo lô cận hạn (mặc định 15)" },
      },
    },
  },
  {
    name: "estimate_atp",
    label: "Ước tính lịch giao ATP",
    description: "Ước tính ngày giao hàng dự kiến (Available-to-Promise) cho một sản phẩm và số lượng yêu cầu.",
    requiredPermissions: ["sales.view", "sales.create", "production.view", "warehouse.view"],
    parameters: {
      type: "object",
      properties: {
        product_keyword: { type: "string", description: "Tên hoặc mã sản phẩm" },
        quantity: { type: "number", description: "Số lượng khách đặt" },
      },
      required: ["product_keyword", "quantity"],
    },
  },
  {
    name: "get_cashflow_health",
    label: "Sức khỏe dòng tiền",
    description: "Xem dự báo dòng tiền, số dư hiện tại, Monthly Burn Rate, Runway Months và cảnh báo thâm hụt.",
    requiredPermissions: ["finance.view", "finance.manage"],
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Số ngày dự báo (mặc định 90)" },
      },
    },
  },
];

/**
 * Lọc danh sách AI Tool được phép thực thi dựa theo quyền RBAC của người dùng.
 */
export function getAllowedAiTools(user) {
  if (!user) return [];
  if (isAdminUserRecord(user)) return AI_TOOL_DEFINITIONS;
  return AI_TOOL_DEFINITIONS.filter((tool) => hasPermission(user, tool.requiredPermissions));
}

/**
 * Phân tích ý định hành động (Agentic Intent) từ câu chat của người dùng.
 * @param {string} query
 */
export function detectAgenticIntent(query = "") {
  const q = removeAccents(query).trim();
  if (!q) return null;

  // 1. Tạo đơn mua từ MRP
  if (
    (q.includes("tao don mua") || q.includes("dat hang") || q.includes("nhap vat tu")) &&
    (q.includes("mrp") || q.includes("thieu") || q.includes("tu dong") || q.includes("nguyen lieu"))
  ) {
    return {
      type: "CREATE_MRP_PO",
      title: "Tạo Đơn Mua Hàng Tự Động Từ MRP",
      description: "Hệ thống sẽ tổng hợp các nguyên vật liệu đang thiếu hụt theo kế hoạch MRP và tạo đơn mua nháp.",
      buttonLabel: "Thực thi tạo Đơn Mua MRP",
      method: "POST",
      endpoint: "/planning/mrp/tao-don-mua",
      route: "/planning",
    };
  }

  // 2. Tạo báo giá
  if (q.includes("tao bao gia") || q.includes("lap bao gia")) {
    return {
      type: "NAVIGATE",
      title: "Tạo Báo Giá Khách Hàng",
      description: "Chuyển đến phân hệ Báo giá để khởi tạo báo giá nháp và kiểm tra lịch giao ATP.",
      buttonLabel: "Mở trang Báo giá",
      route: "/quotations",
    };
  }

  // 3. Kiểm tra lịch giao ATP
  if (q.includes("atp") || q.includes("lich giao") || q.includes("ngay giao") || q.includes("du hang")) {
    return {
      type: "NAVIGATE",
      title: "Kiểm Tra Năng Lực Đáp Ứng (ATP)",
      description: "Ước tính ngày giao hàng dự kiến dựa trên tồn kho, BOM và hàng đợi xưởng.",
      buttonLabel: "Mở công cụ ATP",
      route: "/planning",
    };
  }

  // 4. Báo cáo tài chính / công nợ
  if (q.includes("bao cao") && (q.includes("tai chinh") || q.includes("cong no") || q.includes("lai lo"))) {
    return {
      type: "NAVIGATE",
      title: "Xem Báo Cáo Tài Chính & Công Nợ",
      description: "Mở bảng tổng hợp doanh thu, chi phí, dòng tiền và công nợ quá hạn.",
      buttonLabel: "Mở Báo cáo Tài chính",
      route: "/financial-reports",
    };
  }

  // 5. Dự báo dòng tiền / runway
  if (q.includes("dong tien") || q.includes("runway") || q.includes("burn rate")) {
    return {
      type: "NAVIGATE",
      title: "Xem Dự Báo Dòng Tiền 12 Tuần",
      description: "Kiểm tra số dư tiền mặt, dòng thu/chi dự phóng và mức an toàn ngân quỹ.",
      buttonLabel: "Mở Dự báo Dòng tiền",
      route: "/financial-reports?tab=cashflow",
    };
  }

  return null;
}

/* ─── Fuzzy Matching Helpers cho OCR Danh Mục ─── */

function levenshteinDistance(a = "", b = "") {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function tokenSimilarity(a = "", b = "") {
  const ta = new Set(a.split(/\s+/).filter((t) => t.length >= 2));
  const tb = new Set(b.split(/\s+/).filter((t) => t.length >= 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersect = 0;
  for (const t of ta) {
    if (tb.has(t)) intersect += 1;
  }
  return (2 * intersect) / (ta.size + tb.size);
}

/**
 * Tìm mặt hàng khớp tốt nhất trong danh mục kho theo mã, substring và fuzzy similarity.
 */
export function matchCatalogItemFuzzy(rawName = "", normalizedCatalog = []) {
  const normName = removeAccents(rawName).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normName) return { matched: null, confidence: 0 };

  let bestItem = null;
  let bestScore = 0;

  for (const c of normalizedCatalog) {
    let score = 0;
    if (c._normCode && (normName === c._normCode || normName.includes(c._normCode))) {
      score = 1.0;
    } else if (c._normName) {
      if (normName === c._normName) {
        score = 1.0;
      } else if (normName.includes(c._normName) || c._normName.includes(normName)) {
        const ratio = Math.min(normName.length, c._normName.length) / Math.max(normName.length, c._normName.length);
        score = Math.max(0.78, ratio);
      } else {
        const tok = tokenSimilarity(normName, c._normName);
        const maxLen = Math.max(normName.length, c._normName.length);
        const lev = maxLen > 0 ? 1 - levenshteinDistance(normName, c._normName) / maxLen : 0;
        score = Math.max(tok, lev * 0.9);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = c;
    }
  }

  if (bestScore >= 0.55 && bestItem) {
    return { matched: bestItem, confidence: Math.round(bestScore * 100) };
  }
  return { matched: null, confidence: 0 };
}

function buildNormalizedCatalog(catalogItems = []) {
  return (catalogItems || []).map((c) => ({
    ...c,
    _normName: removeAccents(c.ten_nl || c.ten_sp || c.ten || "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    _normCode: removeAccents(c.ma_nl || c.ma_sp || c.ma || "").trim(),
  }));
}

/**
 * Bóc tách dữ liệu OCR JSON có cấu trúc (trả về từ Gemini/OpenAI JSON mode)
 * và ghép mờ (fuzzy match) vào danh mục kho.
 */
export function parseStructuredOcrJson(rawInput, catalogItems = []) {
  const normalizedCatalog = buildNormalizedCatalog(catalogItems);
  let parsedObj = rawInput;

  if (typeof rawInput === "string") {
    const cleaned = rawInput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      parsedObj = JSON.parse(cleaned);
    } catch {
      return parseInvoiceTextOrLines(rawInput, catalogItems);
    }
  }

  const rawItems = Array.isArray(parsedObj) ? parsedObj : Array.isArray(parsedObj?.items) ? parsedObj.items : null;
  if (!rawItems) {
    return parseInvoiceTextOrLines(typeof rawInput === "string" ? rawInput : "", catalogItems);
  }

  const items = [];
  for (const row of rawItems) {
    const name = String(row?.name || row?.ten || row?.item_name || "").trim();
    if (!name) continue;
    const qty = Math.max(1, Number(row?.qty ?? row?.so_luong ?? row?.quantity ?? 1) || 1);
    const price = Math.max(0, Number(row?.unit_price ?? row?.don_gia ?? row?.price ?? 0) || 0);
    const { matched, confidence } = matchCatalogItemFuzzy(name, normalizedCatalog);
    const finalPrice = price > 0 ? price : Number(matched?.gia_nhap || matched?.don_gia || 0);

    items.push({
      raw_line: `${name} | ${qty} | ${price}`,
      ten: matched?.ten_nl || matched?.ten_sp || name,
      so_luong: qty,
      don_gia: finalPrice,
      thanh_tien: Math.round(qty * finalPrice),
      matched_id: matched?._id ? String(matched._id) : null,
      matched_code: matched?.ma_nl || matched?.ma_sp || null,
      match_confidence: confidence,
    });
  }

  return {
    items,
    total_items: items.length,
    total_amount: items.reduce((s, it) => s + it.thanh_tien, 0),
  };
}

/**
 * Bóc tách văn bản bảng kê / hóa đơn nhà cung cấp và khớp mờ với danh mục kho.
 * Hỗ trợ nhiều định dạng dòng:
 * - "Gỗ MDF | 20 | 450000"
 * - "1. Gỗ MDF - SL: 20 - Giá: 450.000"
 * - "Gỗ MDF x 20 x 450000"
 */
export function parseInvoiceTextOrLines(rawText = "", catalogItems = []) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const normalizedCatalog = buildNormalizedCatalog(catalogItems);
  const parsedItems = [];

  for (const line of lines) {
    const normLine = removeAccents(line);
    if (normLine.startsWith("stt") || normLine.includes("tong cong") || normLine.includes("thanh tien")) {
      continue;
    }

    const cleanLine = line.replace(/^\d+[.)]\s*/, "");
    let namePart = cleanLine;
    let qty = 1;
    let price = 0;

    const qtyMatch = cleanLine.match(/(?:sl|so\s*luong|qty)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    const priceMatch = cleanLine.match(/(?:gia|don\s*gia|price)\s*[:=]?\s*([\d.,]+)/i);

    if (qtyMatch || priceMatch) {
      if (qtyMatch) qty = Math.max(1, Number(qtyMatch[1].replace(",", ".")) || 1);
      if (priceMatch) price = Math.max(0, Number(priceMatch[1].replace(/[.,]/g, "")) || 0);
      namePart = cleanLine
        .replace(/(?:sl|so\s*luong|qty)\s*[:=]?\s*\d+(?:[.,]\d+)?/gi, "")
        .replace(/(?:gia|don\s*gia|price)\s*[:=]?\s*[\d.,]+/gi, "")
        .replace(/[-|;]+/g, " ")
        .trim();
    } else {
      const parts = cleanLine
        .split(/\s*[|;]\s*|\s+x\s+/i)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        namePart = parts[0];
        const nums = parts
          .slice(1)
          .map((p) => Number(p.replace(/[.,\sđvnd]/gi, "")))
          .filter(Number.isFinite);
        if (nums.length >= 1) qty = Math.max(1, nums[0]);
        if (nums.length >= 2) price = Math.max(0, nums[1]);
      }
    }

    const { matched, confidence } = matchCatalogItemFuzzy(namePart, normalizedCatalog);
    const finalPrice = price > 0 ? price : Number(matched?.gia_nhap || matched?.don_gia || 0);
    parsedItems.push({
      raw_line: line,
      ten: matched?.ten_nl || matched?.ten_sp || namePart,
      so_luong: qty,
      don_gia: finalPrice,
      thanh_tien: Math.round(qty * finalPrice),
      matched_id: matched?._id ? String(matched._id) : null,
      matched_code: matched?.ma_nl || matched?.ma_sp || null,
      match_confidence: confidence,
    });
  }

  return {
    items: parsedItems,
    total_items: parsedItems.length,
    total_amount: parsedItems.reduce((s, it) => s + it.thanh_tien, 0),
  };
}
