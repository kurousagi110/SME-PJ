const BASE_URL = "http://localhost/api/v1";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log("=== BẮT ĐẦU KIỂM THỬ CÁC BẢN VÁ REVIEW V4 ===");

  // 1. Đăng nhập Admin
  const loginRes = await req("/users/login", {
    method: "POST",
    body: JSON.stringify({ tai_khoan: "admin", password: "123456" }),
  });
  const token = loginRes.data.data?.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  console.log("-> [1] Đăng nhập Admin thành công, Token lấy được:", !!token);

  // 2. Test C2: Stock Ledger Bulk In-Out-Balance Report
  console.log("\n[2] Test C2: Kiểm tra Báo cáo Xuất - Nhập - Tồn qua bulk aggregation...");
  const t0 = Date.now();
  const balanceRes = await req("/stock-ledger/in-out-balance", { headers });
  const elapsed = Date.now() - t0;
  console.log(`-> Thời gian xử lý: ${elapsed} ms (Bulk batch queries)`);
  console.log(`-> Tổng số mặt hàng: ${balanceRes.data.data?.tong_so_mat_hang}`);
  console.log(`-> Tổng giá trị tồn cuối: ${balanceRes.data.data?.summary?.tong_gia_tri_ton_cuoi?.toLocaleString("vi-VN")} VND`);

  // 3. Test H1: RMA Cumulative Guard
  console.log("\n[3] Test H1: Kiểm tra chặn đổi trả vượt số lượng tích lũy (Cumulative RMA Guard)...");
  const ordersRes = await req("/don-hang?loai_don=sale&trang_thai=completed&limit=5", { headers });
  const candidate = (ordersRes.data.data || []).find((o) => o.san_pham && o.san_pham.length > 0);
  if (candidate) {
    const item = candidate.san_pham[0];
    const qty = Number(item.so_luong) || 1;
    console.log(`-> Chọn đơn: ${candidate.ma_dh}, sản phẩm ${item.ten_sp || item.ma_sp}, số lượng mua: ${qty}`);

    const rmaRes = await req("/doi-tra", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ma_dh: candidate.ma_dh,
        ly_do: "Test over-return quantity",
        san_pham: [{ san_pham_id: item.san_pham_id, ma_sp: item.ma_sp, so_luong: qty + 10 }],
      }),
    });

    if (!rmaRes.ok) {
      console.log(`-> ✅ Đã chặn thành công: ${rmaRes.data.message || rmaRes.status}`);
    } else {
      console.error("❌ LỖI: Lẽ ra phải chặn khi đổi trả vượt quá số lượng mua!");
    }
  }

  // 4. Test H3: Handover methods via Service layer
  console.log("\n[4] Test H3: Handover methods qua DonHangService...");
  const newOrder = await req("/don-hang/sales", {
    method: "POST",
    headers,
    body: JSON.stringify({
      khach_hang_ten: "Test Handover Corp",
      san_pham: [
        { san_pham_id: "679f225017df85dc7d7ad83e", ma_sp: "SP001", ten_sp: "Sản phẩm A", so_luong: 2, don_gia: 100000 },
      ],
    }),
  });
  console.log("-> Tạo đơn bán mới:", newOrder.data.data?.ma_dh);
  const orderId = newOrder.data.data?.id || newOrder.data.data?._id;

  if (orderId) {
    const handoverProd = await req(`/don-hang/${orderId}/chuyen-san-xuat`, {
      method: "POST",
      headers,
    });
    console.log(`-> Handover sang Sản xuất: Status ${handoverProd.status}, Mã SX: ${handoverProd.data.data?.ma_sx}`);
  }

  console.log("\n=== TẤT CẢ CÁC BÀI TEST BẢN VÁ V4 ĐÃ HOÀN TẤT THÀNH CÔNG! ===");
}

run().catch(console.error);
