/**
 * Utility xuất dữ liệu sang CSV (tương thích Microsoft Excel với UTF-8 BOM)
 * và In hóa đơn chuẩn A4 cho hệ thống SME.
 */

export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  columns: { key: string; label: string; formatter?: (val: any, row: T) => string | number }[],
  data: T[]
) {
  if (!data || !data.length) {
    alert("Không có dữ liệu để xuất");
    return;
  }

  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        let val = col.formatter ? col.formatter(row[col.key], row) : row[col.key];
        if (val === null || val === undefined) val = "";
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(",")
  );

  const csvContent = "\uFEFF" + [headerRow, ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printInvoice(order: {
  ma_dh: string;
  khach_hang_ten: string;
  ngay_dat?: string;
  san_pham?: Array<{
    ma_sp?: string;
    ten_sp?: string;
    don_vi?: string | null;
    so_luong?: number;
    don_gia?: number;
    thanh_tien?: number;
  }>;
  tong_tien?: number;
  ghi_chu?: string;
  trang_thai?: string;
}) {
  const toVND = (n?: number) =>
    (Number.isFinite(n) ? Number(n) : 0).toLocaleString("vi-VN") + " đ";

  const dateStr = order.ngay_dat
    ? new Date(order.ngay_dat).toLocaleDateString("vi-VN")
    : new Date().toLocaleDateString("vi-VN");

  const itemsHtml = (order.san_pham || [])
    .map(
      (item, idx) => `
    <tr>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>${item.ten_sp || "-"}</strong><br/><small style="color: #666;">${item.ma_sp || ""}</small></td>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.don_vi || "Cái"}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${Number(item.so_luong || 0)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${toVND(item.don_gia)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-weight: bold;">${toVND(item.thanh_tien || (Number(item.so_luong || 0) * Number(item.don_gia || 0)))}</td>
    </tr>
  `
    )
    .join("");

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Hóa đơn bán hàng - ${order.ma_dh}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #333; line-height: 1.5; font-size: 14px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
        .company-name { font-size: 20px; font-weight: bold; color: #1e40af; }
        .invoice-title { text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; text-transform: uppercase; color: #1f2937; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; background: #f9fafb; padding: 15px; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f3f4f6; color: #374151; padding: 10px 8px; border: 1px solid #ddd; text-align: left; font-size: 13px; }
        .total-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
        .total-box { width: 300px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
        .total-grand { font-size: 18px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 8px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; margin-top: 50px; }
        .sig-title { font-weight: bold; margin-bottom: 60px; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">HỆ THỐNG DOANH NGHIỆP SME</div>
          <div>Địa chỉ: Khu Công Nghệ Cao, TP. Hồ Chí Minh</div>
          <div>Hotline: 1900 6868 · Email: contact@sme.vn</div>
        </div>
        <div style="text-align: right;">
          <div><strong>Mã đơn:</strong> ${order.ma_dh}</div>
          <div><strong>Ngày lập:</strong> ${dateStr}</div>
        </div>
      </div>

      <div class="invoice-title">HÓA ĐƠN BÁN HÀNG & PHIẾU XUẤT KHO</div>

      <div class="info-grid">
        <div><strong>Khách hàng:</strong> ${order.khach_hang_ten || "Khách lẻ"}</div>
        <div><strong>Trạng thái:</strong> ${order.trang_thai || "Đã xác nhận"}</div>
        <div><strong>Ghi chú:</strong> ${order.ghi_chu || "Không có"}</div>
        <div><strong>Hình thức:</strong> Bán buôn / Giao hàng</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">STT</th>
            <th>Tên sản phẩm</th>
            <th style="width: 80px; text-align: center;">ĐVT</th>
            <th style="width: 80px; text-align: right;">Số lượng</th>
            <th style="width: 120px; text-align: right;">Đơn giá</th>
            <th style="width: 140px; text-align: right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-box">
          <div class="total-row total-grand">
            <span>Tổng thanh toán:</span>
            <span>${toVND(order.tong_tien)}</span>
          </div>
        </div>
      </div>

      <div class="signatures">
        <div>
          <div class="sig-title">Người mua hàng</div>
          <div>(Ký & ghi rõ họ tên)</div>
        </div>
        <div>
          <div class="sig-title">Thủ kho xuất</div>
          <div>(Ký & ghi rõ họ tên)</div>
        </div>
        <div>
          <div class="sig-title">Người lập phiếu</div>
          <div>(Ký & ghi rõ họ tên)</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
}

export function printCashReceipt(receipt: {
  ma_phieu: string;
  loai_phieu: "thu" | "chi";
  hang_muc?: string;
  so_tien: number;
  phuong_thuc?: string;
  doi_tuong?: { ten?: string; so_dien_thoai?: string; dia_chi?: string };
  ma_chung_tu?: string;
  ngay_ghi_nhan?: string;
  ghi_chu?: string;
  nguoi_tao?: { ho_ten?: string };
}) {
  const isThu = receipt.loai_phieu === "thu";
  const title = isThu ? "PHIẾU THU" : "PHIẾU CHI";
  const partnerLabel = isThu ? "Họ và tên người nộp tiền" : "Họ và tên người nhận tiền";
  const reasonLabel = isThu ? "Lý do nộp" : "Lý do chi";
  const colorTheme = isThu ? "#16a34a" : "#dc2626";

  const toVND = (n?: number) =>
    (Number.isFinite(n) ? Number(n) : 0).toLocaleString("vi-VN") + " đ";

  const dateStr = receipt.ngay_ghi_nhan
    ? new Date(receipt.ngay_ghi_nhan).toLocaleDateString("vi-VN")
    : new Date().toLocaleDateString("vi-VN");

  const phuongThucStr = receipt.phuong_thuc === "chuyen_khoan" ? "Chuyển khoản" : "Tiền mặt";

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title} - ${receipt.ma_phieu}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 25px; color: #222; line-height: 1.6; font-size: 14px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${colorTheme}; padding-bottom: 12px; margin-bottom: 15px; }
        .company-name { font-size: 18px; font-weight: bold; color: #1e40af; }
        .receipt-code { text-align: right; font-size: 13px; color: #555; }
        .receipt-title { text-align: center; font-size: 24px; font-weight: bold; margin: 15px 0 5px 0; text-transform: uppercase; color: ${colorTheme}; }
        .receipt-date { text-align: center; font-style: italic; color: #666; margin-bottom: 20px; }
        .detail-row { display: flex; margin-bottom: 10px; }
        .detail-label { width: 220px; font-weight: 600; color: #444; flex-shrink: 0; }
        .detail-value { flex-grow: 1; border-bottom: 1px dotted #ccc; padding-bottom: 2px; }
        .amount-box { margin: 20px 0; padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid ${colorTheme}; font-size: 16px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; text-align: center; margin-top: 40px; }
        .sig-title { font-weight: bold; margin-bottom: 55px; }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">HỆ THỐNG DOANH NGHIỆP SME</div>
          <div style="font-size: 12px; color: #666;">Địa chỉ: Khu Công Nghệ Cao, TP.HCM</div>
        </div>
        <div class="receipt-code">
          <div><strong>Mã phiếu:</strong> ${receipt.ma_phieu}</div>
          <div><strong>Quyển số:</strong> 01 / 2026</div>
        </div>
      </div>

      <div class="receipt-title">${title}</div>
      <div class="receipt-date">Ngày ghi nhận: ${dateStr}</div>

      <div class="detail-row">
        <div class="detail-label">${partnerLabel}:</div>
        <div class="detail-value"><strong>${receipt.doi_tuong?.ten || "Khách lẻ / Nội bộ"}</strong></div>
      </div>

      <div class="detail-row">
        <div class="detail-label">Số điện thoại / Địa chỉ:</div>
        <div class="detail-value">${[receipt.doi_tuong?.so_dien_thoai, receipt.doi_tuong?.dia_chi].filter(Boolean).join(" - ") || "-"}</div>
      </div>

      <div class="detail-row">
        <div class="detail-label">${reasonLabel}:</div>
        <div class="detail-value">${receipt.ghi_chu || receipt.hang_muc || (isThu ? "Thu tiền bán hàng" : "Chi trả tiền hàng")}</div>
      </div>

      <div class="detail-row">
        <div class="detail-label">Phương thức thanh toán:</div>
        <div class="detail-value">${phuongThucStr}</div>
      </div>

      ${receipt.ma_chung_tu ? `
      <div class="detail-row">
        <div class="detail-label">Kèm theo chứng từ gốc:</div>
        <div class="detail-value">Đơn hàng: <strong>${receipt.ma_chung_tu}</strong></div>
      </div>
      ` : ""}

      <div class="amount-box">
        Số tiền ${isThu ? "thu" : "chi"}: <strong style="color: ${colorTheme}; font-size: 18px;">${toVND(receipt.so_tien)}</strong>
      </div>

      <div class="signatures">
        <div>
          <div class="sig-title">Giám đốc</div>
          <div style="font-size: 12px; color: #666;">(Ký & đóng dấu)</div>
        </div>
        <div>
          <div class="sig-title">Kế toán trưởng</div>
          <div style="font-size: 12px; color: #666;">(Ký & ghi họ tên)</div>
        </div>
        <div>
          <div class="sig-title">Thủ quỹ</div>
          <div style="font-size: 12px; color: #666;">(Ký & ghi họ tên)</div>
        </div>
        <div>
          <div class="sig-title">${isThu ? "Người nộp tiền" : "Người nhận tiền"}</div>
          <div style="font-size: 12px; color: #666;">(Ký & ghi họ tên)</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=800,height=750");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
}

