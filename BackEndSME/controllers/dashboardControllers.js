import DashboardDAO from "../models/dashbroadDAO.js";

export default class DashboardController {
  // GET /dashboard/orders/compare
  static async ordersCompare(req, res) {
    try {
      const {
        metric = "ban_sp",
        yearA,
        yearB = "none",
        range = "90d",
        to,
        trang_thai,
        includeCancelled = "true",
      } = req.query;

      const result = await DashboardDAO.getOrdersCompare({
        metric,
        yearA,
        yearB,
        range,
        to,
        trang_thai,
        includeCancelled: String(includeCancelled) !== "false",
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Không lấy được chart" });
      }

      return res.json({ rows: result.rows || [] });
    } catch (e) {
      return res.status(500).json({ message: "Không lấy được chart", error: e.message });
    }
  }

  // GET /dashboard/orders/overview
  static async ordersOverview(req, res) {
    try {
      const {
        yearA,
        yearB = "none",
        range = "90d",
        to,
        trang_thai,
        includeCancelled = "true",
      } = req.query;

      const result = await DashboardDAO.getOrdersOverview({
        yearA,
        yearB,
        range,
        to,
        trang_thai,
        includeCancelled: String(includeCancelled) !== "false",
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Không lấy được overview" });
      }

      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Không lấy được overview", error: e.message });
    }
  }

  // GET /dashboard/orders/table
  static async ordersTable(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        q = "",
        loai_don,
        trang_thai,
        includeDeleted = "false",
      } = req.query;

      const result = await DashboardDAO.getOrdersTable({
        page: Number(page),
        limit: Number(limit),
        q,
        loai_don,
        trang_thai,
        includeDeleted: String(includeDeleted) === "true",
      });

      if (result?.error) {
        return res.status(400).json({ message: result.error.message || "Không lấy được bảng" });
      }
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: "Không lấy được bảng", error: e.message });
    }
  }
}
