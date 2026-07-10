import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

let users;

const ACCESS_EXPIRES = "1h";
const REFRESH_EXPIRES = "7d";
const SALT_ROUNDS = 12;

export default class UsersDAO {
  static async injectDB(conn) {
    if (users) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("UsersDAO.injectDB: missing SME_DB_NAME env var");
    try {
      users = await conn.db(dbName).collection("users");
      await users.createIndex({ tai_khoan: 1 }, { unique: true });
      await users.createIndex({ ho_ten: "text" });
      await users.createIndex({ trang_thai: 1 });
    } catch (e) {
      logger.error("Unable to establish a collection handle in usersDAO", { error: e.message });
    }
  }



  /* =============== JWT helpers =============== */
  static _signAccessToken(uid, role = null) {
    // role: {ten, heSoluong} hoặc null
    return jwt.sign({ uid, role }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
  }
  static _signRefreshToken(uid, role = null) {
    return jwt.sign({ uid, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
  }
  static async _storeRefreshToken(userId, refreshToken) {
    const hashed = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    return users.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { tokens: { _id: new ObjectId(), hashed, createdAt: new Date() } }, $set: { updateAt: new Date() } }
    );
  }
  static async _hasRefreshToken(user, refreshToken) {
    for (const t of user?.tokens || []) {
      if (await bcrypt.compare(refreshToken, t.hashed)) return true;
    }
    return false;
  }

  static async getUserById(id) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("Invalid user id") };
      const user = await users.findOne(
        { _id: new ObjectId(id) },
        { projection: { mat_khau: 0, tokens: 0 } }
      );
      if (!user) return { error: new Error("User not found") };
      return user;
    } catch (e) {
      logger.error("getUserById error", { error: e.message });
      return { error: e };
    }
  }

  /* =============== User CRUD =============== */
  static async registerUser(ho_ten, ngay_sinh, tai_khoan, password, chuc_vu, phong_ban) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // chuẩn hóa: nếu truyền gì khác object thì thành null
    const role = chuc_vu && typeof chuc_vu === "object" ? {
      ten: chuc_vu.ten || "",
      mo_ta: chuc_vu.mo_ta || "",
      heSoluong: chuc_vu.heSoluong ?? null,
    } : null;

    const dept = phong_ban && typeof phong_ban === "object" ? {
      ten: phong_ban.ten || "",
      mo_ta: phong_ban.mo_ta || "",
    } : null;

    const doc = {
      ho_ten,
      ngay_sinh,
      tai_khoan,
      mat_khau: hashedPassword,
      trang_thai: 1,
      chuc_vu: role,       // <- object hoặc null
      phong_ban: dept,     // <- object hoặc null
      tokens: [],          // refresh tokens (hash)
      updateAt: new Date(),
      createAt: new Date(),
    };

    try {
      const check = await users.findOne({ tai_khoan: doc.tai_khoan });
      if (check && check.trang_thai !== 0) {
        const res = await users.updateOne(
          { _id: check._id },
          { $set: {
            ho_ten: doc.ho_ten,
            ngay_sinh: doc.ngay_sinh,
            mat_khau: doc.mat_khau,
            chuc_vu: doc.chuc_vu,
            phong_ban: doc.phong_ban,
            trang_thai: 1,
            updateAt: new Date(),
          } }
        );
        return { insertedId: res._id };
      }
      const res = await users.insertOne(doc);
      return { insertedId: res.insertedId };
    } catch (e) {
      if (e?.code === 11000) return { error: new Error("Tài khoản đã tồn tại") };
      logger.error("Unable to register user", { error: e.message });
      return { error: e };
    }
  }



  static async getMyUser(id, { includeSensitive = false } = {}) {
    try {
      const projection = includeSensitive ? {} : { mat_khau: 0, tokens: 0 };
      const user = await users.findOne({ _id: new ObjectId(id) }, { projection });
      if (!user) return { error: new Error("User not found") };
      return user;
    } catch (e) {
      logger.error("getMyUser error", { error: e.message });
      return { error: e };
    }
  }



  static async findUsers({
    q = "",
    page = 1,
    limit = 20,
    trang_thai,
    phong_ban,
    chuc_vu,
  } = {}) {
    const filter = {};

    // search theo tên / tài khoản
    if (q) {
      filter.$or = [
        { ho_ten: { $regex: q, $options: "i" } },
        { tai_khoan: { $regex: q, $options: "i" } },
      ];
    }

    // filter trạng thái
    if (typeof trang_thai === "number") {
      filter.trang_thai = trang_thai;
    }

    // filter theo phòng ban (tên)
    if (phong_ban && phong_ban.trim()) {
      filter["phong_ban.ten"] = { $regex: phong_ban.trim(), $options: "i" };
    }

    // filter theo chức vụ (tên)
    if (chuc_vu && chuc_vu.trim()) {
      filter["chuc_vu.ten"] = { $regex: chuc_vu.trim(), $options: "i" };
    }

    const skip = Math.max(0, (Number(page) - 1) * Number(limit));
    const projection = { mat_khau: 0, tokens: 0 };

    const [items, total] = await Promise.all([
      users
        .find(filter, { projection })
        .skip(skip)
        .limit(Number(limit))
        .toArray(),
      users.countDocuments(filter),
    ]);

    return {
      items,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  static async softDeleteUser(id) {
    try {
      return await users.updateOne({ _id: new ObjectId(id) }, { $set: { trang_thai: 0, updateAt: new Date() } });
    } catch (e) {
      logger.error("softDeleteUser error", { error: e.message }); return { error: e };
    }
  }
  static async restoreUser(id) {
    try {
      return await users.updateOne({ _id: new ObjectId(id) }, { $set: { trang_thai: 1, updateAt: new Date() } });
    } catch (e) {
      logger.error("restoreUser error", { error: e.message }); return { error: e };
    }
  }


  /* =============== Chức vụ / Phòng ban (object) =============== */
  // set/overwrite chức vụ
  static async setChucVu(id_user, { ten = "", mo_ta = "", heSoluong = null } = {}) {
    try {
      return await users.updateOne(
        { _id: new ObjectId(id_user) },
        { $set: { chuc_vu: { ten, mo_ta, heSoluong }, updateAt: new Date() } }
      );
    } catch (e) {
      logger.error("setChucVu error", { error: e.message }); return { error: e };
    }
  }


  // update một phần trường của chức vụ (không ghi đè toàn bộ)
  static async updateChucVu(id_user, payload = {}) {
    const allowed = ["ten", "mo_ta", "heSoluong"];
    const $set = {};
    for (const k of allowed) if (payload[k] !== undefined) $set[`chuc_vu.${k}`] = payload[k];
    if (!Object.keys($set).length) return { error: new Error("No valid fields") };
    $set.updateAt = new Date();
    try {
      return await users.updateOne({ _id: new ObjectId(id_user) }, { $set });
    } catch (e) {
      logger.error("updateChucVu error", { error: e.message }); return { error: e };
    }
  }


  static async clearChucVu(id_user) {
    try {
      return await users.updateOne(
        { _id: new ObjectId(id_user) },
        { $unset: { chuc_vu: "" }, $set: { updateAt: new Date() } }
      );
    } catch (e) {
      logger.error("clearChucVu error", { error: e.message }); return { error: e };
    }
  }


  static async setPhongBan(id_user, { ten = "", mo_ta = "" } = {}) {
    try {
      return await users.updateOne(
        { _id: new ObjectId(id_user) },
        { $set: { phong_ban: { ten, mo_ta }, updateAt: new Date() } }
      );
    } catch (e) {
      logger.error("setPhongBan error", { error: e.message }); return { error: e };
    }
  }


  static async updatePhongBan(id_user, payload = {}) {
    const allowed = ["ten", "mo_ta"];
    const $set = {};
    for (const k of allowed) if (payload[k] !== undefined) $set[`phong_ban.${k}`] = payload[k];
    if (!Object.keys($set).length) return { error: new Error("No valid fields") };
    $set.updateAt = new Date();
    try {
      return await users.updateOne({ _id: new ObjectId(id_user) }, { $set });
    } catch (e) {
      logger.error("updatePhongBan error", { error: e.message }); return { error: e };
    }
  }


  static async clearPhongBan(id_user) {
    try {
      return await users.updateOne(
        { _id: new ObjectId(id_user) },
        { $unset: { phong_ban: "" }, $set: { updateAt: new Date() } }
      );
    } catch (e) {
      logger.error("clearPhongBan error", { error: e.message }); return { error: e };
    }
  }



  /* =============== Auth flows =============== */
  static async loginUser(tai_khoan, password) {
    try {
      // Phase 5: unified error message chống user enumeration.
      // Cả "user không tồn tại", "user bị khoá", "sai password" → cùng 1 message.
      // Phân biệt chỉ log nội bộ để debug.
      const GENERIC_MSG = "Sai tài khoản hoặc mật khẩu";

      const user = await users.findOne({ tai_khoan, trang_thai: 1 });
      if (!user) {
        // vẫn chạy bcrypt.compare để tránh timing attack đoán user tồn tại
        await bcrypt.compare(password, "$2b$12$invalidhashtopreventtimingattacks00000000000000000");
        throw new Error(GENERIC_MSG);
      }

      const ok = await bcrypt.compare(password, user.mat_khau);
      if (!ok) throw new Error(GENERIC_MSG);

      // vì là object nên role đơn giản
      const role = user.chuc_vu
        ? { ten: user.chuc_vu.ten || "", heSoluong: user.chuc_vu.heSoluong ?? null }
        : null;

      const accessToken = this._signAccessToken(user._id.toString(), role);
      const refreshToken = this._signRefreshToken(user._id.toString(), role);
      await this._storeRefreshToken(user._id, refreshToken);

      return { userId: user._id, accessToken, refreshToken };
    } catch (e) {
      logger.error("Unable to login user", { error: e.message });
      return { error: e };
    }
  }



  // SECURITY: userId giờ được derive từ refreshToken payload (jwt.verify),
  // không nhận từ argument nữa → chặn forced-logout hoặc refresh spoof.
  static async resetToken(refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const userId = payload.uid;
      if (!userId || !ObjectId.isValid(userId)) throw new Error("Invalid refresh token payload");

      const user = await users.findOne({ _id: new ObjectId(userId), trang_thai: 1 });
      if (!user) throw new Error("User not found or inactive");

      const valid = await this._hasRefreshToken(user, refreshToken);
      if (!valid) throw new Error("Refresh token not recognized");

      const role = user.chuc_vu
        ? { ten: user.chuc_vu.ten || "", heSoluong: user.chuc_vu.heSoluong ?? null }
        : null;

      const newAccessToken = this._signAccessToken(userId, role);
      const newRefreshToken = this._signRefreshToken(userId, role);
      const hashedNewRefresh = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);

      // Phase 5: atomic token rotation — xoá token cũ + thêm token mới trong
      // CÙNG một updateOne. Nếu fail, không có trạng thái "đã xoá mà chưa thêm"
      // (race condition cũ có thể làm user mất hết token nếu lệnh 2 fail).
      await users.updateOne(
        { _id: new ObjectId(userId) },
        {
          $pull: { tokens: {} }, // xoá toàn bộ tokens cũ
          $push: {
            tokens: { _id: new ObjectId(), hashed: hashedNewRefresh, createdAt: new Date() },
          },
          $set: { updateAt: new Date() },
        }
      );

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      logger.error("Unable to reset token", { error: error.message });
      return { error };
    }
  }



  static async logoutUser(userId, refreshToken) {
    try {
      const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { tokens: 1 } });
      if (!user) throw new Error("User not found");
      for (const t of user.tokens || []) {
        if (await bcrypt.compare(refreshToken, t.hashed)) {
          await users.updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { tokens: { _id: t._id } }, $set: { updateAt: new Date() } }
          );
          return { ok: true };
        }
      }
      return { ok: false, message: "Token not found" };
    } catch (e) {
      logger.error("logoutUser error", { error: e.message });
      return { error: e };
    }
  }



  static async logoutAll(userId) {
    try {
      return await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { tokens: [], updateAt: new Date() } }
      );
    } catch (e) {
      logger.error("logoutAll error", { error: e.message }); return { error: e };
    }
  }



  static async updatePassword(userId, oldPassword, newPassword) {
    try {
      const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { mat_khau: 1 } });
      if (!user) throw new Error("User not found");

      const ok = await bcrypt.compare(oldPassword, user.mat_khau);
      if (!ok) throw new Error("Old password incorrect");

      const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
      return await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { mat_khau: hashed, updateAt: new Date() } }
      );
    } catch (e) {
      logger.error("updatePassword error", { error: e.message });
      return { error: e };
    }
  }



  static async updateProfile(userId, payload = {}) {
    const allowed = ["ho_ten", "ngay_sinh"];
    const $set = {};
    for (const k of allowed) if (payload[k] !== undefined) $set[k] = payload[k];
    if (!Object.keys($set).length) return { error: new Error("No valid fields") };
    $set.updateAt = new Date();
    try {
      return await users.updateOne({ _id: new ObjectId(userId) }, { $set });
    } catch (e) {
      logger.error("updateProfile error", { error: e.message }); return { error: e };
    }
  }

  // Lấy danh sách nhân viên (id + ma_nv + ho_ten + chuc_vu + phong_ban) theo filter
  static async getDanhSachNhanVien(filter = {}) {
  try {
    const list = await users
      .aggregate([
        {
          $match: {
            trang_thai: { $ne: 0 }, // 0 = đã xóa
            ...filter,
          },
        },
        {
          $project: {
            _id: 1,
            ma_nv: 1,
            ho_ten: 1,
            chuc_vu: "$chuc_vu.ten",
            phong_ban: "$phong_ban.ten",
          },
        },
        {
          $sort: { ho_ten: 1 },
        },
      ])
      .toArray();

    return list;
  } catch (e) {
    logger.error("getDanhSachNhanVien error", { error: e.message });
    return { error: e };
  }
}

}
