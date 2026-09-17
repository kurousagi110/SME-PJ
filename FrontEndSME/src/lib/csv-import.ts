/**
 * csv-import.ts
 * Pure TypeScript CSV parsing, validation, and template generator with UTF-8 BOM.
 */

export type ImportCategory = "san_pham" | "nguyen_lieu" | "doi_tac";

export interface ImportFieldDef {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "number";
  sample: string;
}

export const IMPORT_SCHEMAS: Record<ImportCategory, { title: string; fields: ImportFieldDef[] }> = {
  san_pham: {
    title: "Sản phẩm & Hàng hóa",
    fields: [
      { key: "ma_sp", label: "Mã sản phẩm", required: true, type: "string", sample: "SP010" },
      { key: "ten_sp", label: "Tên sản phẩm", required: true, type: "string", sample: "Bàn ăn tròn gỗ sồi 6 ghế" },
      { key: "don_gia", label: "Đơn giá (VNĐ)", required: true, type: "number", sample: "5500000" },
      { key: "so_luong", label: "Tồn kho ban đầu", required: false, type: "number", sample: "10" },
      { key: "mo_ta", label: "Mô tả sản phẩm", required: false, type: "string", sample: "Đường kính 1m2, hoàn thiện sơn lau dầu" },
    ],
  },
  nguyen_lieu: {
    title: "Nguyên vật liệu & Phụ kiện",
    fields: [
      { key: "ma_nl", label: "Mã nguyên liệu", required: true, type: "string", sample: "NL012" },
      { key: "ten_nl", label: "Tên nguyên liệu", required: true, type: "string", sample: "Gỗ Tần Bì (Ash) 25mm" },
      { key: "don_vi", label: "Đơn vị tính", required: true, type: "string", sample: "m3" },
      { key: "gia_nhap", label: "Đơn giá nhập (VNĐ)", required: false, type: "number", sample: "16000000" },
      { key: "so_luong", label: "Số lượng tồn kho", required: false, type: "number", sample: "25" },
      { key: "ton_toi_thieu", label: "Tồn an toàn tối thiểu", required: false, type: "number", sample: "5" },
      { key: "mo_ta", label: "Mô tả", required: false, type: "string", sample: "Gỗ nhập khẩu Bắc Mỹ độ ẩm < 12%" },
    ],
  },
  doi_tac: {
    title: "Khách hàng & Nhà cung cấp",
    fields: [
      { key: "loai_doi_tac", label: "Loại đối tác (khach_hang / nha_cung_cap / ca_hai)", required: true, type: "string", sample: "khach_hang" },
      { key: "ma_doi_tac", label: "Mã đối tác (tùy chọn)", required: false, type: "string", sample: "KH009" },
      { key: "ten", label: "Tên khách hàng / Nhà cung cấp", required: true, type: "string", sample: "Công ty Kiến Trúc Xanh" },
      { key: "so_dien_thoai", label: "Số điện thoại", required: false, type: "string", sample: "0908123456" },
      { key: "email", label: "Email", required: false, type: "string", sample: "info@kientrucxanh.vn" },
      { key: "dia_chi", label: "Địa chỉ", required: false, type: "string", sample: "45 Lê Duẩn, Q1, TP.HCM" },
      { key: "ma_so_thue", label: "Mã số thuế", required: false, type: "string", sample: "0312345678" },
      { key: "nhom", label: "Nhóm (vip / khach_buon / khach_le / chinh)", required: false, type: "string", sample: "vip" },
      { key: "ghi_chu", label: "Ghi chú", required: false, type: "string", sample: "Chiết khấu 5% đơn hàng lớn" },
    ],
  },
};

/**
 * Robust CSV parser that handles:
 * - Comma `,`, semicolon `;`, or tab `\t` delimiters
 * - Quoted fields with escaped quotes `""`
 * - Windows CRLF and Unix LF
 */
export function parseCSV(text: string): string[][] {
  // Strip BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Detect delimiter from the first line
  const firstLine = cleanText.split(/\r?\n/)[0] || "";
  let delimiter = ",";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ";";
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = "\t";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((c) => c !== "")) rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((c) => c !== "")) rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c !== "")) rows.push(currentRow);
  }

  return rows;
}

export interface ValidatedRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

/**
 * Matches parsed header row with schema keys or labels
 */
export function mapAndValidateRows(
  category: ImportCategory,
  rawRows: string[][]
): {
  headers: string[];
  fieldMap: Record<number, string>;
  rows: ValidatedRow[];
  validCount: number;
  invalidCount: number;
} {
  if (rawRows.length === 0) {
    return { headers: [], fieldMap: {}, rows: [], validCount: 0, invalidCount: 0 };
  }

  const schema = IMPORT_SCHEMAS[category];
  const headerRow = rawRows[0];
  const fieldMap: Record<number, string> = {};

  // Match header columns
  headerRow.forEach((h, colIdx) => {
    const normH = h.toLowerCase().trim().replace(/[\(\)\[\]_]/g, " ");
    const matched = schema.fields.find((f) => {
      const normKey = f.key.toLowerCase().replace(/_/g, " ");
      const normLabel = f.label.toLowerCase().replace(/[\(\)\[\]_]/g, " ");
      return normH === normKey || normH === normLabel || normH.includes(normKey) || normH.includes(normLabel);
    });
    if (matched) {
      fieldMap[colIdx] = matched.key;
    }
  });

  // Fallback: If header mapping failed for some, map by positional order
  if (Object.keys(fieldMap).length < schema.fields.filter((f) => f.required).length) {
    schema.fields.forEach((f, idx) => {
      if (idx < headerRow.length && !Object.values(fieldMap).includes(f.key)) {
        fieldMap[idx] = f.key;
      }
    });
  }

  const validatedRows: ValidatedRow[] = [];
  const seenCodes = new Set<string>();

  for (let r = 1; r < rawRows.length; r++) {
    const rawRow = rawRows[r];
    const dataObj: Record<string, any> = {};
    const errors: string[] = [];

    // Populate data
    rawRow.forEach((val, colIdx) => {
      const fieldKey = fieldMap[colIdx];
      if (fieldKey) {
        dataObj[fieldKey] = val;
      }
    });

    // Validate against schema
    schema.fields.forEach((field) => {
      const val = dataObj[field.key];
      const strVal = String(val ?? "").trim();

      if (field.required && !strVal) {
        errors.push(`Thiếu "${field.label}"`);
      } else if (strVal && field.type === "number") {
        // Strip thousand separators and currency symbol
        const cleanNum = strVal.replace(/[.,\sđVNĐ]/g, "");
        if (isNaN(Number(cleanNum))) {
          errors.push(`"${field.label}" phải là số hợp lệ`);
        } else if (Number(cleanNum) < 0) {
          errors.push(`"${field.label}" không được âm`);
        } else {
          dataObj[field.key] = Number(cleanNum);
        }
      }
    });

    // Check duplicate code in file
    const codeKey = category === "san_pham" ? "ma_sp" : category === "nguyen_lieu" ? "ma_nl" : "ma_doi_tac";
    const codeVal = String(dataObj[codeKey] || "").trim().toUpperCase();
    if (codeVal) {
      if (seenCodes.has(codeVal)) {
        errors.push(`Mã "${codeVal}" bị trùng lặp trong file`);
      } else {
        seenCodes.add(codeVal);
      }
    }

    validatedRows.push({
      rowNumber: r,
      data: dataObj,
      isValid: errors.length === 0,
      errors,
    });
  }

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const invalidCount = validatedRows.length - validCount;

  return {
    headers: headerRow,
    fieldMap,
    rows: validatedRows,
    validCount,
    invalidCount,
  };
}

/**
 * Generates and triggers browser download of standard CSV template with UTF-8 BOM
 */
export function downloadCsvTemplate(category: ImportCategory) {
  const schema = IMPORT_SCHEMAS[category];
  const headerLabels = schema.fields.map((f) => `"${f.label}"`).join(",");
  const sampleValues = schema.fields.map((f) => `"${f.sample}"`).join(",");

  const csvContent = "\uFEFF" + `${headerLabels}\n${sampleValues}\n`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `mau_nhap_lieu_${category}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
