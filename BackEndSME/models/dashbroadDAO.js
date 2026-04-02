import { ObjectId } from "mongodb";

let don_hang;
let users;

const STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  PAID: "paid",
  SHIPPING: "shipping",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DELETED: "deleted",
};

const ORDER_TYPE = {
  SALE: "sale",
  PROD_RECEIPT: "prod_receipt",
  PURCHASE_RECEIPT: "purchase_receipt",
};

const METRIC_TO_ORDER_TYPE = {
  ban_sp: ORDER_TYPE.SALE,
  sx_sp: ORDER_TYPE.PROD_RECEIPT,
  nhap_nl: ORDER_TYPE.PURCHASE_RECEIPT,
};

function parseRangeDays(range = "90d") {
  const r = String(range).toLowerCase();
  if (r === "7d") return 7;
  if (r === "30d") return 30;
  return 90;
}

function toDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtYMD(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function safeTz() {
  // timezone để dateToString đúng VN
  return "Asia/Ho_Chi_Minh";
}

function metricToLoaiDon(metric) {
  return METRIC_TO_ORDER_TYPE[String(metric)] || ORDER_TYPE.SALE;
}

function mapTypeLabel(loai_don) {
  if (loai_don === ORDER_TYPE.SALE) return "Đơn bán hàng";
  if (loai_don === ORDER_TYPE.PROD_RECEIPT) return "Đơn nhập sản xuất";
  if (loai_don === ORDER_TYPE.PURCHASE_RECEIPT) return "Đơn nhập mua";
  return String(loai_don || "");
}

function mapStatusLabel(trang_thai) {
  // để khớp sample DataTable: Done / In Process
  if (trang_thai === STATUS.COMPLETED) return "Done";
  if (trang_thai === STATUS.CANCELLED) return "Cancelled";
  return "In Process";
}

export default class DashboardDAO {
  static async injectDB(conn) {
    if (don_hang && users) return;
    try {
      const dbName = process.env.DB_NAME || process.env.MOVIEREVIEWS_DB_NAME;
      const db = conn.db(dbName);

      don_hang = db.collection("don_hang");
      users = db.collection("users");

      await don_hang.createIndex({ loai_don: 1, created_at: -1 });
      await don_hang.createIndex({ trang_thai: 1, created_at: -1 });
    } catch (e) {
      console.error(`DashboardDAO injectDB error: ${e}`);
    }
  }

  static async _dailyCountSeries({
    loai_don,
    from,
    to,
    trang_thai, // optional
    includeCancelled = true,
    includeDeleted = false,
  }) {
    const match = {
      loai_don,
      created_at: { $gte: new Date(from), $lte: new Date(to) },
    };

    // default: bỏ deleted
    if (!includeDeleted) match.trang_thai = { $ne: STATUS.DELETED };

    // nếu có trang_thai filter cụ thể
    if (trang_thai && Object.values(STATUS).includes(trang_thai)) {
      match.trang_thai = trang_thai;
    } else if (!includeCancelled) {
      match.trang_thai = { $nin: [STATUS.DELETED, STATUS.CANCELLED] };
    }

    const tz = safeTz();

    const agg = await don_hang
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$created_at",
                timezone: tz,
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const map = new Map();
    for (const r of agg) map.set(r._id, Number(r.count) || 0);

    // fill missing date => 0
    const out = [];
    const start = toDateOnly(from);
    const end = toDateOnly(to);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const key = fmtYMD(d);
      out.push({ date: key, value: map.get(key) || 0 });
    }

    const total = out.reduce((s, x) => s + (Number(x.value) || 0), 0);
    return { series: out, total };
  }

  /**
   * API CHART (khớp ChartRow)
   * GET /dashboard/orders/compare?metric=sx_sp&yearA=2025&yearB=2024&range=90d&to=2025-06-30
   * -> [{date:"2025-04-01", yearA: 3, yearB: 1}, ...]
   */
  static async getOrdersCompare({
    metric = "ban_sp",
    yearA,
    yearB = "none",
    range = "90d",
    to, // YYYY-MM-DD optional (default today)
    trang_thai, // optional filter
    includeCancelled = true,
  }) {
    try {
      const loai_don = metricToLoaiDon(metric);

      const yA = Number(yearA);
      if (!Number.isFinite(yA)) return { error: new Error("yearA không hợp lệ") };

      const days = parseRangeDays(range);

      const toA = to ? new Date(String(to)) : new Date();
      const toADate = new Date(yA, toA.getMonth(), toA.getDate()); // giữ MM-DD theo yearA

      const fromADate = addDays(toADate, -days);

      const hasB = yearB && yearB !== "none";
      const yB = hasB ? Number(yearB) : null;
      const toBDate = hasB
        ? new Date(yB, toA.getMonth(), toA.getDate())
        : null;
      const fromBDate = hasB ? addDays(toBDate, -days) : null;

      const { series: sA } = await this._dailyCountSeries({
        loai_don,
        from: fromADate,
        to: toADate,
        trang_thai,
        includeCancelled,
      });

      let sB = [];
      if (hasB) {
        const rB = await this._dailyCountSeries({
          loai_don,
          from: fromBDate,
          to: toBDate,
          trang_thai,
          includeCancelled,
        });
        sB = rB.series || [];
      }

      // align by MM-DD
      const mapB = new Map();
      for (const r of sB) mapB.set(String(r.date).slice(5), Number(r.value) || 0);

      const rows = sA.map((r) => {
        const mmdd = String(r.date).slice(5);
        return {
          date: `${yA}-${mmdd}`, // để XAxis chỉ hiện tháng/ngày
          yearA: Number(r.value) || 0,
          yearB: hasB ? mapB.get(mmdd) || 0 : 0,
        };
      });

      return { ok: true, metric, loai_don, rows };
    } catch (e) {
      console.error(`getOrdersCompare error: ${e}`);
      return { error: e };
    }
  }

  /**
   * API trả 3 chart 1 lần
   * GET /dashboard/orders/overview?yearA=2025&yearB=2024&range=90d&to=2025-06-30
   */
  static async getOrdersOverview(params) {
    const [a, b, c] = await Promise.all([
      this.getOrdersCompare({ ...params, metric: "nhap_nl" }),
      this.getOrdersCompare({ ...params, metric: "sx_sp" }),
      this.getOrdersCompare({ ...params, metric: "ban_sp" }),
    ]);

    if (a?.error) return a;
    if (b?.error) return b;
    if (c?.error) return c;

    return {
      ok: true,
      nhap_nl: a.rows,
      sx_sp: b.rows,
      ban_sp: c.rows,
    };
  }

  /**
   * API TABLE khớp sample (id, header, type, status, target, limit, reviewer)
   * GET /dashboard/orders/table?page=1&limit=20&q=&loai_don=&trang_thai=
   */
  static async getOrdersTable({
    page = 1,
    limit = 20,
    q = "",
    loai_don,
    trang_thai,
    includeDeleted = false,
  } = {}) {
    try {
      const filter = {};
      if (!includeDeleted) filter.trang_thai = { $ne: STATUS.DELETED };

      if (loai_don && Object.values(ORDER_TYPE).includes(loai_don)) {
        filter.loai_don = loai_don;
      }
      if (trang_thai && Object.values(STATUS).includes(trang_thai)) {
        filter.trang_thai = trang_thai;
      }

      if (q && String(q).trim()) {
        const s = String(q).trim();
        filter.$or = [
          { ma_dh: { $regex: s, $options: "i" } },
          { khach_hang_ten: { $regex: s, $options: "i" } },
          { nha_cung_cap_ten: { $regex: s, $options: "i" } },
          { "san_pham.ten_sp": { $regex: s, $options: "i" } },
        ];
      }

      const skip = Math.max(0, (Number(page) - 1) * Number(limit));

      const pipeline = [
        { $match: filter },
        { $sort: { created_at: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: "users",
            localField: "nguoi_lap_id",
            foreignField: "_id",
            as: "creator",
          },
        },
        { $addFields: { creator: { $arrayElemAt: ["$creator", 0] } } },
        {
          $project: {
            _id: 1,
            ma_dh: 1,
            loai_don: 1,
            trang_thai: 1,
            tong_tien: 1,
            san_pham_len: { $size: { $ifNull: ["$san_pham", []] } },
            creator_name: "$creator.ho_ten",
          },
        },
      ];

      const [docs, total] = await Promise.all([
        don_hang.aggregate(pipeline).toArray(),
        don_hang.countDocuments(filter),
      ]);

      const items = docs.map((d) => ({
        id: String(d._id),
        header: d.ma_dh || "",
        type: mapTypeLabel(d.loai_don),
        status: mapStatusLabel(d.trang_thai),
        target: String(Number(d.tong_tien || 0)),
        limit: String(Number(d.san_pham_len || 0)),
        reviewer: d.creator_name || "N/A",
      }));

      return {
        ok: true,
        items,
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      };
    } catch (e) {
      console.error(`getOrdersTable error: ${e}`);
      return { error: e };
    }
  }
}
