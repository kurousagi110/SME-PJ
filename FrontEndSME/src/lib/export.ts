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

export function printWaybill(shipment: {
  ma_van_don: string;
  ma_don_hang?: string;
  don_vi_van_chuyen?: string;
  nguoi_gui?: { ten?: string; sdt?: string; dia_chi?: string };
  nguoi_nhan?: { ten?: string; sdt?: string; dia_chi?: string };
  tien_thu_ho_cod?: number;
  phi_van_chuyen?: number;
  nguoi_tra_phi?: string;
  trong_luong_gram?: number;
  san_pham?: Array<{ ten_sp?: string; so_luong?: number; don_vi?: string }>;
  ghi_chu?: string;
  ngay_tao?: string | Date;
}) {
  const toVND = (n?: number) =>
    (Number.isFinite(n) ? Number(n) : 0).toLocaleString("vi-VN") + " đ";

  const dateStr = shipment.ngay_tao
    ? new Date(shipment.ngay_tao).toLocaleString("vi-VN")
    : new Date().toLocaleString("vi-VN");

  const dv = shipment.don_vi_van_chuyen || "GHN";
  const brandColor = dv === "GHTK" ? "#008543" : dv === "ViettelPost" ? "#ee0033" : dv === "J&T Express" ? "#e60012" : "#f26522";

  const itemsList = Array.isArray(shipment.san_pham) && shipment.san_pham.length > 0
    ? shipment.san_pham.map((sp, idx) => `<div>${idx + 1}. ${sp.ten_sp || "Sản phẩm"} (SL: ${sp.so_luong || 1})</div>`).join("")
    : "<div>1. Kiện hàng thiết bị/nội thất SME (Đóng gói tiêu chuẩn)</div>";

  const printHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>Phiếu Vận Đơn - ${shipment.ma_van_don}</title>
      <style>
        @page { size: 100mm 150mm; margin: 4mm; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 8px;
          color: #111;
          background: #fff;
          font-size: 12px;
          border: 2px dashed #333;
          border-radius: 4px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid ${brandColor};
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .carrier-badge {
          background: ${brandColor};
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .waybill-code {
          text-align: right;
          font-weight: bold;
          font-size: 13px;
        }
        .barcode-box {
          text-align: center;
          background: #f8fafc;
          padding: 8px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .barcode-lines {
          font-family: monospace;
          font-size: 26px;
          letter-spacing: 5px;
          font-weight: 900;
          color: #0f172a;
        }
        .barcode-sub {
          font-size: 13px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-top: 2px;
        }
        .address-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .addr-box {
          padding: 4px;
          background: #fdfdfd;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
        .addr-title {
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 2px;
        }
        .highlight-name {
          font-weight: 700;
          font-size: 13px;
          color: #0f172a;
        }
        .cod-section {
          background: #fff1f2;
          border: 2px solid #e11d48;
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          margin-bottom: 8px;
        }
        .cod-label {
          font-size: 11px;
          font-weight: bold;
          color: #9f1239;
          text-transform: uppercase;
        }
        .cod-amount {
          font-size: 20px;
          font-weight: 900;
          color: #e11d48;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 4px;
        }
        .goods-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px;
          border-radius: 4px;
          font-size: 11px;
          margin-bottom: 6px;
        }
        .sign-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          text-align: center;
          font-size: 11px;
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px dashed #cbd5e1;
        }
        .sign-space {
          height: 35px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="carrier-badge">${dv}</div>
        <div class="waybill-code">
          <div>MÃ VẬN ĐƠN</div>
          <div style="color: ${brandColor};">${shipment.ma_van_don}</div>
        </div>
      </div>

      <div class="barcode-box">
        <div class="barcode-lines">||| | |||| | ||||| |||</div>
        <div class="barcode-sub">${shipment.ma_van_don}</div>
        <div style="font-size: 10px; color: #64748b;">Đơn hàng: <strong>${shipment.ma_don_hang || "N/A"}</strong> — Ngày: ${dateStr}</div>
      </div>

      <div class="address-grid">
        <div class="addr-box">
          <div class="addr-title">📤 Bên Gửi (Kho SME)</div>
          <div class="highlight-name">${shipment.nguoi_gui?.ten || "Nội Thất SME"}</div>
          <div>SĐT: <strong>${shipment.nguoi_gui?.sdt || "1900 6868"}</strong></div>
          <div style="font-size: 10px; color: #475569;">${shipment.nguoi_gui?.dia_chi || "KCN Tân Bình, TP.HCM"}</div>
        </div>
        <div class="addr-box" style="background: #eff6ff; border-color: #bfdbfe;">
          <div class="addr-title" style="color: #1d4ed8;">📥 Bên Nhận (Khách Hàng)</div>
          <div class="highlight-name" style="color: #1e3a8a;">${shipment.nguoi_nhan?.ten || "Khách Hàng"}</div>
          <div>SĐT: <strong style="color: #b91c1c;">${shipment.nguoi_nhan?.sdt || "Chưa có SĐT"}</strong></div>
          <div style="font-size: 10px; color: #1e293b;">${shipment.nguoi_nhan?.dia_chi || "Chưa có địa chỉ"}</div>
        </div>
      </div>

      <div class="cod-section">
        <div class="cod-label">Tiền Thu Hộ (COD)</div>
        <div class="cod-amount">${toVND(shipment.tien_thu_ho_cod)}</div>
        <div style="font-size: 10px; color: #4b5563;">
          Phí vận chuyển: <strong>${toVND(shipment.phi_van_chuyen)}</strong> (${shipment.nguoi_tra_phi === "shop" ? "Shop trả cước" : "Khách trả cước"})
        </div>
      </div>

      <div class="goods-box">
        <div style="font-weight: bold; margin-bottom: 2px;">Nội dung hàng (${((shipment.trong_luong_gram || 1000) / 1000).toFixed(1)} kg):</div>
        ${itemsList}
        <div style="margin-top: 4px; font-style: italic; color: #dc2626;">
          📌 Chỉ dẫn: <strong>${shipment.ghi_chu || "Cho xem hàng, không cho thử"}</strong>
        </div>
      </div>

      <div class="sign-grid">
        <div>
          <strong>Chữ ký Shipper lấy hàng</strong>
          <div class="sign-space"></div>
        </div>
        <div>
          <strong>Chữ ký Người nhận hàng</strong>
          <div class="sign-space"></div>
          <div style="font-size: 9px; color: #64748b;">(Xác nhận hàng nguyên vẹn)</div>
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

  const printWindow = window.open("", "_blank", "width=450,height=650");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
}

