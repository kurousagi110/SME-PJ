// Refactored: 2026-04-02 | Issues fixed: G4, G5, W4, R1 | Original: server.js
// Phase 3 update: added gzip compression + rate limiting
// Nginx update: trust proxy enabled so rate-limiter + JWT see real client IP
// Phase 4 update: helmet, mongo-sanitize, requestLogger
// W4: CORS restricted to ALLOWED_ORIGINS env var
// R1: All API routes now under /api/v1/
// G5: Global errorHandler registered last

import express from "express";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { swaggerUi, swaggerSpec } from "./swagger.js";
import errorHandler from "./middleware/errorHandler.js";
import requestLogger from "./middleware/requestLogger.js";
import logger from "./utils/logger.js";
import v1Router from "./routes/v1/index.js";

const app = express();

/* ─── Nginx reverse-proxy trust ───────────────────────────────────────────────
 * Tells Express to trust the X-Forwarded-For header set by Nginx.
 * Required so that:
 *   • express-rate-limit counts the real client IP (not Nginx's internal IP)
 *   • req.protocol returns the real scheme (http/https) for JWT/cookie logic
 * Value "1" means trust the first hop (our Nginx container) only.
 */
app.set("trust proxy", 1);

/* ─── Phase 4: Helmet (secure HTTP headers) ──────────────────────────────────
 * Sets Content-Security-Policy, X-DNS-Prefetch-Control, Expect-CT, etc.
 * Must come before any route to apply headers on every response.
 */
app.use(helmet());

/* ─── Phase 4: Request Logger ─── */
app.use(requestLogger);

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

/* ─── Phase 3: Compression (gzip) ─── */
app.use(compression());

/* ─── Phase 3: Global rate limiter ─── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
});

/* Stricter limiter for auth endpoints */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Quá nhiều lần đăng nhập, vui lòng thử lại sau." },
});

app.use("/api/v1/users/login",   authLimiter);
app.use("/api/v1/users/refresh", authLimiter);
app.use(globalLimiter);

app.use(express.json());

/* ── NoSQL operator sanitization ─────────────────────────────────────────────
 * Replace $ / . keys in req.body/query/params with "_" to block operator-injection
 * attacks (e.g. {"tai_khoan":{"$ne":null}} bypassing login). Must come AFTER
 * express.json() (so the parsed body is sanitized) and BEFORE all routes.
 */
app.use(mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    logger.warn("Stripped NoSQL operator", { key, path: req.path, method: req.method });
  },
}));

/* ─── Health check ─── */
app.get("/", (_req, res) => {
  res.send("<h1>SME Back-End API — v1 ready</h1>");
});

/* ─── Swagger docs ─── */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ─── R1: All business routes under /api/v1 ─── */
app.use("/api/v1", v1Router);

/* ─── Global error handler (MUST be last) ─── */
app.use(errorHandler);

export default app;
