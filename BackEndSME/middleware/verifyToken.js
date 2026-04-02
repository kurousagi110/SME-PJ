import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import mongodb from "mongodb";

let usersCol;

// gọi 1 lần sau khi connect DB (vd trong server.js / index.js)
export function injectAuthDB(conn) {
  if (usersCol) return;
  usersCol = conn.db(process.env.DB_NAME).collection("users");
}

/**
 * verifyToken: decode JWT -> load user from DB -> attach req.user
 */
export default async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Thiếu Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded?.uid;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Token không hợp lệ (uid)" });
    }

    if (!usersCol) {
      return res.status(500).json({ message: "Auth DB chưa được inject (usersCol null)" });
    }

    const user = await usersCol.findOne(
      { _id: new ObjectId(userId), trang_thai: { $ne: 0 } },
      { projection: { mat_khau: 0, tokens: 0 } }
    );

    if (!user) return res.status(401).json({ message: "Không tìm thấy tài khoản" });

    // ✅ FULL USER để controller dùng phong_ban / chuc_vu
    req.user = user;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token đã hết hạn" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }
    console.error("verifyToken error:", err);
    return res.status(500).json({ message: "Lỗi xác thực token", error: err.message });
  }
}
