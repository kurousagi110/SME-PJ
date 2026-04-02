// Refactored: 2026-04-02 | Issues fixed: M4, M5, W5 | Original: index.js
// M4: Standardized env vars → SME_DB_URI / SME_DB_NAME (matching actual .env)
// M5: SanXuatService.injectDB now called (was dead code before)
// W5: verifyToken.js (now auth.js) uses injectAuthDB with correct DB key

import dotenv from "dotenv";
dotenv.config();

import app from "./server.js";
import mongodb from "mongodb";

import UsersDAO           from "./models/usersDAO.js";
import NguyenLieuDAO      from "./models/nguyenLieuDAO.js";
import SanPhamDAO         from "./models/sanPhamDAO.js";
import DonHangDAO         from "./models/donHangDAO.js";
import phongban_chucvuDAO from "./models/phongban_chucvuDAO.js";
import LuongDAO           from "./models/luongDAO.js";
import DashboardDAO       from "./models/dashbroadDAO.js";
import SanXuatService     from "./service/sanXuatService.js";

import { injectAuthDB } from "./middleware/auth.js";

async function main() {
  // M4: use SME_DB_URI / SME_DB_NAME (matching .env)
  // Fallback to MOVIEREVIEWS_* keys for backward compatibility
  const uri    = process.env.SME_DB_URI    || process.env.MOVIEREVIEWS_DB_URI;
  const dbName = process.env.SME_DB_NAME   || process.env.MOVIEREVIEWS_DB_NAME || process.env.DB_NAME;

  if (!uri)    { console.error("❌ Missing env SME_DB_URI");    process.exit(1); }
  if (!dbName) { console.error("❌ Missing env SME_DB_NAME");   process.exit(1); }

  const port     = Number(process.env.PORT)      || 8000;
  const hostName = process.env.HOST_NAME         || "http://localhost";

  const client = new mongodb.MongoClient(uri);
  let server;

  const shutdown = async (signal) => {
    try {
      console.log(`\n🟡 Received ${signal}. Shutting down...`);
      if (server) {
        await new Promise((resolve) => server.close(resolve));
        console.log("✅ HTTP server closed");
      }
      await client.close();
      console.log("✅ MongoDB connection closed");
      process.exit(0);
    } catch (e) {
      console.error("❌ Shutdown error:", e);
      process.exit(1);
    }
  };

  try {
    await client.connect();
    await client.db(dbName).command({ ping: 1 });
    console.log(`✅ MongoDB connected & ping ok (db=${dbName})`);

    app.locals.mongoClient = client;

    // W5 fix: injectAuthDB now imported from middleware/auth.js (standardized)
    injectAuthDB(client);

    await Promise.all([
      UsersDAO.injectDB(client),
      NguyenLieuDAO.injectDB(client),
      SanPhamDAO.injectDB(client),
      DonHangDAO.injectDB(client),
      phongban_chucvuDAO.injectDB(client),
      LuongDAO.injectDB(client),
      DashboardDAO.injectDB(client),
      SanXuatService.injectDB(client), // M5 fix: was never called before (dead code)
    ]);

    server = app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running on ${hostName}:${port}`);
      console.log(`📖 Swagger docs: ${hostName}:${port}/api-docs`);
      console.log(`🔗 API v1 base:  ${hostName}:${port}/api/v1`);
    });

    process.on("SIGINT",  () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("unhandledRejection", (reason) => console.error("unhandledRejection:", reason));
    process.on("uncaughtException",  (err)    => console.error("uncaughtException:",  err));
  } catch (e) {
    console.error("❌ Startup error:", e);
    try { await client.close(); } catch {}
    process.exit(1);
  }
}

main();
