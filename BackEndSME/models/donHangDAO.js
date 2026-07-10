// Refactor 2026-07-09: donHangDAO.js giờ chỉ là FACADE.
// Method bodies đã được tách vào các module con theo domain:
//   - donHangState.js     → shared collection handles + indexes
//   - donHangHelpers.js   → pure functions (no I/O)
//   - donHangCRUD.js      → create + read + update items/pricing
//   - donHangInventory.js → inventory helpers + _applyInventoryOnCompleted + getProductionNeeds
//   - donHangStatus.js    → status transitions + delete/restore
//   - donHangReports.js   → reports (thongKeDoanhThu)
//
// Public API không đổi — services/donHangService.js và index.js không cần sửa.
// Đây là Class field shorthand (Node 20+): `static X = Module.X` bind function
// reference tại thời điểm class definition.

import logger from "../utils/logger.js";
import { state, setState, injectIndexes } from "./donHangState.js";
import * as CRUD      from "./donHangCRUD.js";
import * as Inventory from "./donHangInventory.js";
import * as Status    from "./donHangStatus.js";
import * as Reports   from "./donHangReports.js";

export default class DonHangDAO {
  /* ─────────── injectDB (giữ nguyên signature cho index.js) ─────────── */
  static async injectDB(conn) {
    if (state.don_hang && state.san_pham_col && state.nguyen_lieu_col) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("DonHangDAO.injectDB: missing SME_DB_NAME env var");
    try {
      const db = conn.db(dbName);

      // Set state cho tất cả module con
      setState({
        don_hang:        db.collection("don_hang"),
        san_pham_col:    db.collection("san_pham"),
        nguyen_lieu_col: db.collection("nguyen_lieu"),
        bom_col:         db.collection("bom_san_pham"),
        users_col:       db.collection("users"),
      });

      await injectIndexes(db);
      logger.info("[DonHangDAO] injectDB done");
    } catch (e) {
      logger.error("Unable to establish collection handles", { error: e.message });
    }
  }

  /* ─────────── Facade: CRUD ─────────── */
  static taoDonHang        = CRUD.taoDonHang;
  static getDonHangById    = CRUD.getDonHangById;
  static getByCode         = CRUD.getByCode;
  static listDonHang       = CRUD.listDonHang;
  static capNhatSanPham    = CRUD.capNhatSanPham;
  static themSanPham       = CRUD.themSanPham;
  static xoaSanPham        = CRUD.xoaSanPham;
  static apDungGiamGia     = CRUD.apDungGiamGia;
  static apDungThue        = CRUD.apDungThue;
  static setPhiVanChuyen   = CRUD.setPhiVanChuyen;
  static capNhatThanhToan  = CRUD.capNhatThanhToan;
  static capNhatGhiChu     = CRUD.capNhatGhiChu;

  /* ─────────── Facade: Inventory ─────────── */
  static getProductionNeeds = Inventory.getProductionNeeds;

  /* ─────────── Facade: Status ─────────── */
  static capNhatTrangThaiVaTonKho = Status.capNhatTrangThaiVaTonKho;
  static softDeleteDonHang         = Status.softDeleteDonHang;
  static restoreDonHang            = Status.restoreDonHang;
  static hardDeleteDonHang         = Status.hardDeleteDonHang;

  /* ─────────── Facade: Reports ─────────── */
  static thongKeDoanhThu = Reports.thongKeDoanhThu;
}
