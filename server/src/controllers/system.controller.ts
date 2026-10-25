import type { Request, Response } from "express";
import { pingDatabase } from "../config/database.js";

export async function health(_req: Request, res: Response): Promise<void> {
  const databaseOk = await pingDatabase();
  res.status(databaseOk ? 200 : 503).json({
    status: databaseOk ? "ok" : "degraded",
    database: databaseOk ? "ok" : "unreachable",
    time: new Date().toISOString(),
  });
}

export function hello(_req: Request, res: Response): void {
  res.json({ message: "Hello from Node.js API" });
}
