import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { escapeSafeRegexPattern } from "../utils/securityHelpers.js";

let donHangCol = null;
let hopDongCol = null;
let baoHanhCol = null;
let vanChuyenCol = null;
let doiTacCol = null;

export function injectPortalDB(conn) {
  if (donHangCol) return;
  const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
  if (!dbName) throw new Error("PortalController.injectPortalDB: missing SME_DB_NAME env var");
  const db = conn.db(dbName);
  donHangCol = db.collection("don_hang");
  hopDongCol = db.collection("hop_dong");
  baoHanhCol = db.collection("phieu_bao_hanh");
  vanChuyenCol = db.collection("van_chuyen");
  doiTacCol = db.collection("doi_tac");
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
    if (!donHangCol) {
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

    const codeRegex = new RegExp(`^${escapeSafeRegexPattern(code)}$`, "i");

    // 1. Tra cứu Đơn hàng (don_hang)
    const order = await donHangCol.findOne({ ma_dh: codeRegex, trang_thai: { $ne: "deleted" } });
    if (order) {
      const [productionOrder, shipment, partner] = await Promise.all([
        donHangCol.findOne(
          {
            loai_don: { $in: ["prod_receipt", "production_receipt"] },
            $or: [{ don_hang_goc_id: order._id }, { ma_dh_goc: order.ma_dh }],
          },
          { projection: { ma_dh: 1, trang_thai: 1, cong_doan_hien_tai: 1, updated_at: 1 } }
        ),
        vanChuyenCol
          ? vanChuyenCol.findOne(
              { $or: [{ don_hang_id: order._id }, { ma_don_hang: order.ma_dh }, { ma_dh: order.ma_dh }] },
              { projection: { ma_van_don: 1, don_vi_van_chuyen: 1, trang_thai: 1, nguoi_nhan: 1, ngay_giao_du_kien: 1, updated_at: 1 } }
            )
          : null,
        doiTacCol && order.khach_hang_ten
          ? doiTacCol.findOne(
              { ten: new RegExp(`^${escapeSafeRegexPattern(order.khach_hang_ten)}$`, "i") },
              { projection: { so_dien_thoai: 1 } }
            )
          : null,
      ]);

      const candidatePhones = [
        order.khach_hang?.so_dien_thoai,
        order.khach_hang?.sdt,
        order.so_dien_thoai,
        shipment?.nguoi_nhan?.sdt,
        shipment?.nguoi_nhan?.so_dien_thoai,
        partner?.so_dien_thoai,
      ].filter(Boolean);

      if (candidatePhones.length === 0 || !candidatePhones.some((p) => verifyPhoneLast4(p, phone))) {
        return sendError(res, "Mã tra cứu hoặc 4 số cuối SĐT không khớp", 404);
      }

      return sendSuccess(
        res,
        {
          type: "order",
          code: order.ma_dh,
          created_at: order.ngay_dat || order.created_at,
          customer_name: order.khach_hang_ten || order.khach_hang?.ten || "Khách hàng",
          status: order.trang_thai,
          total_amount: order.tong_tien || 0,
          paid_amount: order.thanh_toan?.amount ?? order.da_thanh_toan ?? 0,
          items: (order.san_pham || order.chi_tiet || []).map((it) => ({
            ten: it.ten_sp || it.ten_san_pham || it.ten || "Sản phẩm",
            so_luong: it.so_luong || 1,
            don_gia: it.don_gia || 0,
            thanh_tien: it.thanh_tien || (it.so_luong || 1) * (it.don_gia || 0),
          })),
          production: productionOrder
            ? {
                ma_lenh: productionOrder.ma_dh,
                trang_thai: productionOrder.trang_thai,
                cong_doan: productionOrder.cong_doan_hien_tai,
              }
            : null,
          shipment: shipment || null,
        },
        "Tra cứu đơn hàng thành công"
      );
    }

    // 2. Tra cứu Hợp đồng B2B (hop_dong)
    if (hopDongCol) {
      const contract = await hopDongCol.findOne({ ma_hop_dong: codeRegex, trang_thai: { $ne: "deleted" } });
      if (contract) {
        const partner =
          doiTacCol && contract.partner_name
            ? await doiTacCol.findOne(
                { ten: new RegExp(`^${escapeSafeRegexPattern(contract.partner_name)}$`, "i") },
                { projection: { so_dien_thoai: 1 } }
              )
            : null;
        const contractPhone =
          contract.so_dien_thoai || contract.khach_hang?.so_dien_thoai || partner?.so_dien_thoai || "";

        if (!verifyPhoneLast4(contractPhone, phone)) {
          return sendError(res, "Mã tra cứu hoặc 4 số cuối SĐT không khớp", 404);
        }

        const rawMilestones = contract.dot_thanh_toan || contract.cac_dot_thanh_toan || [];
        const paidAmount = rawMilestones
          .filter((m) => m.trang_thai === "paid" || m.trang_thai === "da_thanh_toan")
          .reduce((s, m) => s + Number(m.so_tien || 0), 0);

        const milestones = rawMilestones.map((m, idx) => {
          const isPaid = m.trang_thai === "paid" || m.trang_thai === "da_thanh_toan";
          return {
            dot: m.ten_dot || `Đợt ${m.dot || idx + 1}`,
            so_tien: m.so_tien || 0,
            han_thanh_toan: m.han_thanh_toan || null,
            trang_thai: isPaid ? "da_thanh_toan" : "chua_thanh_toan",
            vietqr_url: !isPaid ? buildVietQrUrl(m.so_tien || 0, `${contract.ma_hop_dong} D${idx + 1}`) : null,
          };
        });

        return sendSuccess(
          res,
          {
            type: "contract",
            code: contract.ma_hop_dong,
            title: contract.ten_hop_dong,
            customer_name: contract.partner_name || contract.khach_hang?.ten || "Đối tác",
            status: contract.trang_thai,
            total_amount: contract.gia_tri_hop_dong || 0,
            paid_amount: paidAmount,
            milestones,
          },
          "Tra cứu hợp đồng thành công"
        );
      }
    }

    // 3. Tra cứu Bảo hành điện tử (phieu_bao_hanh)
    if (baoHanhCol) {
      const warranty = await baoHanhCol.findOne({
        $or: [{ ma_bao_hanh: codeRegex }, { serial_number: codeRegex }],
      });
      if (warranty) {
        const wPhone = warranty.so_dien_thoai || warranty.khach_hang?.so_dien_thoai || "";
        if (!verifyPhoneLast4(wPhone, phone)) {
          return sendError(res, "Mã tra cứu hoặc 4 số cuối SĐT không khớp", 404);
        }

        return sendSuccess(
          res,
          {
            type: "warranty",
            code: warranty.ma_bao_hanh || warranty.serial_number,
            serial_number: warranty.serial_number || null,
            product_name: warranty.ten_sp || warranty.ten_san_pham || "Sản phẩm",
            customer_name: warranty.khach_hang_ten || warranty.khach_hang?.ten || "Khách hàng",
            status: warranty.trang_thai || "active",
            start_date: warranty.ngay_kich_hoat || warranty.ngay_bat_dau || warranty.created_at,
            end_date: warranty.ngay_het_han || null,
            history: warranty.lich_su_bao_tri || warranty.lich_su_sua_chua || [],
          },
          "Tra cứu bảo hành thành công"
        );
      }
    }

    return sendError(res, "Không tìm thấy chứng từ phù hợp với mã và SĐT đã nhập", 404);
  });
}
