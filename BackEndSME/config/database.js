// Refactored: 2026-04-02 | Issues fixed: G3, M4, W5 | Phase 1 – Foundation
// Phase 4 update: added connection pool options (maxPoolSize, minPoolSize, maxIdleTimeMS)
// Docker update: MONGO_URI env var takes priority (set to mongodb://db:27017 in docker-compose)
// Extracts DB connection logic from index.js.
// URI resolution order: MONGO_URI > SME_DB_URI > MOVIEREVIEWS_DB_URI (legacy fallback)

import mongodb from "mongodb";
import logger from "../utils/logger.js";

let client = null;
let _db = null;

/**
 * Connect to MongoDB.
 *
 * URI resolution order (first defined wins):
 *   1. MONGO_URI       — set to "mongodb://db:27017" in docker-compose
 *   2. SME_DB_URI      — Atlas connection string for local dev / production
 *   3. MOVIEREVIEWS_DB_URI — legacy fallback (backward compat)
 *
 * @returns {{ client: MongoClient, db: Db }}
 */
export async function connectDB() {
  const uri    = process.env.MONGO_URI     || process.env.SME_DB_URI    || process.env.MOVIEREVIEWS_DB_URI;
  const dbName = process.env.SME_DB_NAME   || process.env.MOVIEREVIEWS_DB_NAME || process.env.DB_NAME;

  if (!uri)    throw new Error("Missing env: MONGO_URI or SME_DB_URI");
  if (!dbName) throw new Error("Missing env: SME_DB_NAME");

  client = new mongodb.MongoClient(uri, {
    maxPoolSize:     Number(process.env.DB_POOL_MAX)  || 10,
    minPoolSize:     Number(process.env.DB_POOL_MIN)  || 2,
    maxIdleTimeMS:   Number(process.env.DB_IDLE_MS)   || 30_000,
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
  });
  await client.connect();
  await client.db(dbName).command({ ping: 1 });

  _db = client.db(dbName);
  logger.info(`MongoDB connected (db=${dbName})`);

  return { client, db: _db };
}

/**
 * Get the already-connected Db instance.
 * Throws if connectDB() has not been called yet.
 */
export function getDB() {
  if (!_db) throw new Error("Database not connected. Call connectDB() first.");
  return _db;
}

/**
 * Get the MongoClient instance (needed for session / transaction support).
 */
export function getClient() {
  if (!client) throw new Error("Database not connected. Call connectDB() first.");
  return client;
}

/**
 * Close the MongoDB connection gracefully.
 */
export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    _db = null;
    logger.info("MongoDB connection closed");
  }
}
