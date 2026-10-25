import { connectDB, closeDB } from "../src/config/database.js";

try {
  const db = await connectDB();
  const cols = await db.listCollections().toArray();
  console.log("OK db:", db.databaseName, "collections:", cols.map((c) => c.name).join(", ") || "(none)");
} catch (err) {
  console.error("FAILED:", err instanceof Error ? `${err.name} - ${err.message}` : err);
  process.exitCode = 1;
} finally {
  await closeDB();
}
