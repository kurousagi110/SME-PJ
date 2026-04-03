// Refactored: 2026-04-02 | Issues fixed: M4, M5, W5 | Original: index.js
// Phase 4 update: replaced all console.* calls with winston logger
// M4: Standardized env vars → SME_DB_URI / SME_DB_NAME (matching actual .env)
// M5: SanXuatService.injectDB now called (was dead code before)
// W5: verifyToken.js (now auth.js) uses injectAuthDB with correct DB key

import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./server.js";
import mongodb from "mongodb";
import logger from "./utils/logger.js";
import { injectSocketDB, initSocket } from "./utils/socketManager.js";
import { injectAuditDB } from "./utils/auditLogger.js";
import { injectAuditLogControllerDB } from "./controllers/auditLogController.js";

import UsersDAO           from "./models/usersDAO.js";
import NguyenLieuDAO      from "./models/nguyenLieuDAO.js";
import SanPhamDAO         from "./models/sanPhamDAO.js";
import DonHangDAO         from "./models/donHangDAO.js";
import phongban_chucvuDAO from "./models/phongban_chucvuDAO.js";
import LuongDAO           from "./models/luongDAO.js";
import DashboardDAO       from "./models/dashbroadDAO.js";
import SanXuatService     from "./service/sanXuatService.js";
import DieuChinhKhoDAO    from "./models/dieuChinhKhoDAO.js";

import { injectAuthDB } from "./middleware/auth.js";
import { seedIfEmpty } from "./seed.js";

async function main() {
  // M4: use SME_DB_URI / SME_DB_NAME (matching .env)
  // Fallback to MOVIEREVIEWS_* keys for backward compatibility
  const uri    = process.env.MONGO_URI      || process.env.SME_DB_URI    || process.env.MOVIEREVIEWS_DB_URI;
  const dbName = process.env.SME_DB_NAME    || process.env.MOVIEREVIEWS_DB_NAME || process.env.DB_NAME;

  if (!uri)    { logger.error("Missing env: MONGO_URI or SME_DB_URI");  process.exit(1); }
  if (!dbName) { logger.error("Missing env: SME_DB_NAME");              process.exit(1); }

  const port     = Number(process.env.PORT)  || 8000;
  const hostName = process.env.HOST_NAME     || "http://localhost";

  const client = new mongodb.MongoClient(uri, {
    maxPoolSize:              Number(process.env.DB_POOL_MAX) || 10,
    minPoolSize:              Number(process.env.DB_POOL_MIN) || 2,
    maxIdleTimeMS:            Number(process.env.DB_IDLE_MS)  || 30_000,
    connectTimeoutMS:         10_000,
    serverSelectionTimeoutMS: 10_000,
  });
  const httpServer = http.createServer(app);
  let server;

  const shutdown = async (signal) => {
    logger.info(`Received ${signal} — initiating graceful shutdown`);
    try {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
        logger.info("HTTP server closed");
      }
      await client.close();
      logger.info("MongoDB connection closed");
      process.exit(0);
    } catch (e) {
      logger.error("Shutdown error", { error: e.message });
      process.exit(1);
    }
  };

  try {
    await client.connect();
    await client.db(dbName).command({ ping: 1 });
    logger.info(`MongoDB connected & ping ok`, { db: dbName });

    app.locals.mongoClient = client;

    // W5 fix: injectAuthDB imported from middleware/auth.js (standardized)
    injectAuthDB(client);
    injectSocketDB(client);
    injectAuditDB(client);
    injectAuditLogControllerDB(client);

    await Promise.all([
      UsersDAO.injectDB(client),
      NguyenLieuDAO.injectDB(client),
      SanPhamDAO.injectDB(client),
      DonHangDAO.injectDB(client),
      phongban_chucvuDAO.injectDB(client),
      LuongDAO.injectDB(client),
      DashboardDAO.injectDB(client),
      SanXuatService.injectDB(client), // M5 fix: was never called before (dead code)
      DieuChinhKhoDAO.injectDB(client),
    ]);

    logger.info("All DAOs initialised");

    try {
      await seedIfEmpty(client);
    } catch (seedErr) {
      logger.warn("Auto-seed warning (non-fatal)", { error: seedErr.message });
    }

    initSocket(httpServer);
    logger.info("Socket.io initialised");

    server = httpServer.listen(port, "0.0.0.0", () => {
      logger.info(`Server running`, { url: `${hostName}:${port}` });
      logger.info(`Swagger docs`, { url: `${hostName}:${port}/api-docs` });
      logger.info(`API v1 base`, { url: `${hostName}:${port}/api/v1` });
      logger.info(`Health check`, { url: `${hostName}:${port}/api/v1/health` });
    });

    process.on("SIGINT",  () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("unhandledRejection", (reason) => logger.error("unhandledRejection", { reason: String(reason) }));
    process.on("uncaughtException",  (err)    => logger.error("uncaughtException",  { error: err.message, stack: err.stack }));
  } catch (e) {
    logger.error("Startup failed", { error: e.message, stack: e.stack });
    try { await client.close(); } catch {}
    process.exit(1);
  }
}

main();
