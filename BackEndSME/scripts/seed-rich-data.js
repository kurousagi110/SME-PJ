/**
 * seed-rich-data.js — Nạp dữ liệu mô phỏng doanh nghiệp SME chân thực
 * 
 * Mục tiêu:
 * 1. Bổ sung chuỗi đơn hàng thực tế năm 2025 & 2026 (Doanh số, sản xuất, nhập kho vật tư)
 *    theo từng tháng để biểu đồ YoY, KPI Cards và Demand Planning hiển thị sống động.
 * 2. Bổ sung phiếu thu chi sổ quỹ (Thu tiền khách, Chi mua vật tư, Chi trả lương, Chi vận hành)
 * 3. Bổ sung khách hàng, nhà cung cấp uy tín tại Việt Nam
 * 4. Bổ sung lịch sử chấm công & bảng lương nhân sự
 */

import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.SME_DB_URI || process.env.MONGO_URI || "mongodb://admin:password123@127.0.0.1:27017/SME_db_mongo?authSource=admin";
const dbName = process.env.SME_DB_NAME || "SME_db_mongo";

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function run() {
  console.log(`🚀 Connecting to MongoDB: ${dbName}...`);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const usersCol = db.collection("users");
  const spCol = db.collection("san_pham");
  const nlCol = db.collection("nguyen_lieu");
  const dhCol = db.collection("don_hang");
  const sqCol = db.collection("so_quy");
  const dtCol = db.collection("doi_tac");

  const users = await usersCol.find({}).toArray();
  const adminUser = users.find(u => u.tai_khoan === "admin") || users[0];
  const saleUser = users.find(u => u.tai_khoan === "sale") || users[0];

  const products = await spCol.find({}).toArray();
  const materials = await nlCol.find({}).toArray();

  console.log(`📦 Loaded ${users.length} users, ${products.length} products, ${materials.length} materials.`);

  // 1. Đối tác chuẩn
  console.log("🏢 Seeding Đối tác & Khách hàng thực tế...");
  const danhSachDoiTac = [
    { ma_doi_tac: "KH-VINHOMES", ten: "Tập đoàn Vinhomes - Ban Quản Lý Dự Án", loai_doi_tac: "khach_hang", so_dien_thoai: "02439749999", email: "procurement@vinhomes.vn", dia_chi: "Tòa nhà Symphony, Chu Huy Mân, Long Biên, Hà Nội", nhom: "khach_vip" },
    { ma_doi_tac: "KH-SUNGROUP", ten: "Tập đoàn Sun Group - Khối Nghỉ Dưỡng", loai_doi_tac: "khach_hang", so_dien_thoai: "02363891234", email: "purchasing@sungroup.com.vn", dia_chi: "Tầng 9, Sun City, 13 Hai Bà Trưng, Hoàn Kiếm, Hà Nội", nhom: "khach_vip" },
    { ma_doi_tac: "KH-ANGCUONG", ten: "Nội Thất An Cường Showroom Phân Phối", loai_doi_tac: "khach_hang", so_dien_thoai: "02838625727", email: "contact@ancuong.com", dia_chi: "702/1F Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM", nhom: "dai_ly" },
    { ma_doi_tac: "KH-HOAPHAT", ten: "Nội Thất Hòa Phát Miền Nam", loai_doi_tac: "khach_hang", so_dien_thoai: "02835111222", email: "banhang@hoaphat.com.vn", dia_chi: "392 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM", nhom: "dai_ly" },
    { ma_doi_tac: "KH-XUANHOA", ten: "Công ty Cổ phần Xuân Hòa Việt Nam", loai_doi_tac: "khach_hang", so_dien_thoai: "02438866115", email: "sales@xuanhoa.vn", dia_chi: "Phường Xuân Hòa, Phúc Yên, Vĩnh Phúc", nhom: "dai_ly" },
    { ma_doi_tac: "NCC-ANCLAMINATE", ten: "Công ty Cổ phần Gỗ An Cường", loai_doi_tac: "nha_cung_cap", so_dien_thoai: "02743626262", email: "supplies@ancuong.com", dia_chi: "KCN Đất Cuốc, Bắc Tân Uyên, Bình Dương", nhom: "nha_cung_cap" },
    { ma_doi_tac: "NCC-DONGNAI", ten: "Tổng Công ty Gỗ Đồng Nai (Donagowood)", loai_doi_tac: "nha_cung_cap", so_dien_thoai: "02513836156", email: "info@donagowood.vn", dia_chi: "KCN Biên Hòa 1, Đồng Nai", nhom: "nha_cung_cap" },
    { ma_doi_tac: "NCC-HAFELE", ten: "Công ty TNHH Hafele Việt Nam", loai_doi_tac: "nha_cung_cap", so_dien_thoai: "02839113113", email: "info@hafele.com.vn", dia_chi: "Tòa nhà REE Tower, 9 Đoàn Văn Bơ, Quận 4, TP.HCM", nhom: "nha_cung_cap" },
    { ma_doi_tac: "NCC-NIPPON", ten: "Công ty Sơn Nippon Paint Việt Nam", loai_doi_tac: "nha_cung_cap", so_dien_thoai: "02513836579", email: "support@nipponpaint.com.vn", dia_chi: "KCN Biên Hòa 2, Đồng Nai", nhom: "nha_cung_cap" }
  ];

  for (const dt of danhSachDoiTac) {
    await dtCol.updateOne(
      { ma_doi_tac: dt.ma_doi_tac },
      { $set: { ...dt, trang_thai: "active", createAt: new Date(), updateAt: new Date() } },
      { upsert: true }
    );
  }

  // 2. Tạo chuỗi đơn hàng thực tế xuyên suốt 2025 và 2026 (21 tháng)
  console.log("📈 Seeding Đơn hàng lịch sử 2025 - 2026 (Doanh thu & Chi phí)...");

  const orderBatch = [];
  const cashbookBatch = [];

  const khachHangs = [
    "Tập đoàn Vinhomes - Ban Quản Lý Dự Án",
    "Tập đoàn Sun Group - Khối Nghỉ Dưỡng",
    "Nội Thất An Cường Showroom Phân Phối",
    "Nội Thất Hòa Phát Miền Nam",
    "Công ty Cổ phần Xuân Hòa Việt Nam",
    "Chị Trần Thu Trang (Căn hộ Masteri Thảo Điền)",
    "Anh Hoàng Nam (Biệt thự Vinhomes Riverside)",
    "Kiến Trúc & Xây Dựng A+ Decor"
  ];

  const nhaCungCaps = [
    "Công ty Cổ phần Gỗ An Cường",
    "Tổng Công ty Gỗ Đồng Nai (Donagowood)",
    "Công ty TNHH Hafele Việt Nam",
    "Công ty Sơn Nippon Paint Việt Nam"
  ];

  // Tạo dữ liệu cho từng tháng từ 01/2025 đến 09/2026
  const monthsList = [];
  for (let m = 1; m <= 12; m++) monthsList.push({ year: 2025, month: m });
  for (let m = 1; m <= 9; m++) monthsList.push({ year: 2026, month: m });

  for (const ym of monthsList) {
    const { year, month } = ym;
    // Mỗi tháng: 4 - 8 đơn bán (Sale), 2 - 4 đơn nhập NVL (Purchase), 2 - 5 đơn sản xuất (Prod)
    const numSales = rand(4, 8);
    const numPurchases = rand(2, 4);
    const numProds = rand(2, 5);

    // 2.1 Đơn bán hàng
    for (let i = 0; i < numSales; i++) {
      const day = rand(2, 27);
      const orderDate = new Date(Date.UTC(year, month - 1, day, rand(8, 17), rand(0, 59)));
      const kh = randItem(khachHangs);

      // Chọn 1-3 sản phẩm
      const pickedProds = [randItem(products), randItem(products)].filter((v, idx, a) => a.indexOf(v) === idx);
      const items = pickedProds.map(sp => {
        const qty = rand(2, 8);
        return {
          loai_hang: "san_pham",
          san_pham_id: sp._id,
          ma_sp: sp.ma_sp,
          ten_sp: sp.ten_sp,
          don_vi: "cái",
          don_gia: sp.don_gia,
          so_luong: qty,
          thanh_tien: sp.don_gia * qty
        };
      });

      const tongTien = items.reduce((sum, item) => sum + item.thanh_tien, 0);
      const maDh = `DH-${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      orderBatch.push({
        ma_dh: maDh,
        loai_don: "sale",
        trang_thai: "completed",
        khach_hang_ten: kh,
        nguoi_lap_id: saleUser._id,
        ngay_dat: orderDate,
        created_at: orderDate,
        updated_at: orderDate,
        san_pham: items,
        tong_tien: tongTien,
        phi_vc: 0,
        giam_gia: 0,
        thue_tien: 0,
        tam_tinh: tongTien,
        ghi_chu: `Đơn bán hàng theo hợp đồng ${maDh}`
      });

      // Tạo phiếu thu tiền vào sổ quỹ
      cashbookBatch.push({
        ma_phieu: `PT-${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        loai_phieu: "thu",
        hang_muc: "Thu tiền bán hàng",
        so_tien: tongTien,
        phuong_thuc: randItem(["chuyen_khoan", "chuyen_khoan", "tien_mat"]),
        doi_tuong: { ten: kh, loai: "khach_hang" },
        ma_chung_tu: maDh,
        ngay_ghi_nhan: orderDate,
        created_at: orderDate,
        updated_at: orderDate,
        trang_thai: "active",
        ghi_chu: `Thanh toán cho đơn bán ${maDh}`
      });
    }

    // 2.2 Đơn nhập mua vật tư (Purchase Receipt)
    for (let i = 0; i < numPurchases; i++) {
      const day = rand(1, 20);
      const orderDate = new Date(Date.UTC(year, month - 1, day, rand(8, 16), rand(0, 59)));
      const ncc = randItem(nhaCungCaps);

      const pickedMats = [randItem(materials), randItem(materials)].filter((v, idx, a) => a.indexOf(v) === idx);
      const items = pickedMats.map(nl => {
        const qty = rand(20, 100);
        return {
          loai_hang: "nguyen_lieu",
          nguyen_lieu_id: nl._id,
          ma_nl: nl.ma_nl,
          ten_nl: nl.ten_nl,
          don_vi: nl.don_vi,
          don_gia: nl.gia_nhap,
          so_luong: qty,
          thanh_tien: nl.gia_nhap * qty
        };
      });

      const tongTien = items.reduce((sum, item) => sum + item.thanh_tien, 0);
      const maPn = `PN-${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      orderBatch.push({
        ma_dh: maPn,
        loai_don: "purchase_receipt",
        trang_thai: "completed",
        nha_cung_cap_ten: ncc,
        nguoi_lap_id: adminUser._id,
        ngay_dat: orderDate,
        created_at: orderDate,
        updated_at: orderDate,
        san_pham: items,
        tong_tien: tongTien,
        phi_vc: 200000,
        giam_gia: 0,
        thue_tien: 0,
        tam_tinh: tongTien,
        ghi_chu: `Nhập vật tư theo đơn mua ${maPn}`
      });

      // Tạo phiếu chi trả tiền vật tư
      cashbookBatch.push({
        ma_phieu: `PC-${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        loai_phieu: "chi",
        hang_muc: "Chi mua nguyên vật liệu",
        so_tien: tongTien,
        phuong_thuc: "chuyen_khoan",
        doi_tuong: { ten: ncc, loai: "nha_cung_cap" },
        ma_chung_tu: maPn,
        ngay_ghi_nhan: orderDate,
        created_at: orderDate,
        updated_at: orderDate,
        trang_thai: "active",
        ghi_chu: `Thanh toán đơn nhập hàng ${maPn}`
      });
    }

    // 2.3 Đơn nhập sản xuất (Prod Receipt)
    for (let i = 0; i < numProds; i++) {
      const day = rand(5, 28);
      const orderDate = new Date(Date.UTC(year, month - 1, day, rand(9, 17), rand(0, 59)));
      const sp = randItem(products);
      const qty = rand(5, 20);
      const maSx = `LSX-${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      orderBatch.push({
        ma_dh: maSx,
        loai_don: "prod_receipt",
        trang_thai: "completed",
        nguoi_lap_id: adminUser._id,
        ngay_dat: orderDate,
        created_at: orderDate,
        updated_at: orderDate,
        san_pham: [{
          loai_hang: "san_pham",
          san_pham_id: sp._id,
          ma_sp: sp.ma_sp,
          ten_sp: sp.ten_sp,
          don_vi: "cái",
          don_gia: sp.don_gia,
          so_luong: qty,
          thanh_tien: sp.don_gia * qty
        }],
        tong_tien: sp.don_gia * qty,
        tam_tinh: sp.don_gia * qty,
        ghi_chu: `Nhập kho thành phẩm theo lệnh sản xuất xưởng ${maSx}`
      });
    }
  }

  // Chèn đơn hàng & sổ quỹ
  if (orderBatch.length > 0) {
    const resOrders = await dhCol.insertMany(orderBatch);
    console.log(`✅ Đã chèn ${resOrders.insertedCount} đơn hàng mới (Sales, Purchases, Production) xuyên suốt 2025 - 2026!`);
  }

  if (cashbookBatch.length > 0) {
    const resCash = await sqCol.insertMany(cashbookBatch);
    console.log(`✅ Đã chèn ${resCash.insertedCount} phiếu Thu - Chi sổ quỹ tương ứng.`);
  }

  // 3. Cập nhật tồn kho tối thiểu cho sản phẩm & vật tư để phục vụ màn hình Cảnh báo
  console.log("⚙️  Cập nhật định mức an toàn tồn kho (ton_toi_thieu)...");
  await spCol.updateMany({ ton_toi_thieu: { $exists: false } }, { $set: { ton_toi_thieu: 10 } });
  // Set vài sản phẩm tồn thấp để test cảnh báo
  await spCol.updateOne({ ma_sp: "SP001" }, { $set: { so_luong: 3, ton_toi_thieu: 15 } });
  await spCol.updateOne({ ma_sp: "SP002" }, { $set: { so_luong: 2, ton_toi_thieu: 10 } });
  await nlCol.updateOne({ ma_nl: "NL001" }, { $set: { so_luong: 8, ton_toi_thieu: 30 } });
  await nlCol.updateOne({ ma_nl: "NL004" }, { $set: { so_luong: 4, ton_toi_thieu: 20 } });

  console.log("🎉 Hoàn tất nạp dữ liệu mẫu sinh động & đạt chuẩn chất lượng!");
  await client.close();
}

run().catch(err => {
  console.error("❌ Lỗi khi seed dữ liệu:", err);
  process.exit(1);
});
