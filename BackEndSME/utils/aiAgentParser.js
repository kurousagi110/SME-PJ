/**
 * Pure Agentic Intent & Invoice OCR Text Parser (zero external dependencies)
 */

function removeAccents(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
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
      route: "/financial",
    };
  }

  return null;
}

/**
 * Bóc tách văn bản bảng kê / hóa đơn nhà cung cấp và khớp với danh mục kho.
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

  const normalizedCatalog = (catalogItems || []).map((c) => ({
    ...c,
    _normName: removeAccents(c.ten_nl || c.ten_sp || c.ten || ""),
    _normCode: removeAccents(c.ma_nl || c.ma_sp || c.ma || ""),
  }));

  const parsedItems = [];

  for (const line of lines) {
    // Bỏ qua các dòng tiêu đề phổ biến
    const normLine = removeAccents(line);
    if (normLine.startsWith("stt") || normLine.includes("tong cong") || normLine.includes("thanh tien")) {
      continue;
    }

    // Tách theo dấu | hoặc ; hoặc " - " hoặc " x "
    const cleanLine = line.replace(/^\d+[.)]\s*/, "");
    let namePart = cleanLine;
    let qty = 1;
    let price = 0;

    // Trích xuất SL và Giá rõ ràng nếu có nhãn
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
        const nums = parts.slice(1).map((p) => Number(p.replace(/[.,\sđvnd]/gi, ""))).filter(Number.isFinite);
        if (nums.length >= 1) qty = Math.max(1, nums[0]);
        if (nums.length >= 2) price = Math.max(0, nums[1]);
      }
    }

    // Tìm khớp trong danh mục kho
    const normName = removeAccents(namePart);
    const matched = normalizedCatalog.find(
      (c) =>
        (c._normCode && normName.includes(c._normCode)) ||
        (c._normName && (normName.includes(c._normName) || c._normName.includes(normName)))
    );

    const finalPrice = price > 0 ? price : Number(matched?.gia_nhap || matched?.don_gia || 0);
    parsedItems.push({
      raw_line: line,
      ten: matched?.ten_nl || matched?.ten_sp || namePart,
      so_luong: qty,
      don_gia: finalPrice,
      thanh_tien: Math.round(qty * finalPrice),
      matched_id: matched?._id ? String(matched._id) : null,
      matched_code: matched?.ma_nl || matched?.ma_sp || null,
    });
  }

  return {
    items: parsedItems,
    total_items: parsedItems.length,
    total_amount: parsedItems.reduce((s, it) => s + it.thanh_tien, 0),
  };
}
