/**
 * Logistics Provider API Service (GHN, GHTK, Viettel Post)
 * Mô phỏng và tích hợp trực tiếp việc ước tính cước phí và phát hành vận đơn
 */

export class LogisticsService {
  /**
   * Tính toán phí vận chuyển ước tính dựa trên khoảng cách / khối lượng
   */
  static calculateShippingFee({
    carrier = "ghn", // "ghn" | "ghtk" | "viettelpost"
    weightGram = 1000,
    fromProvince = "Hà Nội",
    toProvince = "Hồ Chí Minh",
    isCOD = false,
    codAmount = 0,
  }) {
    let baseRate = 25000;
    const isInterRegion = fromProvince.trim().toLowerCase() !== toProvince.trim().toLowerCase();

    if (isInterRegion) {
      baseRate += 15000; // Phụ phí liên tỉnh
    }

    // Phụ phí khối lượng vượt 1kg
    if (weightGram > 1000) {
      const extraKg = Math.ceil((weightGram - 1000) / 500);
      baseRate += extraKg * 5000;
    }

    // Hệ số theo từng hãng
    const carrierMultipliers = {
      ghn: 1.0,
      ghtk: 0.95,
      viettelpost: 1.05,
      jtexpress: 0.9,
    };

    const multiplier = carrierMultipliers[carrier.toLowerCase()] || 1.0;
    const estimatedFee = Math.round((baseRate * multiplier) / 1000) * 1000;

    // Phí COD (nếu có thu hộ)
    const codFee = isCOD && codAmount > 1000000 ? Math.round(codAmount * 0.005) : 0;

    return {
      carrier: carrier.toUpperCase(),
      weightGram,
      estimatedFee,
      codFee,
      totalFee: estimatedFee + codFee,
      estimatedDeliveryDays: isInterRegion ? "2 - 3 ngày" : "24 giờ",
    };
  }

  /**
   * Tạo vận đơn thật / mô phỏng kết nối API hãng vận chuyển
   */
  static async pushOrderToCarrier({
    carrier = "GHN",
    orderCode,
    receiverName,
    receiverPhone,
    receiverAddress,
    weightGram = 1000,
    codAmount = 0,
    note = "",
  }) {
    // Tiền tố mã vận đơn theo từng hãng thực tế
    const prefixes = {
      GHN: "GHN",
      GHTK: "SME.TK.",
      VIETTELPOST: "VT",
      JTEXPRESS: "JT",
    };

    const prefix = prefixes[carrier.toUpperCase()] || "WB";
    const randCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const trackingCode = `${prefix}${Date.now().toString().slice(-6)}${randCode}`;

    return {
      success: true,
      carrier: carrier.toUpperCase(),
      trackingCode,
      trackingUrl: `https://tracking.carrier.vn/${trackingCode}`,
      status: "ready_to_pick",
      orderCode,
      codAmount,
      weightGram,
      createdAt: new Date(),
    };
  }
}
