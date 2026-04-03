import { Server } from "socket.io";
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
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

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
    const deptName = phong_ban?.ten || "";
    const posName  = chuc_vu?.ten   || "";

    if (deptName === "Phòng giám đốc" || posName === "Giám đốc") {
      socket.join("room:admin");
    }

    if (posName === "Thủ kho") {
      socket.join("room:approver");
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
 * Broadcast to all admin-level sockets (Phòng giám đốc / Giám đốc).
 */
export function notifyAdmin(payload) {
  getIO().to("room:admin").emit("notification", payload);
}

/**
 * Broadcast to all approver-level sockets (Thủ kho + admin).
 * Uses both rooms so admins also receive warehouse notifications.
 */
export function notifyApprover(payload) {
  const _io = getIO();
  _io.to("room:approver").to("room:admin").emit("notification", payload);
}

/**
 * Send a notification to a single user's personal room.
 * @param {string} tai_khoan  — unique username (login ID)
 */
export function notifyUser(tai_khoan, payload) {
  getIO().to(`user:${tai_khoan}`).emit("notification", payload);
}
