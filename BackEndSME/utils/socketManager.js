import { Server } from "socket.io";
import logger from "./logger.js";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

let io = null;
let usersCol = null;

/**
 * Called once after MongoDB connects (parallel to injectAuthDB).
 * Stores the users collection for socket auth middleware.
 */
export function injectSocketDB(conn) {
  if (usersCol) return;
  const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
  usersCol = conn.db(dbName).collection("users");
}

/**
 * initSocket — attach Socket.io to the http.Server created in index.js.
 * Must be called after injectSocketDB.
 */
export function initSocket(httpServer) {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173"
  )
    .split(",")
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  /* ── Authentication middleware ── */
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const tokenFromCookie = cookieHeader
        .split("; ")
        .find((row) => row.startsWith("access_token="))
        ?.split("=")[1];

      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1] ||
        tokenFromCookie;

      if (!token) return next(new Error("MISSING_TOKEN"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded?.uid;
      if (!userId || !ObjectId.isValid(userId)) return next(new Error("INVALID_TOKEN"));

      if (!usersCol) return next(new Error("AUTH_DB_NOT_READY"));

      const user = await usersCol.findOne(
        { _id: new ObjectId(userId), trang_thai: { $ne: 0 } },
        { projection: { mat_khau: 0, tokens: 0 } }
      );

      if (!user) return next(new Error("USER_NOT_FOUND"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("TOKEN_INVALID"));
    }
  });

  /* ── Room assignment on connect ── */
  io.on("connection", (socket) => {
    const { tai_khoan, phong_ban, chuc_vu } = socket.user || {};

    // Personal room
    if (tai_khoan) socket.join(`user:${tai_khoan}`);

    // Role rooms
    const deptName = (phong_ban?.ten || "").toLowerCase();
    const posName  = (chuc_vu?.ten   || "").toLowerCase();

    logger.info(`[Socket] User connected: tai_khoan=${tai_khoan} | phong_ban="${deptName}" | chuc_vu="${posName}"`);

    // Tất cả user đăng nhập đều join room chung
    socket.join("room:all_users");

    if (deptName.includes("giám đốc") || posName.includes("giám đốc")) {
      socket.join("room:admin");
      logger.info(`[Socket] ${tai_khoan} joined room:admin`);
    }

    if (posName.includes("thủ kho")) {
      socket.join("room:approver");
      logger.info(`[Socket] ${tai_khoan} joined room:approver`);
    }

    socket.on("disconnect", () => {});
  });

  return io;
}

/** Return the initialised io instance (throws if not yet initialised). */
export function getIO() {
  if (!io) throw new Error("Socket.io chưa được khởi tạo");
  return io;
}

/**
 * Normalizes notification payload so frontend receives all required fields:
 * id, type, message, createdAt, and metadata.
 */
export function normalizeNotificationPayload(payload = {}) {
  const createdAt = payload.createdAt || new Date().toISOString();
  const id = String(payload.id || payload._id || new ObjectId().toString());
  const type = payload.type || "SYSTEM_NOTIFICATION";
  let message = payload.message;

  if (!message) {
    const user =
      payload.created_by?.ho_ten ||
      payload.created_by?.tai_khoan ||
      payload.updated_by?.ho_ten ||
      payload.updated_by?.tai_khoan ||
      payload.deleted_by?.ho_ten ||
      payload.deleted_by?.tai_khoan ||
      "Người dùng";
    const ma = payload.ma_dh || payload.ten_hang || (payload.id ? String(payload.id).slice(-6) : "");

    switch (type) {
      case "SALE_CREATED":
        message = `Đơn bán hàng ${ma} vừa được tạo bởi ${user}`;
        break;
      case "SALE_COMPLETED":
        message = `Đơn bán hàng POS ${ma} đã hoàn tất thanh toán`;
        break;
      case "SALE_STATUS_UPDATED":
        message = `Đơn bán hàng ${ma} cập nhật trạng thái sang "${payload.trang_thai || ""}" bởi ${user}`;
        break;
      case "SALE_DELETED":
        message = `Đơn bán hàng ${ma} đã bị xóa bởi ${user}`;
        break;
      case "PURCHASE_RECEIPT_CREATED":
        message = `Đơn nhập mua ${ma} vừa được tạo bởi ${user}`;
        break;
      case "PURCHASE_RECEIPT_STATUS_UPDATED":
        message = `Đơn nhập mua ${ma} cập nhật trạng thái sang "${payload.trang_thai || ""}" bởi ${user}`;
        break;
      case "PURCHASE_RECEIPT_DELETED":
        message = `Đơn nhập mua ${ma} đã bị xóa bởi ${user}`;
        break;
      case "PROD_RECEIPT_CREATED":
        message = `Phiếu nhập thành phẩm ${ma} vừa được tạo bởi ${user}`;
        break;
      case "PROD_RECEIPT_STATUS_UPDATED":
        message = `Phiếu nhập thành phẩm ${ma} cập nhật trạng thái sang "${payload.trang_thai || ""}" bởi ${user}`;
        break;
      case "PROD_RECEIPT_DELETED":
        message = `Phiếu nhập thành phẩm ${ma} đã bị xóa bởi ${user}`;
        break;
      case "SX_CREATED":
        message = `Lệnh sản xuất mới: ${payload.so_luong_sx ? payload.so_luong_sx + " sản phẩm" : "thành phẩm"}`;
        break;
      case "DCK_CREATED":
        message = `Phiếu điều chỉnh kho mới: ${payload.ten_hang || ""} (${payload.loai || ""})`;
        break;
      case "DCK_APPROVED":
        message = `Phiếu điều chỉnh kho ${payload.ten_hang || ""} đã được duyệt bởi ${user}`;
        break;
      case "DCK_REJECTED":
        message = `Phiếu điều chỉnh kho ${payload.ten_hang || ""} đã bị từ chối bởi ${user}`;
        break;
      case "DON_HANG_HARD_DELETED":
        message = `Đơn hàng ${ma} đã bị xóa vĩnh viễn bởi ${user}`;
        break;
      default:
        message = `Hoạt động mới trên hệ thống (${type})`;
        break;
    }
  }

  return {
    ...payload,
    id,
    type,
    message,
    createdAt,
  };
}

/**
 * Broadcast to all admin-level sockets (Phòng giám đốc / Giám đốc).
 */
export function notifyAdmin(payload) {
  const norm = normalizeNotificationPayload(payload);
  getIO().to("room:admin").emit("notification", norm);
}

/**
 * Broadcast to all approver-level sockets (Thủ kho + admin).
 * Uses both rooms so admins also receive warehouse notifications.
 */
export function notifyApprover(payload) {
  const norm = normalizeNotificationPayload(payload);
  getIO().to("room:approver").emit("notification", norm);
}

/**
 * Send a notification to a single user's personal room.
 * @param {string} tai_khoan  — unique username (login ID)
 */
export function notifyUser(tai_khoan, payload) {
  const norm = normalizeNotificationPayload(payload);
  getIO().to(`user:${tai_khoan}`).emit("notification", norm);
}

