import { MongoClient, type Db } from "mongodb";

// One shared client for the whole process. The driver pools connections internally.
let client: MongoClient | undefined;
let db: Db | undefined;

export async function connectDB(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  // Database name comes from the URI path (/vipassana-hub). The URI is never logged.
  db = client.db();
  await db.command({ ping: 1 });
  return db;
}

export function getDB(): Db {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await getDB().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeDB(): Promise<void> {
  await client?.close();
}
