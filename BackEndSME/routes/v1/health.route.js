// Phase 1 – Health Check Endpoint | 2026-04-02
// GET /api/v1/health — public, no auth required.
// Returns DB connectivity, process uptime, and memory usage.

import { Router } from "express";
import logger from "../../utils/logger.js";

const router = Router();

/**
 * GET /api/v1/health
 *
 * Response shape:
 * {
 *   success: true,
 *   status: "OK" | "DEGRADED",
 *   timestamp: ISO string,
 *   uptime: "123s",
 *   database: { status: "Connected" | "Disconnected", latencyMs: number },
 *   memory: { rss, heapUsed, heapTotal }  (all in MB)
 * }
 */
router.get("/", async (req, res) => {
  const mongoClient = req.app.locals.mongoClient;

  /* ── Check MongoDB ── */
  let dbStatus = "Disconnected";
  let latencyMs = null;

  try {
    if (mongoClient) {
      const t0 = Date.now();
      await mongoClient.db("admin").command({ ping: 1 });
      latencyMs = Date.now() - t0;
      dbStatus = "Connected";
    }
  } catch (err) {
    logger.error("Health check — DB ping failed", { error: err.message });
    dbStatus = "Disconnected";
  }

  /* ── Memory ── */
  const mem = process.memoryUsage();
  const toMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const isHealthy = dbStatus === "Connected";
  const httpStatus = isHealthy ? 200 : 503;

  res.status(httpStatus).json({
    success: isHealthy,
    status: isHealthy ? "OK" : "DEGRADED",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStatus,
      ...(latencyMs !== null ? { latencyMs } : {}),
    },
    memory: {
      rss:       toMB(mem.rss),
      heapUsed:  toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
    },
  });
});

export default router;
