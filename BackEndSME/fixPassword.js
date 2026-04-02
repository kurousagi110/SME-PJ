import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

const uri    = process.env.SME_DB_URI;
const dbName = process.env.SME_DB_NAME;

if (!uri)    { console.error("Missing env: SME_DB_URI");  process.exit(1); }
if (!dbName) { console.error("Missing env: SME_DB_NAME"); process.exit(1); }

const client = new MongoClient(uri);

try {
  await client.connect();
  console.log(`Connected to: ${dbName}`);

  const hashedPassword = await bcrypt.hash("123456", 10);

  const result = await client
    .db(dbName)
    .collection("users")
    .updateMany({}, { $set: { mat_khau: hashedPassword } });

  console.log(`Updated ${result.modifiedCount} user(s).`);
} finally {
  await client.close();
  console.log("Connection closed.");
}
