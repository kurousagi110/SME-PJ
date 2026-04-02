import jwt from "jsonwebtoken";

/**
 * Middleware xác thực Access Token.
 * - Kiểm tra header Authorization (Bearer <token>)
 * - Giải mã và gắn thông tin user vào req.user
 * - Nếu token hết hạn hoặc sai, trả về 401
 */
export default function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Thiếu Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    // Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Gắn thông tin user vào req để controller có thể dùng
    req.user = {
      id: decoded.uid,
      role: decoded.role || null,
    };

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
