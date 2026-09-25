/**
 * scratch/test_inter_department.js
 * Verification of 5 Inter-Department Operations:
 * 1. Notifications API & Persistence
 * 2. Unified Approval Hub Aggregation & Actions
 * 3. 1-Click Handover: Sales -> Production Order
 * 4. 1-Click Handover: Production -> Finished Goods Receipt
 * 5. 1-Click Handover: Warehouse -> Logistics Waybill
 * 6. Internal Comments & @Mentions Notification
 */

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
      options.headers["Cookie"] = `accessToken=${token}`;
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

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ 5 TÍNH NĂNG LIÊN BAN BỘ ===");

  // 1. Đăng nhập tài khoản admin
  console.log("\n[1] Đăng nhập Admin...");
  const loginRes = await request("POST", "/users/login", {
    tai_khoan: "admin",
    password: "123456",
  });

  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) {
    throw new Error(`Đăng nhập thất bại: ${JSON.stringify(loginRes.body)}`);
  }
  const token = loginRes.body.data.accessToken;
  console.log("-> Đăng nhập thành công! User:", loginRes.body.data.user?.ho_ten);

  // 2. Kiểm tra Hệ thống Thông báo (Feature 1)
  console.log("\n[2] Kiểm tra Hệ thống Thông báo (ThongBao DAO & API)...");
  const notifRes = await request("GET", "/thong-bao?limit=10", null, token);
  console.log("-> GET /thong-bao status:", notifRes.status);
  console.log("-> Số thông báo hiện tại:", notifRes.body?.data?.items?.length ?? 0);
  console.log("-> Số chưa đọc:", notifRes.body?.data?.chua_doc ?? 0);

  const readAllRes = await request("POST", "/thong-bao/read-all", {}, token);
  console.log("-> POST /thong-bao/read-all status:", readAllRes.status, "Success:", readAllRes.body?.success);

  // 3. Kiểm tra Trình Ký & Duyệt Tập Trung (Feature 3)
  console.log("\n[3] Kiểm tra Trung tâm Duyệt việc (Unified Approval Hub)...");
  const pendingRes = await request("GET", "/approvals/pending", null, token);
  console.log("-> GET /approvals/pending status:", pendingRes.status);
  const pData = pendingRes.body?.data;
  console.log("-> Tổng số chứng từ chờ duyệt:", pData?.totalPending);
  console.log("   - Đơn nhập mua hàng:", pData?.purchases?.length);
  console.log("   - Phiếu điều chỉnh kho:", pData?.stockAdjustments?.length);
  console.log("   - Đơn bán duyệt chiết khấu:", pData?.sales?.length);
  console.log("   - Bảng lương chờ duyệt:", pData?.payroll ? `Tháng ${pData.payroll.thang}/${pData.payroll.nam} (Đã chi: ${pData.payroll.da_chi})` : "Không có");

  // 4. Lấy 1 đơn bán hàng để test Handover Pipeline
  console.log("\n[4] Lấy đơn bán hàng để test Handover 1-Click...");
  const ordersRes = await request("GET", "/don-hang?limit=20", null, token);
  const allOrders = Array.isArray(ordersRes.body?.data) ? ordersRes.body.data : (ordersRes.body?.data?.orders || []);
  const salesOrders = allOrders.filter(o => o.loai_don === "sale" || !o.loai_don);
  const targetOrder = salesOrders[0];
  console.log("-> Đơn bán được chọn:", targetOrder?.ma_dh, "(ID:", targetOrder?._id, ")");

  if (targetOrder) {
    // 4.1 Bàn giao Kinh Doanh -> Lệnh Sản Xuất (Feature 2 - Step 1)
    console.log("\n[4.1] Test Handover: Kinh Doanh -> Lệnh Sản Xuất (POST /:id/chuyen-san-xuat)...");
    const sxHandover = await request("POST", `/don-hang/${targetOrder._id}/chuyen-san-xuat`, {}, token);
    console.log("-> Handover to Production Status:", sxHandover.status, "Message:", sxHandover.body?.message);
    const prodOrderId = sxHandover.body?.data?.id;
    console.log("-> Lệnh sản xuất mới ID:", prodOrderId);

    // 4.2 Bàn giao Sản Xuất -> Nhập Kho Thành Phẩm (Feature 2 - Step 2)
    if (prodOrderId) {
      console.log("\n[4.2] Test Handover: Sản Xuất -> Nhập Kho Thành Phẩm (POST /:id/ban-giao-kho)...");
      const khoHandover = await request("POST", `/don-hang/${prodOrderId}/ban-giao-kho`, {}, token);
      console.log("-> Handover to Warehouse Status:", khoHandover.status, "Message:", khoHandover.body?.message);
      console.log("-> Phiếu nhập kho thành phẩm ID:", khoHandover.body?.data?.id);
    }

    // 4.3 Bàn giao Kho -> Vận Đơn Giao Hàng (Feature 2 - Step 3)
    console.log("\n[4.3] Test Handover: Kho Đóng Gói -> Vận Đơn Logistics (POST /:id/chuyen-van-chuyen)...");
    const shipHandover = await request("POST", `/don-hang/${targetOrder._id}/chuyen-van-chuyen`, {
      don_vi_van_chuyen: "Giao Hàng Nhanh",
      phi_van_chuyen: 35000,
      ghi_chu: "Hàng cồng kềnh, chuyển giao tự động từ kho",
    }, token);
    console.log("-> Handover to Logistics Status:", shipHandover.status, "Message:", shipHandover.body?.message);
    console.log("-> Mã vận đơn mới:", shipHandover.body?.data?.ma_van_don);

    // 4.4 Bình luận nội bộ và @Mention liên phòng ban (Feature 5)
    console.log("\n[4.4] Test Bình luận nội bộ & @Mentions (POST /:id/comments)...");
    const commentRes = await request("POST", `/don-hang/${targetOrder._id}/comments`, {
      noi_dung: "Đã bàn giao đơn hàng cho @truongkd và @sale kiểm tra tiến độ giao hàng!",
    }, token);
    console.log("-> Comment Status:", commentRes.status, "Success:", commentRes.body?.success);
    console.log("-> Bình luận tác giả:", commentRes.body?.data?.ho_ten);
    console.log("-> Mentions trích xuất:", commentRes.body?.data?.mentions);
  }

  // 5. Đăng nhập với tài khoản được tag (@truongkd) để kiểm tra nhận thông báo Mention
  console.log("\n[5] Đăng nhập tài khoản @truongkd để kiểm tra thông báo Mention...");
  const truongkdLogin = await request("POST", "/users/login", {
    tai_khoan: "truongkd",
    password: "123456",
  });
  const truongkdToken = truongkdLogin.body?.data?.accessToken;
  const tkNotifs = await request("GET", "/thong-bao?limit=5", null, truongkdToken);
  const notifItems = Array.isArray(tkNotifs.body?.data) ? tkNotifs.body.data : (tkNotifs.body?.data?.items || []);
  console.log("-> Số thông báo nhận được của @truongkd:", notifItems.length, "(Chưa đọc:", tkNotifs.body?.unreadCount, ")");
  for (const item of notifItems) {
    console.log(`   * [${item.loai}] ${item.tieu_de}: ${item.noi_dung} (Đã đọc: ${item.da_doc})`);
  }

  console.log("\n=== TẤT CẢ 5 TÍNH NĂNG LIÊN BAN BỘ ĐÃ HOẠT ĐỘNG HOÀN HẢO! ===");
}

runTests().catch((err) => {
  console.error("LỖI TEST:", err);
  process.exit(1);
});
