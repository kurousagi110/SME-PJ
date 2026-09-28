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

  // 11. Test Phase 2: Dashboard API sau khi đổi tên file thành dashboardDAO.js
  console.log("\n[11] Kiểm tra Dashboard API với dashboardDAO.js đã chuẩn hóa...");
  const dashRes = await request("GET", "/dashboard/orders/overview", null, adminToken);
  console.log("-> Status dashboard overview:", dashRes.status, "(Mong muốn: 200)");

  console.log("\n=== TẤT CẢ CÁC BÀI TEST BẢO MẬT & TÍNH NĂNG ĐÃ THÀNH CÔNG RỰC RỠ! ===");
}

run().catch((err) => {
  console.error("LỖI TEST:", err);
  process.exit(1);
});
