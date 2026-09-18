/**
 * ecommercePolicyDAO.js — Quản lý chính sách sàn TMĐT & Công thức tính khấu hao giá bán
 * 
 * Áp dụng các biểu phí thực tế tại Việt Nam:
 * - Shopee: Phí thanh toán 4%, Cố định 5%, Freeship Xtra 7% (max 40k), Hoàn hàng 4%
 * - TikTok Shop: Phí thanh toán 4%, Hoa hồng 5%, Voucher vận chuyển 4.5%, Affiliate KOC 10% (opt), Hoàn 6%
 * - Lazada: Phí thanh toán 3.99%, Hoa hồng 4.5%, Freeship Max 6%, Hoàn 4%
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

let policiesCol = null;
let sanPhamCol = null;

export const DEFAULT_ECOMMERCE_POLICIES = {
  shopee: {
    code: "shopee",
    name: "Shopee Việt Nam",
    logo_color: "#ee4d2d",
    phi_thanh_toan_pct: 4.0,       // 4.0%
    phi_co_dinh_pct: 5.0,          // 5.0% hoa hồng sàn
    phi_dich_vu_pct: 7.0,          // Freeship Xtra + Hoàn Xu Xtra
    phi_dich_vu_cap: 40000,        // Trần phí dịch vụ mỗi sản phẩm (40k)
    phi_dong_goi_co_dinh: 15000,   // Thùng carton, xốp nổ, băng keo
    ty_le_hoan_du_kien_pct: 4.0,   // 4% tỷ lệ trả hàng/hủy đơn
    chi_phi_van_chuyen_hoan: 25000,// Phí ship 2 chiều khi đơn bị hoàn
    thue_vat_tncn_pct: 1.5,        // Thuế sàn khấu trừ (tùy diện)
    mo_ta: "Áp dụng cho shop thông thường tham gia gói Freeship Xtra",
  },
  tiktok: {
    code: "tiktok",
    name: "TikTok Shop",
    logo_color: "#000000",
    phi_thanh_toan_pct: 4.0,       // 4.0%
    phi_co_dinh_pct: 5.0,          // 5.0% hoa hồng nền tảng
    phi_dich_vu_pct: 4.5,          // Gói hỗ trợ phí vận chuyển Extra Shipping
    phi_dich_vu_cap: 35000,
    phi_affiliate_koc_pct: 10.0,   // Hoa hồng chia sẻ cho KOC/KOL livestream
    phi_dong_goi_co_dinh: 15000,
    ty_le_hoan_du_kien_pct: 6.0,   // Tỷ lệ hoàn trên TikTok cao hơn do tính chất chốt đơn cảm xúc
    chi_phi_van_chuyen_hoan: 25000,
    thue_vat_tncn_pct: 1.5,
    mo_ta: "Áp dụng cho đơn hàng bán qua livestream / video Creator",
  },
  lazada: {
    code: "lazada",
    name: "Lazada Việt Nam",
    logo_color: "#0f146d",
    phi_thanh_toan_pct: 3.99,
    phi_co_dinh_pct: 4.5,
    phi_dich_vu_pct: 6.0,          // Freeship Max
    phi_dich_vu_cap: 35000,
    phi_dong_goi_co_dinh: 15000,
    ty_le_hoan_du_kien_pct: 4.0,
    chi_phi_van_chuyen_hoan: 25000,
    thue_vat_tncn_pct: 1.5,
    mo_ta: "Áp dụng cho nhà bán hàng tham gia gói Freeship Max",
  },
};

export class EcommercePolicyDAO {
  static async injectDB(conn) {
    if (policiesCol && sanPhamCol) return;
    try {
      const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
      const db = conn.db(dbName);
      policiesCol = db.collection("ecommerce_policies");
      sanPhamCol = db.collection("san_pham");

      // Khởi tạo chính sách mặc định nếu chưa có
      const count = await policiesCol.countDocuments();
      if (count === 0) {
        await policiesCol.insertOne({
          _id: "default_policies",
          policies: DEFAULT_ECOMMERCE_POLICIES,
          updated_at: new Date(),
        });
      }
    } catch (e) {
      logger.error("EcommercePolicyDAO injectDB error", { error: e.message });
    }
  }

  static async getPolicies() {
    try {
      if (!policiesCol) return DEFAULT_ECOMMERCE_POLICIES;
      const doc = await policiesCol.findOne({ _id: "default_policies" });
      return doc?.policies || DEFAULT_ECOMMERCE_POLICIES;
    } catch (err) {
      logger.error("getPolicies error", { error: err.message });
      return DEFAULT_ECOMMERCE_POLICIES;
    }
  }

  static getAllPolicies() {
    return DEFAULT_ECOMMERCE_POLICIES;
  }

  static compareChannels(gia_niem_yet = 1000000, gia_von = 550000) {
    return this.compareOmnichannel({ gia_niem_yet, gia_von });
  }

  /**
   * Tính toán chi phí, khấu hao và lợi nhuận ròng của 1 sản phẩm trên 1 sàn TMĐT
   */
  static calculateItemPricing({
    gia_niem_yet,           // Giá bán niêm yết trên sàn
    gia_von = 0,            // Giá vốn COGS (từ BOM hoặc nhập)
    kenh_ban = "shopee",    // shopee | tiktok | lazada
    custom_policy = null,   // Cho phép người dùng tùy biến % phí
  }) {
    const policies = DEFAULT_ECOMMERCE_POLICIES;
    const policy = custom_policy || policies[kenh_ban] || policies.shopee;

    const listPrice = Math.max(0, Number(gia_niem_yet) || 0);
    const cogs = Math.max(0, Number(gia_von) || 0);

    // 1. Phí thanh toán
    const feeThanhToan = Math.round(listPrice * (policy.phi_thanh_toan_pct / 100));

    // 2. Phí cố định (hoa hồng)
    const feeHoaHong = Math.round(listPrice * (policy.phi_co_dinh_pct / 100));

    // 3. Phí dịch vụ marketing (Freeship/Hoàn Xu) - có mức trần nếu có
    let feeDichVu = Math.round(listPrice * (policy.phi_dich_vu_pct / 100));
    if (policy.phi_dich_vu_cap && feeDichVu > policy.phi_dich_vu_cap) {
      feeDichVu = policy.phi_dich_vu_cap;
    }

    // 4. Phí Affiliate KOC (nếu có, thường ở TikTok Shop)
    const feeAffiliate = policy.phi_affiliate_koc_pct
      ? Math.round(listPrice * (policy.phi_affiliate_koc_pct / 100))
      : 0;

    // Tổng phí sàn thu
    const tongPhiSan = feeThanhToan + feeHoaHong + feeDichVu + feeAffiliate;

    // 5. Chi phí vận hành & Khấu hao rủi ro
    const feeDongGoi = Number(policy.phi_dong_goi_co_dinh || 0);
    // Khấu hao rủi ro đơn hoàn = tỷ lệ hoàn * phí ship hoàn 2 chiều
    const feeRuiRoHoan = Math.round(
      (policy.ty_le_hoan_du_kien_pct / 100) * (policy.chi_phi_van_chuyen_hoan || 25000)
    );

    // Tổng chi phí ngoài giá vốn
    const tongKhauHao = tongPhiSan + feeDongGoi + feeRuiRoHoan;

    // Doanh thu thực nhận về tài khoản ngân hàng từ sàn
    const doanhThuThucNhan = Math.max(0, listPrice - tongPhiSan);

    // Lợi nhuận ròng cuối cùng (Net Profit)
    const loiNhuanRong = listPrice - cogs - tongKhauHao;

    // Biên lợi nhuận ròng %
    const marginPct = listPrice > 0 ? Number(((loiNhuanRong / listPrice) * 100).toFixed(1)) : 0;

    // Đánh giá mức độ an toàn của giá bán
    let danhGia = "safe"; // An toàn
    let danhGiaLabel = "Biên lợi nhuận tốt";
    if (marginPct < 0) {
      danhGia = "danger";
      danhGiaLabel = "Bị lỗ sau khi trừ phí sàn";
    } else if (marginPct < 10) {
      danhGia = "warning";
      danhGiaLabel = "Biên mỏng - rủi ro khi chạy Voucher/Ads";
    } else if (marginPct >= 20) {
      danhGia = "excellent";
      danhGiaLabel = "Biên lợi nhuận lý tưởng (>20%)";
    }

    return {
      kenh_ban,
      kenh_ten: policy.name,
      gia_niem_yet: listPrice,
      gia_von: cogs,
      chi_tiet_phi: {
        phi_thanh_toan: feeThanhToan,
        phi_hoa_hong: feeHoaHong,
        phi_dich_vu: feeDichVu,
        phi_affiliate: feeAffiliate,
        tong_phi_san: tongPhiSan,
        ty_le_phi_san_pct: listPrice > 0 ? Number(((tongPhiSan / listPrice) * 100).toFixed(1)) : 0,
        phi_dong_goi: feeDongGoi,
        rui_ro_hoan_hang: feeRuiRoHoan,
        tong_khau_hao: tongKhauHao,
      },
      doanh_thu_thuc_nhan: doanhThuThucNhan,
      loi_nhuan_rong: loiNhuanRong,
      margin_pct: marginPct,
      danh_gia: danhGia,
      danh_gia_label: danhGiaLabel,
    };
  }

  /**
   * So sánh cùng lúc 1 sản phẩm bán qua: POS/Trực tiếp vs Shopee vs TikTok vs Lazada
   */
  static compareOmnichannel({ gia_niem_yet, gia_von }) {
    const listPrice = Number(gia_niem_yet) || 0;
    const cogs = Number(gia_von) || 0;

    // Kênh bán trực tiếp (POS/Showroom)
    const directFee = 5000; // Bao bì đóng gói túi nilon đơn giản
    const directNet = listPrice - cogs - directFee;
    const directMargin = listPrice > 0 ? Number(((directNet / listPrice) * 100).toFixed(1)) : 0;

    const direct = {
      kenh_ban: "direct",
      kenh_ten: "Bán Trực Tiếp (POS / Showroom)",
      gia_niem_yet: listPrice,
      gia_von: cogs,
      chi_tiet_phi: {
        tong_phi_san: 0,
        ty_le_phi_san_pct: 0,
        phi_dong_goi: directFee,
        rui_ro_hoan_hang: 0,
        tong_khau_hao: directFee,
      },
      doanh_thu_thuc_nhan: listPrice,
      loi_nhuan_rong: directNet,
      margin_pct: directMargin,
      danh_gia: directMargin >= 20 ? "excellent" : "safe",
      danh_gia_label: "Không mất phí sàn",
    };

    const shopee = this.calculateItemPricing({ gia_niem_yet: listPrice, gia_von: cogs, kenh_ban: "shopee" });
    const tiktok = this.calculateItemPricing({ gia_niem_yet: listPrice, gia_von: cogs, kenh_ban: "tiktok" });
    const lazada = this.calculateItemPricing({ gia_niem_yet: listPrice, gia_von: cogs, kenh_ban: "lazada" });

    return {
      direct,
      shopee,
      tiktok,
      lazada,
    };
  }

  /**
   * Quét toàn bộ danh mục sản phẩm và tính bảng ma trận tỷ suất lợi nhuận trên các sàn
   */
  static async getProductPricingMatrix() {
    try {
      if (!sanPhamCol) return [];
      const products = await sanPhamCol
        .find({ trang_thai: { $ne: "deleted" } })
        .project({ ma_sp: 1, ten_sp: 1, don_gia: 1, so_luong: 1, nguyen_lieu: 1 })
        .toArray();

      return products.map((sp) => {
        // Ước tính giá vốn: khoảng 60% giá bán nếu chưa có giá nhập cụ thể
        const cogs = Math.round((sp.don_gia || 0) * 0.58);
        const comparison = this.compareOmnichannel({
          gia_niem_yet: sp.don_gia || 0,
          gia_von: cogs,
        });

        return {
          id: String(sp._id),
          ma_sp: sp.ma_sp,
          ten_sp: sp.ten_sp,
          ton_kho: sp.so_luong || 0,
          gia_niem_yet: sp.don_gia || 0,
          gia_von_uoc_tinh: cogs,
          channels: comparison,
        };
      });
    } catch (err) {
      logger.error("getProductPricingMatrix error", { error: err.message });
      return [];
    }
  }
}
