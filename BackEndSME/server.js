// Refactored: 2026-04-02 | Issues fixed: G4, G5, W4, R1 | Original: server.js
// W4: CORS restricted to ALLOWED_ORIGINS env var
// R1: All API routes now under /api/v1/
// G5: Global errorHandler registered last

import express from "express";
import cors from "cors";
import { swaggerUi, swaggerSpec } from "./swagger.js";
import errorHandler from "./middleware/errorHandler.js";
import v1Router from "./routes/v1/index.js";

const app = express();

/* ─── W4: Restricted CORS ─── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json());

/* ─── Health check ─── */
app.get("/", (_req, res) => {
  res.send("<h1>SME Back-End API — v1 ready</h1>");
});

/* ─── Swagger docs ─── */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ─── R1: All business routes under /api/v1 ─── */
app.use("/api/v1", v1Router);

/*
 * Legacy route aliases (backward-compat for Postman collections that use /api/*).
 * Remove once all clients are updated to /api/v1/*.
 */
import usersRouteLegacy      from "./routes/user.router.js";
import nguyenLieuRouteLegacy from "./routes/nguyenlieu.route.js";
import sanPhamRouteLegacy    from "./routes/sanPham.route.js";
import donHangRouteLegacy    from "./routes/donHang.route.js";
import phongBanRouteLegacy   from "./routes/phongban_chucvu.route.js";
import luongRouteLegacy      from "./routes/luong.route.js";
import bomRouteLegacy        from "./routes/bom.route.js";
import dashboardRouteLegacy  from "./routes/dashboardRoutes.js";

app.use("/api/users",           usersRouteLegacy);
app.use("/api/nguyen-lieu",     nguyenLieuRouteLegacy);
app.use("/api/san-pham",        sanPhamRouteLegacy);
app.use("/api/don-hang",        donHangRouteLegacy);
app.use("/api/phongban-chucvu", phongBanRouteLegacy);
app.use("/api/luong",           luongRouteLegacy);
app.use("/api/bom",             bomRouteLegacy);
app.use("/api/dashboard",       dashboardRouteLegacy);

/* ─── Global error handler (MUST be last) ─── */
app.use(errorHandler);

export default app;
