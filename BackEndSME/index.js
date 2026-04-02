import dotenv from "dotenv";
dotenv.config(); // ✅ load env sớm

import app from "./server.js";
import mongodb from "mongodb";

import UsersDAO from "./models/usersDAO.js";
import NguyenLieuDAO from "./models/nguyenLieuDAO.js";
import SanPhamDAO from "./models/sanPhamDAO.js";
import DonHangDAO from "./models/donHangDAO.js";
import phongban_chucvuDAO from "./models/phongban_chucvuDAO.js";
import LuongDAO from "./models/luongDAO.js";
import DashboardDAO from "./models/dashbroadDAO.js";

import { injectAuthDB } from "./middleware/verifyToken.js";

async function main() {
  // ✅ dùng đúng key env bạn đang có
  const uri = process.env.MOVIEREVIEWS_DB_URI;
  const dbName = process.env.MOVIEREVIEWS_DB_NAME;

  if (!uri) {
    console.error("❌ Missing env MOVIEREVIEWS_DB_URI");
    process.exit(1);
  }
  if (!dbName) {
    console.error("❌ Missing env MOVIEREVIEWS_DB_NAME");
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 8000;
  const hostName = process.env.HOST_NAME || "http://localhost";

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

    // ✅ ping đúng DB theo MOVIEREVIEWS_DB_NAME
    await client.db(dbName).command({ ping: 1 });
    console.log(`✅ MongoDB connected & ping ok (db=${dbName})`);

    // ✅ gắn client để Controller dùng transaction/session nếu cần
    app.locals.mongoClient = client;

    // ✅ inject DB cho middleware verifyToken (nếu middleware query users)
    injectAuthDB(client);

    // ✅ inject DB cho DAO (DAO vẫn dùng process.env.MOVIEREVIEWS_DB_NAME hoặc DB_NAME tuỳ bạn)
    // Nếu trong DAO bạn đang dùng process.env.DB_NAME thì bạn nên đổi DB_NAME -> MOVIEREVIEWS_DB_NAME
    await Promise.all([
      UsersDAO.injectDB(client),
      NguyenLieuDAO.injectDB(client),
      SanPhamDAO.injectDB(client),
      DonHangDAO.injectDB(client),
      phongban_chucvuDAO.injectDB(client),
      LuongDAO.injectDB(client),
      DashboardDAO.injectDB(client),
    ]);

    server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running on ${hostName}:${port}`);
    });

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    process.on("unhandledRejection", (reason) => {
      console.error(" unhandledRejection:", reason);
    });
    process.on("uncaughtException", (err) => {
      console.error(" uncaughtException:", err);
    });
  } catch (e) {
    console.error(" Startup error:", e);
    try {
      await client.close();
    } catch {}
    process.exit(1);
  }
}

main();
