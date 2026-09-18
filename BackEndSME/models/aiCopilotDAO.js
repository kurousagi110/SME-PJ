import logger from "../utils/logger.js";
import { EcommercePolicyDAO } from "./ecommercePolicyDAO.js";

let dbInstance = null;
let donHangCol = null;
let sanPhamCol = null;
let nguyenLieuCol = null;
let soQuyCol = null;
let doiTacCol = null;
let usersCol = null;
let luongCol = null;
let vanChuyenCol = null;

function removeVietnameseTones(str) {
  if (!str) return "";
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
  return str.trim();
}

const fmtVND = (n) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);

export default class AiCopilotDAO {
  static async injectDB(conn) {
    if (dbInstance) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    dbInstance = db;
    donHangCol = db.collection("don_hang");
    sanPhamCol = db.collection("san_pham");
    nguyenLieuCol = db.collection("nguyen_lieu");
    soQuyCol = db.collection("so_quy");
    doiTacCol = db.collection("doi_tac");
    usersCol = db.collection("users");
    luongCol = db.collection("bang_luong");
    vanChuyenCol = db.collection("van_chuyen");
    logger.info("AiCopilotDAO initialized");
  }

  static async getSuggestions() {
    return [
      { text: "📊 Doanh thu và lợi nhuận bán hàng thế nào?", category: "finance" },
      { text: "⚠️ Có những mặt hàng nào tồn kho sắp hết cần nhập gấp?", category: "inventory" },
      { text: "💰 Tình hình công nợ và dòng tiền sổ quỹ?", category: "debt" },
      { text: "🛒 Kênh Shopee, TikTok Shop hay trực tiếp lời hơn?", category: "ecommerce" },
      { text: "🚚 Tình hình vận chuyển và giao hàng hiện tại?", category: "shipping" },
      { text: "👥 Báo cáo tổng hợp nhân sự công ty?", category: "hr" },
    ];
  }

  static async processQuery(query, user = {}) {
    try {
      const q = removeVietnameseTones(query);
      const originalQuery = query.trim();

      // 1. TỒN KHO / NGUYÊN LIỆU / CẢNH BÁO
      if (
        q.includes("ton kho") ||
        q.includes("canh bao") ||
        q.includes("sap het") ||
        q.includes("nguyen lieu") ||
        q.includes("het hang") ||
        q.includes("mrp")
      ) {
        return await this.handleInventoryQuery(q, originalQuery);
      }

      // 2. DOANH THU / LỢI NHUẬN / BÁN HÀNG / TĂNG TRƯỞNG / SO SÁNH
      if (
        q.includes("doanh thu") ||
        q.includes("loi nhuan") ||
        q.includes("ban hang") ||
        q.includes("tang truong") ||
        q.includes("so sanh") ||
        q.includes("yoy") ||
        q.includes("ban chay")
      ) {
        return await this.handleSalesQuery(q, originalQuery);
      }

      // 3. CÔNG NỢ / SỔ QUỸ / THU CHI / DÒNG TIỀN / KHÁCH HÀNG / ĐỐI TÁC
      if (
        q.includes("cong no") ||
        q.includes("so quy") ||
        q.includes("thu chi") ||
        q.includes("dong tien") ||
        q.includes("tien mat") ||
        q.includes("ngan hang") ||
        q.includes("khach hang") ||
        q.includes("doi tac") ||
        q.includes("nha cung cap")
      ) {
        return await this.handleCashflowQuery(q, originalQuery);
      }

      // 4. TMĐT / SHOPEE / TIKTOK / LAZADA / MEGA SALE / KHẤU HAO SÀN
      if (
        q.includes("shopee") ||
        q.includes("tiktok") ||
        q.includes("lazada") ||
        q.includes("tmdt") ||
        q.includes("online") ||
        q.includes("phi san") ||
        q.includes("khau hao") ||
        q.includes("mega sale")
      ) {
        return await this.handleEcommerceQuery(q, originalQuery);
      }

      // 5. VẬN CHUYỂN / GIAO HÀNG / SHIPPER / COD / ĐƠN VỊ VẬN CHUYỂN
      if (
        q.includes("van chuyen") ||
        q.includes("giao hang") ||
        q.includes("shipper") ||
        q.includes("cod") ||
        q.includes("ghn") ||
        q.includes("ghtk") ||
        q.includes("viettel post")
      ) {
        return await this.handleShippingQuery(q, originalQuery);
      }

      // 6. NHÂN SỰ / LƯƠNG / CHẤM CÔNG / PHÒNG BAN
      if (
        q.includes("nhan su") ||
        q.includes("luong") ||
        q.includes("cham cong") ||
        q.includes("nhan vien") ||
        q.includes("phong ban")
      ) {
        return await this.handleHRQuery(q, originalQuery);
      }

      // 7. DEFAULT / TỔNG QUAN HỆ THỐNG
      return await this.handleGeneralOverview(q, originalQuery);
    } catch (err) {
      logger.error("AI Copilot processQuery error", { error: err.message });
      return {
        answer: `Xin lỗi bạn, đã xảy ra lỗi trong quá trình phân tích dữ liệu: ${err.message}. Bạn hãy thử lại câu hỏi khác nhé!`,
        suggestions: await this.getSuggestions(),
      };
    }
  }

  /* ─── 1. Xử lý tồn kho & cảnh báo ─── */
  static async handleInventoryQuery(q, originalQuery) {
    const [products, materials] = await Promise.all([
      sanPhamCol.find({ trang_thai: { $ne: "ngung_kinh_doanh" } }).toArray(),
      nguyenLieuCol.find({}).toArray(),
    ]);

    const lowStockProducts = products.filter(
      (p) => (p.so_luong_ton || 0) <= (p.muc_ton_an_toan || 15)
    );
    const lowStockMaterials = materials.filter(
      (m) => (m.so_luong_ton || 0) <= (m.muc_ton_an_toan || 20)
    );

    let answer = `### 📦 Báo Cáo Phân Tích Tồn Kho & Cảnh Báo An Toàn\n\n`;
    answer += `Hệ thống hiện đang quản lý **${products.length} sản phẩm thành phẩm** và **${materials.length} mặt hàng nguyên vật liệu**.\n\n`;

    if (lowStockProducts.length === 0 && lowStockMaterials.length === 0) {
      answer += `✅ **Trạng thái kho rất an toàn:** Hiện không có mặt hàng nào bị rơi xuống dưới mức tồn an toàn!\n\n`;
    } else {
      answer += `⚠️ **Phát hiện ${lowStockProducts.length + lowStockMaterials.length} mặt hàng cần nhập bổ sung ngay:**\n\n`;

      if (lowStockProducts.length > 0) {
        answer += `**Thành phẩm sắp cạn kho:**\n`;
        lowStockProducts.slice(0, 5).forEach((p) => {
          answer += `- **${p.ten_sp}**: Còn **${p.so_luong_ton || 0} ${p.don_vi_tinh || "cái"}** *(Mức an toàn: ${p.muc_ton_an_toan || 15})*\n`;
        });
        answer += `\n`;
      }

      if (lowStockMaterials.length > 0) {
        answer += `**Nguyên vật liệu cần mua gấp:**\n`;
        lowStockMaterials.slice(0, 5).forEach((m) => {
          answer += `- **${m.ten_nl}**: Còn **${m.so_luong_ton || 0} ${m.don_vi_tinh || "đv"}** *(Mức an toàn: ${m.muc_ton_an_toan || 20})*\n`;
        });
        answer += `\n`;
      }
    }

    answer += `💡 **Khuyến nghị điều hành:** Bạn nên truy cập [Kế hoạch MRP & Demand Planning](/planning) để hệ thống tự động bóc tách định mức BOM và sinh đơn đặt hàng vật tư tối ưu nhất.`;

    return {
      answer,
      action: { title: "Xem Kế Hoạch MRP", url: "/planning" },
      suggestions: [
        { text: "Dự báo nhu cầu đặt hàng 30 ngày tới?", category: "inventory" },
        { text: "Kiểm tra danh mục tồn kho tổng hợp?", category: "inventory" },
      ],
    };
  }

  /* ─── 2. Xử lý doanh thu & bán hàng ─── */
  static async handleSalesQuery(q, originalQuery) {
    const orders = await donHangCol.find({
      $or: [{ loai_don: "sale" }, { loai_don: "xuat" }],
      trang_thai: { $ne: "cancelled" },
    }).toArray();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let totalRevenue = 0;
    let thisYearRevenue = 0;
    let thisMonthRevenue = 0;
    const productSalesMap = {};

    orders.forEach((o) => {
      const val = Number(o.tong_tien) || 0;
      totalRevenue += val;

      const d = o.ngay_dat || o.createAt ? new Date(o.ngay_dat || o.createAt) : null;
      if (d && d.getFullYear() === currentYear) {
        thisYearRevenue += val;
        if (d.getMonth() + 1 === currentMonth) {
          thisMonthRevenue += val;
        }
      }

      const items = Array.isArray(o.san_pham) ? o.san_pham : Array.isArray(o.chi_tiet) ? o.chi_tiet : [];
      items.forEach((item) => {
        const name = item.ten_sp || item.ma_sp || "Sản phẩm khác";
        const qty = Number(item.so_luong) || 0;
        const revenue = Number(item.thanh_tien) || (qty * (Number(item.don_gia) || 0));
        if (!productSalesMap[name]) productSalesMap[name] = { qty: 0, revenue: 0 };
        productSalesMap[name].qty += qty;
        productSalesMap[name].revenue += revenue;
      });
    });

    const topProducts = Object.entries(productSalesMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    let answer = `### 📊 Báo Cáo Hiệu Quả Kinh Doanh & Doanh Thu\n\n`;
    answer += `Hệ thống ghi nhận tổng cộng **${orders.length} đơn bán hàng** đã phát sinh.\n\n`;
    answer += `- 💰 **Doanh thu tích lũy toàn hệ thống:** **${fmtVND(totalRevenue)}**\n`;
    answer += `- 📅 **Doanh thu năm ${currentYear}:** **${fmtVND(thisYearRevenue)}**\n`;
    answer += `- 🚀 **Doanh thu tháng ${currentMonth}/${currentYear}:** **${fmtVND(thisMonthRevenue)}**\n\n`;

    if (topProducts.length > 0) {
      answer += `🏆 **Top 5 Sản Phẩm Bán Chạy & Doanh Số Cao Nhất:**\n`;
      topProducts.forEach(([name, data], idx) => {
        answer += `${idx + 1}. **${name}**: Đã bán **${data.qty}** cái $\\to$ Doanh thu **${fmtVND(data.revenue)}**\n`;
      });
      answer += `\n`;
    }

    answer += `💡 **Gợi ý:** Bạn có thể xem đối chiếu chi tiết biểu đồ cùng kỳ tại [Bảng Điều Khiển So Sánh YoY](/dashboard) hoặc phân loại lợi nhuận sản phẩm tại [Phân tích ABC](/planning).`;

    return {
      answer,
      action: { title: "Xem Báo Cáo Doanh Thu YoY", url: "/dashboard" },
      suggestions: [
        { text: "Kênh Shopee và TikTok Shop kênh nào lời hơn?", category: "ecommerce" },
        { text: "Khách hàng nào đang đóng góp doanh số nhiều nhất?", category: "debt" },
      ],
    };
  }

  /* ─── 3. Xử lý dòng tiền & công nợ ─── */
  static async handleCashflowQuery(q, originalQuery) {
    const [vouchers, partners, orders] = await Promise.all([
      soQuyCol.find({ trang_thai: "active" }).toArray(),
      doiTacCol.find({ trang_thai: "active" }).toArray(),
      donHangCol.find({
        $or: [{ loai_don: "sale" }, { loai_don: "xuat" }],
        trang_thai: { $ne: "cancelled" },
      }).toArray(),
    ]);

    let totalThu = 0;
    let totalChi = 0;
    let cash = 0;
    let bank = 0;

    vouchers.forEach((v) => {
      const amt = Number(v.so_tien) || 0;
      if (v.loai_phieu === "thu") {
        totalThu += amt;
        if (v.phuong_thuc === "tien_mat") cash += amt;
        else bank += amt;
      } else {
        totalChi += amt;
        if (v.phuong_thuc === "tien_mat") cash -= amt;
        else bank -= amt;
      }
    });

    // Công nợ
    let totalCustomerDebt = 0;
    const customerDebts = [];
    orders.forEach((o) => {
      const debt = (Number(o.tong_tien) || 0) - (Number(o.da_thanh_toan) || 0);
      if (debt > 0) {
        totalCustomerDebt += debt;
        customerDebts.push({
          customer: o.khach_hang_ten || o.ten_khach_hang || o.khach_hang || "Khách lẻ",
          debt,
          code: o.ma_dh,
        });
      }
    });

    customerDebts.sort((a, b) => b.debt - a.debt);

    let answer = `### 💰 Báo Cáo Sổ Quỹ Dòng Tiền & Công Nợ Đối Tác\n\n`;
    answer += `- 🟢 **Tổng Thu:** **${fmtVND(totalThu)}**\n`;
    answer += `- 🔴 **Tổng Chi:** **${fmtVND(totalChi)}**\n`;
    answer += `- 💎 **Tồn Quỹ Ròng Hiện Tại:** **${fmtVND(totalThu - totalChi)}** (Tiền mặt: **${fmtVND(cash)}**, Ngân hàng: **${fmtVND(bank)}**)\n\n`;

    answer += `⚠️ **Tình hình công nợ phải thu từ khách hàng:**\n`;
    answer += `- Tổng tiền khách nợ chưa thanh toán: **${fmtVND(totalCustomerDebt)}**\n`;
    if (customerDebts.length > 0) {
      answer += `**Top đối tác có dư nợ cao cần thu hồi:**\n`;
      customerDebts.slice(0, 3).forEach((item, idx) => {
        answer += `${idx + 1}. **${item.customer}** (Đơn \`${item.code}\`): Còn nợ **${fmtVND(item.debt)}**\n`;
      });
      answer += `\n`;
    }

    answer += `💡 **Hành động tức thời:** Bấm vào nút bên dưới để vào phân hệ Sổ Quỹ, bấm **"Thu tiền nợ"** để thu hồi dòng tiền và cập nhật phiếu thu tự động.`;

    return {
      answer,
      action: { title: "Mở Sổ Quỹ & Thu Nợ", url: "/cashbook" },
      suggestions: [
        { text: "Xem chi tiết danh sách khách hàng VIP?", category: "debt" },
        { text: "Báo cáo doanh thu tháng này?", category: "finance" },
      ],
    };
  }

  /* ─── 4. Xử lý TMĐT & Bán đa kênh ─── */
  static async handleEcommerceQuery(q, originalQuery) {
    const policies = EcommercePolicyDAO.getAllPolicies();
    const samplePrice = 1000000; // 1tr sample
    const comparison = EcommercePolicyDAO.compareChannels(samplePrice, 550000);

    let answer = `### 🛒 Phân Tích Hiệu Quả Bán Hàng Đa Kênh & Khấu Hao Phí Sàn TMĐT\n\n`;
    answer += `Biểu phí cập nhật mới nhất theo chính sách sàn thương mại điện tử tại Việt Nam:\n\n`;
    answer += `| Kênh Bán Hàng | Tổng Khấu Hao Phí | Tỷ Lệ Hoàn Hàng | Đóng Gói Phụ Phí |\n`;
    answer += `|---|:---:|:---:|:---:|\n`;
    answer += `| **Trực Tiếp (POS)** | **0%** | 0% | 0 đ |\n`;
    answer += `| **Shopee** | **16.0%** (Phí TT 4%, Cố định 5%, Freeship Xtra 7%) | ~4.0% | 15.000 đ/đơn |\n`;
    answer += `| **TikTok Shop** | **18.5%** (Phí TT 4%, Sàn 5%, Voucher 4.5%, Sàn 5%) | ~6.0% | 15.000 đ/đơn |\n`;
    answer += `| **Lazada** | **14.5%** (Phí TT 4%, Cố định 4.5%, Freeship Max 6%) | ~4.0% | 15.000 đ/đơn |\n\n`;

    answer += `**Ví dụ đối chiếu một sản phẩm niêm yết 1.000.000 đ (Giá vốn 550.000 đ):**\n`;
    answer += `- 🏪 **Bán Trực Tiếp:** Lãi ròng **450.000 đ** *(Biên ròng: 45.0%)*\n`;
    answer += `- 🧡 **Shopee:** Tiền về ví **840.000 đ** $\\to$ Lãi ròng **235.000 đ** *(Biên ròng: 23.5%)*\n`;
    answer += `- 🖤 **TikTok Shop:** Tiền về ví **815.000 đ** $\\to$ Lãi ròng **190.000 đ** *(Biên ròng: 19.0%)*\n`;
    answer += `- 💙 **Lazada:** Tiền về ví **855.000 đ** $\\to$ Lãi ròng **250.000 đ** *(Biên ròng: 25.0%)*\n\n`;

    answer += `💡 **Chiến lược tối ưu:** Các kênh online nên tăng giá niêm yết từ 15% - 20% so với giá bán trực tiếp tại quầy để bù đắp chi phí voucher sàn và hoa hồng affiliate KOC!`;

    return {
      answer,
      action: { title: "Mở Máy Tính Giá Đa Kênh", url: "/planning" },
      suggestions: [
        { text: "Lập kế hoạch tồn kho cho Mega Sale?", category: "ecommerce" },
        { text: "Xem sản phẩm nào có nguy cơ lỗ trên Shopee?", category: "ecommerce" },
      ],
    };
  }

  /* ─── 5. Xử lý Vận Chuyển & Giao Hàng ─── */
  static async handleShippingQuery(q, originalQuery) {
    const shipments = await vanChuyenCol.find({}).toArray();

    const dangGiao = shipments.filter((s) => s.trang_thai === "dang_giao").length;
    const choLay = shipments.filter((s) => s.trang_thai === "cho_dong_goi" || s.trang_thai === "da_ban_giao").length;
    const thanhCong = shipments.filter((s) => s.trang_thai === "giao_thanh_cong").length;
    const thatBai = shipments.filter((s) => s.trang_thai === "chuyen_hoan").length;
    const totalCod = shipments
      .filter((s) => s.trang_thai === "dang_giao" || s.trang_thai === "giao_thanh_cong")
      .reduce((sum, s) => sum + (Number(s.tien_thu_ho_cod) || 0), 0);

    const successRate = shipments.length > 0 ? ((thanhCong / (thanhCong + thatBai || 1)) * 100).toFixed(1) : "100.0";

    let answer = `### 🚚 Báo Cáo Vận Hành Giao Hàng & Vận Đơn (Logistics)\n\n`;
    answer += `Hệ thống ghi nhận tổng số **${shipments.length} vận đơn** trên toàn quốc.\n\n`;
    answer += `- 📦 **Đang giao hàng (In Transit):** **${dangGiao}** kiện hàng\n`;
    answer += `- ⏳ **Chờ đóng gói & shipper lấy:** **${choLay}** kiện hàng\n`;
    answer += `- ✅ **Đã giao thành công:** **${thanhCong}** kiện hàng\n`;
    answer += `- ❌ **Chuyển hoàn / Thất bại:** **${thatBai}** kiện hàng\n`;
    answer += `- 🎯 **Tỷ lệ giao thành công:** **${successRate}%**\n`;
    answer += `- 💵 **Tổng tiền thu hộ COD cần đối soát:** **${fmtVND(totalCod)}**\n\n`;

    answer += `💡 **Hành động:** Bạn có thể in tem vận đơn A6 hoặc cập nhật trạng thái các kiện hàng tại phân hệ Vận chuyển.`;

    return {
      answer,
      action: { title: "Quản Lý Vận Chuyển & In Tem", url: "/shipping" },
      suggestions: [
        { text: "Khách hàng nào đang nợ nhiều nhất?", category: "debt" },
        { text: "Doanh thu tháng này thế nào?", category: "finance" },
      ],
    };
  }

  /* ─── 6. Xử lý Nhân sự & Tiền lương ─── */
  static async handleHRQuery(q, originalQuery) {
    const users = await usersCol.find({}).toArray();
    const deptCount = new Set(users.map((u) => u.phong_ban).filter(Boolean)).size;

    let answer = `### 👥 Báo Cáo Tổng Hợp Nhân Sự & Tiền Lương\n\n`;
    answer += `- 🧑‍💼 **Tổng số nhân sự:** **${users.length} nhân viên**\n`;
    answer += `- 🏢 **Số phòng ban hoạt động:** **${deptCount || 5} phòng ban** (Kinh doanh, Kế toán, Kho, Sản xuất, Nhân sự)\n`;
    answer += `- 📋 **Cơ chế tính lương:** Tự động tổng hợp dữ liệu check-in ca làm, trừ đi muộn, tính hệ số công và in phiếu lương A5 cá nhân.\n\n`;
    answer += `💡 **Khuyến nghị:** Kế toán trưởng có thể chạy lệnh tính lương đồng loạt chỉ với 1 click tại phân hệ Bảng Lương.`;

    return {
      answer,
      action: { title: "Xem Bảng Lương Nhân Viên", url: "/payroll" },
      suggestions: [
        { text: "Tồn quỹ tiền mặt và ngân hàng hiện tại?", category: "finance" },
        { text: "Có mặt hàng nào sắp hết kho không?", category: "inventory" },
      ],
    };
  }

  /* ─── 7. Tổng quan doanh nghiệp 360 ─── */
  static async handleGeneralOverview(q, originalQuery) {
    const [orderCount, productCount, partnerCount, shipmentCount] = await Promise.all([
      donHangCol.countDocuments({
        $or: [{ loai_don: "sale" }, { loai_don: "xuat" }],
        trang_thai: { $ne: "cancelled" },
      }),
      sanPhamCol.countDocuments({}),
      doiTacCol.countDocuments({ trang_thai: "active" }),
      vanChuyenCol.countDocuments({}),
    ]);

    let answer = `### 👋 Xin chào! Tôi là Trợ Lý AI SME Copilot\n\n`;
    answer += `Tôi có thể hỗ trợ bạn tra cứu tức thời mọi số liệu vận hành của doanh nghiệp:\n\n`;
    answer += `- 📊 **Bán hàng:** Đang quản lý **${orderCount} đơn hàng** và **${productCount} sản phẩm**.\n`;
    answer += `- 🤝 **Đối tác:** Đang kết nối với **${partnerCount} khách hàng & nhà cung cấp**.\n`;
    answer += `- 🚚 **Giao hàng:** Đã phát hành **${shipmentCount} vận đơn** giao hàng.\n\n`;
    answer += `**Một số câu hỏi bạn có thể hỏi tôi:**\n`;
    answer += `1. *"Doanh thu và lợi nhuận bán hàng thế nào?"*\n`;
    answer += `2. *"Có mặt hàng nào tồn kho sắp hết cần nhập gấp?"*\n`;
    answer += `3. *"Khách hàng nào đang nợ công nợ nhiều nhất?"*\n`;
    answer += `4. *"Bán trên Shopee hay TikTok Shop lời hơn?"*\n`;
    answer += `5. *"Tình hình giao hàng và tiền COD hiện tại?"*\n`;

    return {
      answer,
      suggestions: await this.getSuggestions(),
    };
  }
}
