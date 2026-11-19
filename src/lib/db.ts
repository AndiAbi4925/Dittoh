import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { getOptionalServerEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  __dittohPrisma?: PrismaClient;
  __dittohPrismaUrl?: string;
};

/**
 * Returns a cached PrismaClient backed by Neon serverless adapter when DATABASE_URL
 * is present, or null when running locally without a configured database.
 */
export function getDb(): PrismaClient | null {
  const { DATABASE_URL } = getOptionalServerEnv();
  if (!DATABASE_URL) {
    return null;
  }

  if (
    globalForPrisma.__dittohPrisma &&
    globalForPrisma.__dittohPrismaUrl === DATABASE_URL
  ) {
    return globalForPrisma.__dittohPrisma;
  }

  const adapter = new PrismaNeon({ connectionString: DATABASE_URL });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__dittohPrisma = client;
    globalForPrisma.__dittohPrismaUrl = DATABASE_URL;
  }

  return client;
}

export function requireDb(): PrismaClient {
  const db = getDb();
  if (!db) {
    throw new Error("Database is not configured (missing DATABASE_URL).");
  }
  return db;
}

export type DatabaseHealthStatus = "ok" | "unconfigured" | "error";

export interface DatabaseHealthResult {
  status: DatabaseHealthStatus;
  latencyMs?: number;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const db = getDb();
  if (!db) {
    return { status: "unconfigured" };
  }

  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return { status: "error" };
  }
}

