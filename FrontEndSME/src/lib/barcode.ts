/**
 * barcode.ts — Utility for generating Code128 Barcode SVG and printing label sheets & thermal receipts
 */

/* ── Code 128 Character Patterns (widths of alternating bars & spaces) ── */
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 is STOP pattern: 7 widths)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encodes an ASCII string into Code 128 Set B pattern widths
 */
export function generateCode128SvgString(text: string, height: number = 40, showText: boolean = false): string {
  const clean = (text || "").trim();
  if (!clean) return "";

  const codes: number[] = [START_CODE_B];
  let checksumSum = START_CODE_B;

  for (let i = 0; i < clean.length; i++) {
    const ascii = clean.charCodeAt(i);
    const code = ascii >= 32 && ascii <= 126 ? ascii - 32 : 0;
    codes.push(code);
    checksumSum += code * (i + 1);
  }

  const checksum = checksumSum % 103;
  codes.push(checksum);
  codes.push(STOP_CODE);

  let currentX = 10; // Quiet zone left
  const rects: string[] = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;

    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      const isBar = p % 2 === 0;
      if (isBar) {
        rects.push(`<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="#000000" />`);
      }
      currentX += width;
    }
  }

  currentX += 10; // Quiet zone right
  const totalWidth = currentX;
  const totalHeight = showText ? height + 16 : height;

  const textElement = showText
    ? `<text x="${totalWidth / 2}" y="${height + 13}" font-family="monospace, monospace" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">${clean}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="${totalHeight}" style="display:block;margin:0 auto;">${rects.join("")}${textElement}</svg>`;
}

export interface BarcodePrintItem {
  id: string;
  code: string;
  name: string;
  price?: number;
  unit?: string;
  count: number;
}

export type LabelTemplate = "thermal_35x22" | "thermal_50x30" | "a4_30" | "a4_65";

/**
 * Print Barcode Labels to paper (thermal roll or A4 sticker sheet)
 */
export function printBarcodeLabels(items: BarcodePrintItem[], template: LabelTemplate = "thermal_35x22") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Vui lòng cho phép popup trình duyệt để in tem mã vạch.");
    return;
  }

  const expandedItems: { code: string; name: string; price: number; unit: string }[] = [];
  for (const item of items) {
    const qty = Math.max(1, Number(item.count) || 1);
    for (let i = 0; i < qty; i++) {
      expandedItems.push({
        code: item.code,
        name: item.name,
        price: item.price || 0,
        unit: item.unit || "cái",
      });
    }
  }

  let css = "";
  let itemRender = "";

  if (template === "thermal_35x22") {
    css = `
      @page { size: 35mm 22mm; margin: 0; }
      body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: #fff; }
      .label-item {
        width: 35mm;
        height: 22mm;
        page-break-after: always;
        box-sizing: border-box;
        padding: 1.5mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
      }
      .label-title { font-size: 8px; font-weight: bold; line-height: 1.1; max-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
      .barcode-wrapper { width: 100%; max-height: 11mm; }
      .label-price { font-size: 8.5px; font-weight: bold; }
    `;
    itemRender = expandedItems
      .map(
        (it) => `
      <div class="label-item">
        <div class="label-title">${it.name}</div>
        <div class="barcode-wrapper">${generateCode128SvgString(it.code, 28, true)}</div>
        <div class="label-price">${it.price ? it.price.toLocaleString("vi-VN") + " đ" : it.code}</div>
      </div>
    `
      )
      .join("");
  } else if (template === "thermal_50x30") {
    css = `
      @page { size: 50mm 30mm; margin: 0; }
      body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: #fff; }
      .label-item {
        width: 50mm;
        height: 30mm;
        page-break-after: always;
        box-sizing: border-box;
        padding: 2mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
      }
      .label-title { font-size: 9.5px; font-weight: bold; line-height: 1.1; max-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
      .barcode-wrapper { width: 100%; max-height: 15mm; }
      .label-price { font-size: 10px; font-weight: bold; }
    `;
    itemRender = expandedItems
      .map(
        (it) => `
      <div class="label-item">
        <div class="label-title">${it.name}</div>
        <div class="barcode-wrapper">${generateCode128SvgString(it.code, 34, true)}</div>
        <div class="label-price">${it.price ? it.price.toLocaleString("vi-VN") + " đ" : it.code}</div>
      </div>
    `
      )
      .join("");
  } else {
    // A4 sheet grid
    const cols = template === "a4_65" ? 5 : 3;
    css = `
      @page { size: A4 portrait; margin: 8mm; }
      body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: #fff; }
      .grid-container {
        display: grid;
        grid-template-columns: repeat(${cols}, 1fr);
        gap: 2mm;
      }
      .label-item {
        border: 1px dashed #d1d5db;
        border-radius: 4px;
        padding: 2mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
        height: ${template === "a4_65" ? "21mm" : "32mm"};
        overflow: hidden;
      }
      .label-title { font-size: 9px; font-weight: 600; line-height: 1.1; margin-bottom: 1mm; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .barcode-wrapper { width: 90%; }
      .label-price { font-size: 9.5px; font-weight: bold; color: #111827; margin-top: 1mm; }
    `;
    itemRender = `
      <div class="grid-container">
        ${expandedItems
          .map(
            (it) => `
          <div class="label-item">
            <div class="label-title">${it.name}</div>
            <div class="barcode-wrapper">${generateCode128SvgString(it.code, template === "a4_65" ? 22 : 30, true)}</div>
            <div class="label-price">${it.price ? it.price.toLocaleString("vi-VN") + " đ" : it.code}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>In Tem Mã Vạch</title>
      <style>
        ${css}
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      ${itemRender}
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export interface PosReceiptData {
  orderCode: string;
  createdAt: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string;
  items: {
    name: string;
    code: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: "tien_mat" | "chuyen_khoan";
  notes?: string;
}

/**
 * Print POS Thermal Receipt (K80 / 80mm roll)
 */
export function printPosThermalReceipt(data: PosReceiptData) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Vui lòng cho phép popup trình duyệt để in hóa đơn.");
    return;
  }

  const barcodeSvg = generateCode128SvgString(data.orderCode, 32, true);

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>Hóa Đơn Bán Lẻ - ${data.orderCode}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace, system-ui;
          font-size: 12px;
          line-height: 1.35;
          margin: 0;
          padding: 8px;
          color: #000;
          background: #fff;
          width: 76mm;
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        .store-name {
          font-size: 15px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .store-info {
          font-size: 10.5px;
          color: #333;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .title {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin: 4px 0;
          text-transform: uppercase;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin: 4px 0;
        }
        th {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 4px 0;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 3px 0;
          vertical-align: top;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .item-name { font-weight: 600; }
        .total-section {
          margin-top: 4px;
          font-size: 11.5px;
        }
        .grand-total {
          font-size: 14px;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 10px;
          font-size: 11px;
        }
        .barcode-box {
          margin: 8px auto;
          width: 85%;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">NỘI THẤT & GỖ CÔNG NGHIỆP SME</div>
        <div class="store-info">Đ/c: 123 Nguyễn Thị Minh Khai, Q.3, TP.HCM</div>
        <div class="store-info">Hotline: 0908.123.456 - Website: sme.vn</div>
      </div>

      <div class="divider"></div>

      <div class="title">HÓA ĐƠN BÁN LẺ</div>
      <div class="info-row"><span>Số HĐ:</span> <strong>${data.orderCode}</strong></div>
      <div class="info-row"><span>Ngày:</span> <span>${data.createdAt}</span></div>
      <div class="info-row"><span>Thu ngân:</span> <span>${data.cashierName}</span></div>
      <div class="info-row"><span>Khách hàng:</span> <span>${data.customerName}</span></div>
      ${data.customerPhone ? `<div class="info-row"><span>SĐT:</span> <span>${data.customerPhone}</span></div>` : ""}

      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Món</th>
            <th style="width: 15%; text-align: center;">SL</th>
            <th style="width: 35%; text-align: right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (it) => `
            <tr>
              <td colspan="3" class="item-name">${it.name}</td>
            </tr>
            <tr>
              <td style="font-size: 10px; color: #444;">${it.code}</td>
              <td class="text-center">${it.quantity} x ${it.price.toLocaleString("vi-VN")}</td>
              <td class="text-right">${it.total.toLocaleString("vi-VN")} đ</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="total-section">
        <div class="info-row">
          <span>Tổng tiền hàng:</span>
          <strong>${data.subtotal.toLocaleString("vi-VN")} đ</strong>
        </div>
        ${
          data.discount > 0
            ? `<div class="info-row"><span>Giảm giá:</span> <span>-${data.discount.toLocaleString("vi-VN")} đ</span></div>`
            : ""
        }
        <div class="info-row grand-total" style="margin: 4px 0;">
          <span>THANH TOÁN:</span>
          <span>${data.total.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="info-row">
          <span>Hình thức:</span>
          <span>${data.paymentMethod === "chuyen_khoan" ? "Chuyển khoản QR" : "Tiền mặt"}</span>
        </div>
        <div class="info-row">
          <span>Tiền khách đưa:</span>
          <span>${data.paidAmount.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="info-row" style="font-weight: bold;">
          <span>Tiền thối lại:</span>
          <span>${data.changeAmount.toLocaleString("vi-VN")} đ</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="barcode-box">
        ${barcodeSvg}
      </div>

      <div class="footer">
        <div>CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</div>
        <div style="font-size: 10px; margin-top: 4px;">(Quý khách vui lòng giữ hóa đơn để đổi trả trong 7 ngày)</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
