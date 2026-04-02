// Refactored: 2026-04-02 | Issues fixed: G3, M4, W5 | Phase 1 – Foundation
// Extracts DB connection logic from index.js.
// Standardizes env vars: SME_DB_URI + SME_DB_NAME (matching actual .env)

import mongodb from "mongodb";

let client = null;
let _db = null;

/**
 * Connect to MongoDB.
 * Supports both the new SME_DB_URI/SME_DB_NAME keys and the old
 * MOVIEREVIEWS_DB_URI/MOVIEREVIEWS_DB_NAME keys for backward compatibility
 * during migration.
 *
 * @returns {{ client: MongoClient, db: Db }}
 */
export async function connectDB() {
  const uri    = process.env.SME_DB_URI    || process.env.MOVIEREVIEWS_DB_URI;
  const dbName = process.env.SME_DB_NAME   || process.env.MOVIEREVIEWS_DB_NAME || process.env.DB_NAME;

  if (!uri)    throw new Error("Missing env: SME_DB_URI");
  if (!dbName) throw new Error("Missing env: SME_DB_NAME");

  client = new mongodb.MongoClient(uri);
  await client.connect();
  await client.db(dbName).command({ ping: 1 });

  _db = client.db(dbName);
  console.log(`✅ MongoDB connected (db=${dbName})`);

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
    console.log("✅ MongoDB connection closed");
  }
}
