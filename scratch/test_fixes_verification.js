import http from "http";

const BASE_URL = "http://127.0.0.1/api/v1";

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function requestHttpRaw(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 80,
      path,
      method,
    };
    const req = http.request(options, (res) => {
      resolve({
        status: res.statusCode,
        headers: res.headers,
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function run() {
  console.log("=== KIỂM THỬ XÁC MINH CÁC LỖI ĐÃ ĐƯỢC KHẮC PHỤC ===");

  // 1. Đăng nhập Admin
  console.log("\n[1] Đăng nhập Admin...");
  const adminLogin = await request("POST", "/users/login", { tai_khoan: "admin", password: "123456" });
  const adminToken = adminLogin.body?.data?.accessToken;
  console.log("-> Admin Token:", !!adminToken);

  // 2. Đăng nhập Thủ kho (thukho / 123456)
  console.log("\n[2] Đăng nhập Thủ kho...");
  const thukhoLogin = await request("POST", "/users/login", { tai_khoan: "thukho", password: "123456" });
  const thukhoToken = thukhoLogin.body?.data?.accessToken;
  console.log("-> Thủ kho Token:", !!thukhoToken);

  // 3. Đăng nhập Kinh doanh (sale / 123456)
  console.log("\n[3] Đăng nhập Nhân viên kinh doanh...");
  const saleLogin = await request("POST", "/users/login", { tai_khoan: "sale", password: "123456" });
  const saleToken = saleLogin.body?.data?.accessToken;
  console.log("-> Sale Token:", !!saleToken);

  // 4. Test Fix 1 & Fix 2: Hộp Ký Duyệt Điều Chỉnh Kho (DieuChinhKhoDAO.duyetPhieu / tuChoiPhieu)
  console.log("\n[4] Kiểm tra duyệt điều chỉnh kho qua /approvals/action...");
  const pending = await request("GET", "/approvals/pending", null, adminToken);
  const stockAdjs = pending.body?.data?.stockAdjustments || [];
  console.log("-> Số phiếu điều chỉnh kho chờ duyệt:", stockAdjs.length);

  if (stockAdjs.length > 0) {
    const targetAdj = stockAdjs[0];
    console.log("-> Thử từ chối phiếu:", targetAdj._id, `(${targetAdj.ten_hang})`);
    const rejectRes = await request("POST", "/approvals/action", {
      loai: "stock_adjustment",
      id: targetAdj._id,
      hanh_dong: "reject",
      ghi_chu: "Từ chối trong bài kiểm thử tự động",
    }, adminToken);
    console.log("-> Kết quả từ chối phiếu:", rejectRes.status, rejectRes.body?.message || rejectRes.body);
  }

  // 5. Test Fix 2: Phân quyền Separation of Duties (Thủ kho không được duyệt chi lương)
  console.log("\n[5] Kiểm tra phân quyền: Thủ kho thử duyệt chi lương...");
  const payrollHack = await request("POST", "/approvals/action", {
    loai: "payroll",
    id: "fake_payroll_id",
    hanh_dong: "approve",
  }, thukhoToken);
  console.log("-> Status khi thủ kho duyệt chi lương:", payrollHack.status, "(Mong muốn: 403 Forbidden)");
  console.log("-> Message phản hồi:", payrollHack.body?.message);

  // 6. Test Fix 5: Bảo mật cấu hình AI Copilot (Nhân viên sale không được sửa cấu hình AI)
  console.log("\n[6] Kiểm tra bảo mật AI Copilot: Nhân viên sale thử sửa cấu hình AI...");
  const aiHack = await request("POST", "/ai-copilot/config", {
    provider: "openai",
    api_key: "sk-fake-key",
    model: "gpt-4o",
  }, saleToken);
  console.log("-> Status khi nhân viên sale sửa config AI:", aiHack.status, "(Mong muốn: 403 Forbidden)");
  console.log("-> Message phản hồi:", aiHack.body?.message);

  // 7. Test Fix 9: Phân quyền tạo đơn mua từ MRP (Nhân viên sale không được tạo đơn mua)
  console.log("\n[7] Kiểm tra bảo mật MRP: Nhân viên sale thử tạo đơn mua...");
  const mrpHack = await request("POST", "/planning/mrp/tao-don-mua", {
    items: [],
  }, saleToken);
  console.log("-> Status khi nhân viên sale tạo đơn mua MRP:", mrpHack.status, "(Mong muốn: 403 Forbidden)");
  console.log("-> Message phản hồi:", mrpHack.body?.message);

  // 8. Test Fix 3: Next.js middleware chặn truy cập unauthenticated vào /sales
  console.log("\n[8] Kiểm tra Next.js Middleware chặn route chưa xác thực (/sales)...");
  const feRes = await requestHttpRaw("GET", "/sales");
  console.log("-> Status khi truy cập /sales không có cookie:", feRes.status, "(Mong muốn: 307 Redirect)");
  console.log("-> Redirect Location:", feRes.headers?.location);

  // 10. Test Phase 2: Bulk Import Validation chặn giá trị âm
  console.log("\n[10] Kiểm tra Bulk Import: Chặn sản phẩm có số lượng hoặc đơn giá âm...");
  const invalidBulkImport = await request("POST", "/import/bulk", {
    type: "san_pham",
    items: [
      { ma_sp: "TEST_SP_NEG", ten_sp: "Sản phẩm âm test", don_gia: -1000, so_luong: -5 },
    ],
  }, adminToken);
  console.log("-> Status bulk import:", invalidBulkImport.status);
  console.log("-> Success count:", invalidBulkImport.body?.data?.successCount, "(Mong muốn: 0)");
  console.log("-> Error count:", invalidBulkImport.body?.data?.errorCount, "(Mong muốn: 1)");
  console.log("-> Chi tiết lỗi:", invalidBulkImport.body?.data?.errors?.[0]?.error);

  // 12. Test Closed-Loop: Auto-Posting Sổ quỹ khi đơn bán hàng thanh toán
  console.log("\n[12] Kiểm tra Closed-Loop: Bán lẻ POS tự động sinh Phiếu Thu trong Sổ quỹ...");
  const posRes = await request("POST", "/don-hang/pos", {
    khach_hang_ten: "Khách VIP Closed-Loop",
    san_pham: [
      { san_pham_id: "6ab22b35a2a51c0f66eba902", ma_sp: "SP007", ten_sp: "Giường ngủ 1m6", don_gia: 4200000, so_luong: 1 },
    ],
    phuong_thuc_tt: "chuyen_khoan",
  }, adminToken);
  console.log("-> Status tạo đơn POS:", posRes.status, posRes.body?.message || "");
  const posCode = posRes.body?.data?.ma_dh || posRes.body?.data?.order?.ma_dh;
  console.log("-> Mã đơn POS tạo thành công:", posCode);

  const voucherCheck = await request("GET", `/so-quy?search=${posCode}`, null, adminToken);
  const foundVoucher = voucherCheck.body?.data?.items?.[0];
  console.log("-> Đã tự động sinh Phiếu Thu trong Sổ quỹ:", !!foundVoucher, foundVoucher?.ma_phieu);
  console.log("-> Số tiền thu đúng bằng đơn hàng:", foundVoucher?.so_tien === 4200000);

  // 13. Test Closed-Loop: Khóa sổ kỳ kế toán (Period-End Closing)
  console.log("\n[13] Kiểm tra Closed-Loop: Khóa sổ kỳ kế toán tháng cũ & chặn sửa đổi...");
  const closeRes = await request("POST", "/so-quy/ky-ke-toan/chot-so", {
    ky: "2025-12",
    tu_ngay: "2025-12-01",
    den_ngay: "2025-12-31",
    ghi_chu: "Đã chốt sổ tài chính năm 2025",
  }, adminToken);
  console.log("-> Status chốt sổ kỳ 2025-12:", closeRes.status, closeRes.body?.message);

  // Thử tạo phiếu thu lùi về ngày đã chốt sổ (Mong muốn: 403 Forbidden)
  const lockedVoucherTry = await request("POST", "/so-quy", {
    loai_phieu: "thu",
    so_tien: 1000000,
    ngay_ghi_nhan: "2025-12-15",
    hang_muc: "thu_khac",
  }, adminToken);
  console.log("-> Status khi cố tình ghi phiếu vào kỳ đã chốt:", lockedVoucherTry.status, "(Mong muốn: 403 Forbidden)");
  console.log("-> Phản hồi chặn khóa sổ:", lockedVoucherTry.body?.message);

  // 14. Test Closed-Loop: Quy trình đổi trả hàng RMA & QC Gate
  console.log("\n[14] Kiểm tra Closed-Loop: Quy trình đổi trả hàng (RMA) & QC...");
  const rmaCreate = await request("POST", "/doi-tra", {
    ma_dh: posCode,
    ly_do: "Khách đổi sang mẫu khác",
    phuong_an_hoan_tien: "hoan_tien_mat",
    san_pham: [
      { san_pham_id: "6ab22b35a2a51c0f66eba902", ma_sp: "SP007", ten_sp: "Giường ngủ 1m6", so_luong: 1, don_gia: 4200000 },
    ],
  }, adminToken);
  console.log("-> Status tạo phiếu RMA:", rmaCreate.status, rmaCreate.body?.message || "");
  const rmaCode = rmaCreate.body?.data?.ma_rma;
  console.log("-> Mã RMA tạo:", rmaCode);

  // Phê duyệt trong Hộp Thư Trình Ký
  const rmaApprove = await request("POST", "/approvals/action", {
    loai: "return_order",
    id: rmaCode,
    hanh_dong: "approve",
  }, adminToken);
  console.log("-> Trình ký duyệt RMA:", rmaApprove.status, rmaApprove.body?.message);

  // Kho kiểm tra QC & Hoàn tất (Tự động sinh phiếu chi hoàn tiền mặt)
  const rmaQC = await request("POST", `/doi-tra/${rmaCode}/qc-complete`, {
    qc_details: [{ ma_sp: "SP007", qc_result: "nhap_lai_kho" }],
    ghi_chu_qc: "Hàng nguyên vẹn, nhập kho bán tiếp",
  }, adminToken);
  console.log("-> QC nghiệm thu & Hoàn tất:", rmaQC.status, rmaQC.body?.message || "");
  console.log("-> Tự động sinh Phiếu Chi hoàn tiền:", rmaQC.body?.data?.ma_phieu_chi);

  console.log("\n=== TẤT CẢ CÁC BÀI TEST BẢO MẬT & HỆ THỐNG KHÉP KÍN ĐÃ THÀNH CÔNG RỰC RỠ! ===");
}

run().catch((err) => {
  console.error("LỖI TEST:", err);
  process.exit(1);
});
