import BomDAO from "../models/bomDAO.js";

export default class BomController {
  // POST /bom/:san_pham_id
  static async setBOM(req, res) {
    try {
      const { san_pham_id } = req.params;
      const { items = [], ghi_chu = "" } = req.body || {};

      const result = await BomDAO.setBOM(san_pham_id, items, { ghi_chu });
      if (result?.error) return res.status(400).json({ message: result.error.message || "Khai báo BOM thất bại" });

      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Khai báo BOM thất bại", error: e.message });
    }
  }

  // GET /bom/:san_pham_id
  static async getBOM(req, res) {
    try {
      const { san_pham_id } = req.params;
      const doc = await BomDAO.getBOM(san_pham_id);
      if (doc?.error) return res.status(404).json({ message: doc.error.message });
      return res.json(doc);
    } catch (e) {
      return res.status(500).json({ message: "Lấy BOM thất bại", error: e.message });
    }
  }

  // GET /bom/:san_pham_id/unit-cost
  static async calcUnitCost(req, res) {
    try {
      const { san_pham_id } = req.params;
      const result = await BomDAO.calcUnitCost(san_pham_id);
      if (result?.error) return res.status(400).json({ message: result.error.message || "Tính giá thành thất bại" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Tính giá thành thất bại", error: e.message });
    }
  }
}
