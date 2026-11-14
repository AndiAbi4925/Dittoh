import { APP_VERSION } from "@/lib/constants";
import { checkDatabaseHealth, type DatabaseHealthResult } from "@/lib/db";

export interface HealthPayload {
  status: "ok" | "degraded";
  version: string;
  timestamp: string;
  database: DatabaseHealthResult["status"];
  latencyMs?: number;
}

export async function evaluateHealth(
  checkDb: () => Promise<DatabaseHealthResult> = checkDatabaseHealth,
  nodeEnv: string | undefined = process.env.NODE_ENV
): Promise<{ statusCode: number; body: HealthPayload }> {
  const db = await checkDb();
  const isHealthy =
    db.status === "ok" ||
    (db.status === "unconfigured" && nodeEnv !== "production");

  const body: HealthPayload = {
    status: isHealthy ? "ok" : "degraded",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    database: db.status,
    ...(typeof db.latencyMs === "number" ? { latencyMs: db.latencyMs } : {}),
  };

  return {
    statusCode: isHealthy ? 200 : 503,
    body,
  };
}

