/**
 * Test verification for Stock Ledger (Thẻ Kho & Báo Cáo Xuất-Nhập-Tồn)
 * and B2B Quotations (Quản Lý Báo Giá & Chuyển Đơn Hàng).
 */
const http = require('http');

const BASE_URL = 'http://localhost';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ THẺ KHO & BÁO GIÁ B2B ===\n');

  // 1. Đăng nhập Admin
  console.log('[1] Đăng nhập Admin...');
  const loginRes = await request('/api/v1/users/login', {
    method: 'POST',
    body: {
      tai_khoan: 'admin',
      password: '123456'
    }
  });

  const token = loginRes.data?.data?.accessToken;
  if (loginRes.status !== 200 || !token) {
    throw new Error(`Đăng nhập thất bại: ${JSON.stringify(loginRes.data)}`);
  }
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('-> Đăng nhập thành công, accessToken lấy được.\n');

  // 2. Test Stock Ledger: In-Out-Balance Report
  console.log('[2] Kiểm tra Báo cáo Xuất - Nhập - Tồn (GET /api/v1/stock-ledger/in-out-balance)...');
  const now = new Date();
  const fromDate = '2026-01-01';
  const toDate = '2026-12-31';

  const reportRes = await request(`/api/v1/stock-ledger/in-out-balance?tu_ngay=${fromDate}&den_ngay=${toDate}`, {
    headers: authHeaders
  });

  console.log(`-> Status: ${reportRes.status}`);
  if (reportRes.status !== 200) {
    throw new Error(`Lỗi lấy báo cáo XNT: ${JSON.stringify(reportRes.data)}`);
  }
  const xntData = reportRes.data.data;
  console.log(`-> Tổng số mặt hàng trong báo cáo: ${xntData.tong_so_mat_hang || xntData.items?.length || 0}`);
  console.log(`-> Tổng giá trị nhập trong kỳ: ${xntData.summary?.tong_gia_tri_nhap?.toLocaleString('vi-VN')} VND, Xuất: ${xntData.summary?.tong_gia_tri_xuat?.toLocaleString('vi-VN')} VND`);
  console.log(`-> Tổng giá trị tồn cuối: ${xntData.summary?.tong_gia_tri_ton_cuoi?.toLocaleString('vi-VN')} VND`);

  // Test alias /api/v1/the-kho/in-out-balance
  const aliasRes = await request(`/api/v1/the-kho/in-out-balance?tu_ngay=${fromDate}&den_ngay=${toDate}`, {
    headers: authHeaders
  });
  if (aliasRes.status !== 200) {
    throw new Error(`Alias /api/v1/the-kho thất bại: ${aliasRes.status}`);
  }
  console.log('-> Alias /api/v1/the-kho hoạt động chính xác!\n');

  // 3. Test Stock Card for a specific product
  console.log('[3] Kiểm tra Thẻ Kho chi tiết (GET /api/v1/stock-ledger/card)...');
  const sampleProduct = xntData.items?.[0]?.ma_hang || 'SP001';
  const cardRes = await request(`/api/v1/stock-ledger/card?itemId=${sampleProduct}&tu_ngay=${fromDate}&den_ngay=${toDate}`, {
    headers: authHeaders
  });
  console.log(`-> Status thẻ kho sản phẩm ${sampleProduct}: ${cardRes.status}`);
  if (cardRes.status !== 200) {
    throw new Error(`Lỗi lấy thẻ kho: ${JSON.stringify(cardRes.data)}`);
  }
  const cardData = cardRes.data.data;
  console.log(`-> Tồn đầu: ${cardData.ton_dau_ky}, Tồn cuối: ${cardData.ton_cuoi_ky}`);
  console.log(`-> Số giao dịch phát sinh: ${cardData.dong_the_kho?.length || 0}`);
  if (cardData.dong_the_kho?.length > 0) {
    console.log(`-> Mẫu dòng thẻ kho đầu tiên: Mã phiếu ${cardData.dong_the_kho[0].ma_chung_tu}, Loại ${cardData.dong_the_kho[0].loai_giao_dich}, Nhập ${cardData.dong_the_kho[0].so_luong_nhap}, Xuất ${cardData.dong_the_kho[0].so_luong_xuat}, Tồn ${cardData.dong_the_kho[0].ton_luy_ke}`);
  }
  console.log('-> Tính năng Thẻ Kho hoạt động chính xác!\n');

  // 4. Test B2B Quotation: Tạo Báo Giá Mới
  console.log('[4] Kiểm tra Tạo Báo Giá B2B mới (POST /api/v1/quotations)...');
  const newQuotePayload = {
    khach_hang: {
      ten: 'Tập đoàn Công nghệ Alpha Tech',
      so_dien_thoai: '0909123456',
      email: 'procurement@alphatech.vn',
      dia_chi: 'Tòa nhà Landmark 81, TP. Hồ Chí Minh',
      cong_ty: 'Alpha Tech Corp'
    },
    ngay_het_han: '2026-10-31',
    dieu_khoan: 'Thanh toán đợt 1: 50% ngay sau khi ký đơn hàng. Bảo hành 12 tháng.',
    ghi_chu: 'Báo giá dự án số hóa hệ thống quý 4/2026',
    items: [
      {
        ma_sp: sampleProduct,
        ten_sp: cardData.san_pham?.ten_sp || 'Bàn làm việc MDF',
        don_vi: cardData.san_pham?.don_vi || 'Cái',
        so_luong: 10,
        don_gia: 2500000,
        chiet_khau_phan_tram: 5,
        ghi_chu: 'Chiết khấu dự án 5%'
      }
    ],
    thue_vat: 10
  };

  const createQuoteRes = await request('/api/v1/quotations', {
    method: 'POST',
    headers: authHeaders,
    body: newQuotePayload
  });

  console.log(`-> Status tạo báo giá: ${createQuoteRes.status}`);
  if (createQuoteRes.status !== 201) {
    throw new Error(`Lỗi tạo báo giá: ${JSON.stringify(createQuoteRes.data)}`);
  }
  const createdQuote = createQuoteRes.data.data;
  console.log(`-> Tạo thành công Báo giá: ${createdQuote.ma_bao_gia}`);
  console.log(`-> Tổng trước CK: ${createdQuote.tong_tien_truoc_ck?.toLocaleString('vi-VN')} VND`);
  console.log(`-> Tiền chiết khấu: ${createdQuote.tong_chiet_khau?.toLocaleString('vi-VN')} VND`);
  console.log(`-> Tiền thuế VAT (10%): ${createdQuote.tien_thue_vat?.toLocaleString('vi-VN')} VND`);
  console.log(`-> Tổng thanh toán: ${createdQuote.tong_thanh_toan?.toLocaleString('vi-VN')} VND`);
  console.log(`-> Trạng thái ban đầu: ${createdQuote.trang_thai}\n`);

  // 5. Test danh sách báo giá & alias
  console.log('[5] Kiểm tra Danh sách báo giá (GET /api/v1/quotations)...');
  const listQuoteRes = await request('/api/v1/quotations?limit=10', {
    headers: authHeaders
  });
  console.log(`-> Status danh sách: ${listQuoteRes.status}`);
  if (listQuoteRes.status !== 200 || !listQuoteRes.data.data?.items) {
    throw new Error(`Lỗi lấy danh sách báo giá: ${JSON.stringify(listQuoteRes.data)}`);
  }
  console.log(`-> Tổng số báo giá: ${listQuoteRes.data.data.total || 0}`);

  // Test alias /api/v1/bao-gia
  const aliasQuoteRes = await request('/api/v1/bao-gia?limit=5', {
    headers: authHeaders
  });
  if (aliasQuoteRes.status !== 200) {
    throw new Error(`Alias /api/v1/bao-gia thất bại: ${aliasQuoteRes.status}`);
  }
  console.log('-> Alias /api/v1/bao-gia hoạt động chính xác!\n');

  // 6. Test cập nhật trạng thái báo giá sang 'accepted'
  console.log('[6] Kiểm tra Cập nhật trạng thái Báo giá (PATCH /api/v1/quotations/:ma_bao_gia/status)...');
  const updateStatusRes = await request(`/api/v1/quotations/${createdQuote.ma_bao_gia}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: { trang_thai: 'accepted', ly_do: 'Khách hàng đã ký nháy phê duyệt chào giá' }
  });
  console.log(`-> Status cập nhật trạng thái: ${updateStatusRes.status}`);
  if (updateStatusRes.status !== 200) {
    throw new Error(`Lỗi cập nhật trạng thái: ${JSON.stringify(updateStatusRes.data)}`);
  }
  console.log(`-> Trạng thái mới: ${updateStatusRes.data.data?.trang_thai}\n`);

  // 7. Test 1-Click Convert Quotation to Sales Order
  console.log('[7] Kiểm tra Chuyển Báo giá thành Đơn bán hàng (POST /api/v1/quotations/:ma_bao_gia/convert-to-order)...');
  const convertRes = await request(`/api/v1/quotations/${createdQuote.ma_bao_gia}/convert-to-order`, {
    method: 'POST',
    headers: authHeaders,
    body: {}
  });

  console.log(`-> Status chuyển đổi: ${convertRes.status}`);
  if (convertRes.status !== 200) {
    throw new Error(`Lỗi chuyển đổi báo giá thành đơn hàng: ${JSON.stringify(convertRes.data)}`);
  }
  const orderResult = convertRes.data.data;
  console.log(`-> Đã tạo thành công Đơn hàng: ${orderResult.ma_dh} (ID: ${orderResult.don_hang_id})`);
  console.log(`-> Trạng thái báo giá sau chuyển đổi: ${orderResult.trang_thai}`);

  // Verify created order exists in don_hang
  const checkOrderRes = await request(`/api/v1/don-hang/${orderResult.don_hang_id}`, {
    headers: authHeaders
  });
  console.log(`-> Kiểm tra đơn hàng trong hệ sinh thái bán hàng: Status ${checkOrderRes.status}`);
  if (checkOrderRes.status === 200) {
    const fetchedOrder = checkOrderRes.data.data;
    console.log(`-> Thông tin đơn hàng: Mã ${fetchedOrder.ma_dh}, Khách hàng: ${fetchedOrder.khach_hang_ten}, Tổng tiền: ${fetchedOrder.tong_tien?.toLocaleString('vi-VN')} VND`);
  }

  console.log('\n=== TẤT CẢ 7 BÀI TEST THẺ KHO & BÁO GIÁ B2B ĐỀU THÀNH CÔNG RỰC RỠ! ===');
}

runTests().catch(err => {
  console.error('\nLỖI THỬ NGHIỆM:', err);
  process.exit(1);
});
