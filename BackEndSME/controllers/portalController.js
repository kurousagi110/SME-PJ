import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";

let hoaDonCol = null;
let hopDongCol = null;
let baoHanhCol = null;
let lenhSanXuatCol = null;
let vanChuyenCol = null;

export function injectPortalDB(conn) {
  if (hoaDonCol) return;
  const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
  if (!dbName) throw new Error("PortalController.injectPortalDB: missing SME_DB_NAME env var");
  const db = conn.db(dbName);
  hoaDonCol = db.collection("hoa_don");
  hopDongCol = db.collection("hop_dong_kinh_te");
  baoHanhCol = db.collection("bao_hanh");
  lenhSanXuatCol = db.collection("lenh_san_xuat");
  vanChuyenCol = db.collection("van_chuyen");
}

function last4Digits(phone = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : digits;
}

function verifyPhoneLast4(storedPhone, inputPhone) {
  const stored = last4Digits(storedPhone);
  const input = last4Digits(inputPhone);
  if (!stored || !input || input.length < 4) return false;
  return stored === input;
}

function buildVietQrUrl(amount, info) {
  const bankId = process.env.VIETQR_BANK_ID || "MB";
  const accountNo = process.env.VIETQR_ACCOUNT_NO || "0901234567";
  const accountName = encodeURIComponent(process.env.VIETQR_ACCOUNT_NAME || "CONG TY SME ERP");
  const cleanInfo = encodeURIComponent(String(info || "Thanh toan").slice(0, 50));
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${Math.max(0, Math.round(Number(amount) || 0))}&addInfo=${cleanInfo}&accountName=${accountName}`;
}

export default class PortalController {
  /**
   * GET /api/v1/portal/lookup?code=...&phone=...
   * Public self-service lookup for customers (requires code + last 4 digits of phone).
   */
  static lookup = asyncHandler(async (req, res) => {
    if (!hoaDonCol) {
      return sendError(res, "Dịch vụ tra cứu chưa sẵn sàng", 503);
    }

    const code = String(req.query.code || "").trim();
    const phone = String(req.query.phone || "").trim();

    if (!code) {
      return sendError(res, "Vui lòng nhập mã đơn hàng, hợp đồng hoặc bảo hành", 400);
    }
    if (last4Digits(phone).length < 4) {
      return sendError(res, "Vui lòng nhập ít nhất 4 số cuối số điện thoại đặt hàng để xác thực", 400);
    }

    const codeRegex = new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    // 1. Tra cứu Đơn hàng (hoa_don)
    const order = await hoaDonCol.findOne({ ma_dh: codeRegex, trang_thai: { $ne: "deleted" } });
    if (order) {
      const orderPhone =
        order.khach_hang?.so_dien_thoai ||
        order.khach_hang?.sdt ||
        order.doi_tuong?.so_dien_thoai ||
        order.so_dien_thoai ||
        "";

      if (!verifyPhoneLast4(orderPhone, phone)) {
        return sendError(res, "Mã tra cứu hoặc 4 số cuối SĐT không khớp", 404);
      }

      const [productionOrder, shipment] = await Promise.all([
        lenhSanXuatCol
          ? lenhSanXuatCol.findOne(
              { $or: [{ don_hang_id: order._id }, { ma_don_hang: order.ma_dh }] },
              { projection: { ma_lenh: 1, trang_thai: 1, cong_doan: 1, so_luong: 1, so_luong_dat: 1, updated_at: 1 } }
            )
          : null,
        vanChuyenCol
          ? vanChuyenCol.findOne(
              { $or: [{ don_hang_id: order._id }, { ma_dh: order.ma_dh }] },
              { projection: { ma_van_don: 1, don_vi_van_chuyen: 1, trang_thai: 1, ngay_giao_du_kien: 1, updated_at: 1 } }
            )
          : null,
      ]);

      return sendSuccess(
        res,
        {
          type: "order",
          code: order.ma_dh,
          created_at: order.ngay_lap || order.created_at,
          customer_name: order.khach_hang?.ten || order.doi_tuong?.ten || "Khách hàng",
          status: order.trang_thai,
          total_amount: order.tong_tien || 0,
          paid_amount: order.da_thanh_toan || 0,
          items: (order.chi_tiet || order.san_pham || []).map((it) => ({
            ten: it.ten_san_pham || it.ten || "Sản phẩm",
            so_luong: it.so_luong || 1,
            don_gia: it.don_gia || 0,
            thanh_tien: it.thanh_tien || (it.so_luong || 1) * (it.don_gia || 0),
          })),
          production: productionOrder || null,
          shipment: shipment || null,
        },
        "Tra cứu đơn hàng thành công"
      );
    }

    // 2. Tra cứu Hợp đồng B2B (hop_dong_kinh_te)
    if (hopDongCol) {
      const contract = await hopDongCol.findOne({ ma_hop_dong: codeRegex, trang_thai: { $ne: "deleted" } });
      if (contract) {
        const contractPhone = contract.khach_hang?.so_dien_thoai || contract.so_dien_thoai || "";
        if (!verifyPhoneLast4(contractPhone, phone)) {
          return sendError(res, "Mã tra cứu hoặc 4 số cuối SĐT không khớp", 404);
        }

        const milestones = (contract.cac_dot_thanh_toan || []).map((m, idx) => ({
          dot: m.ten_dot || `Đợt ${idx + 1}`,
          so_tien: m.so_tien || 0,
          han_thanh_toan: m.han_thanh_toan || null,
          trang_thai: m.trang_thai || "chua_thanh_toan",
          vietqr_url:
            m.trang_thai !== "da_thanh_toan"
              ? buildVietQrUrl(m.so_tien || 0, `${contract.ma_hop_dong} D${idx + 1}`)
              : null,
        }));

        return sendSuccess(
          res,
          {
            type: "contract",
            code: contract.ma_hop_dong,
            title: contract.ten_hop_dong,
            customer_name: contract.khach_hang?.ten || "Đối tác",
            status: contract.trang_thai,
            total_amount: contract.gia_tri_hop_dong || 0,
            paid_amount: contract.da_thanh_toan || 0,
            milestones,
          },
          "Tra cứu hợp đồng thành công"
        );
      }
    }

    // 3. Tra cứu Bảo hành điện tử (bao_hanh)
    if (baoHanhCol) {
      const warranty = await baoHanhCol.findOne({
        $or: [{ ma_bao_hanh: codeRegex }, { serial_number: codeRegex }],
      });
      if (warranty) {
        const wPhone = warranty.khach_hang?.so_dien_thoai || warranty.so_dien_thoai || "";
        if (!verifyPhoneLast4(wPhone, phone)) {
          return sendError(res, "Mã tra cứu hoặc 4 số cuối SĐT không khớp", 404);
        }

        return sendSuccess(
          res,
          {
            type: "warranty",
            code: warranty.ma_bao_hanh || warranty.serial_number,
            serial_number: warranty.serial_number || null,
            product_name: warranty.ten_san_pham || "Sản phẩm",
            customer_name: warranty.khach_hang?.ten || "Khách hàng",
            status: warranty.trang_thai || "con_han",
            start_date: warranty.ngay_bat_dau || warranty.created_at,
            end_date: warranty.ngay_het_han || null,
            history: warranty.lich_su_sua_chua || [],
          },
          "Tra cứu bảo hành thành công"
        );
      }
    }

    return sendError(res, "Không tìm thấy chứng từ phù hợp với mã và SĐT đã nhập", 404);
  });
}
