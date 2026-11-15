import { type PrismaClient } from "@/generated/prisma/client";
import type {
  AdminAuditLogPage,
  AdminTelemetryStats,
} from "@/lib/admin-types";
import { getDb } from "@/lib/db";
import type { TelemetryEventInput } from "@/lib/validation/admin";

export type {
  AdminAuditLogPage,
  AdminTelemetryStats,
  AuditLogItem,
  TelemetryFormatCount,
  TelemetryRecentItem,
} from "@/lib/admin-types";

export async function recordTelemetryEvent(
  input: TelemetryEventInput,
  dbOverride?: PrismaClient | null
): Promise<{ recorded: boolean; reason?: string }> {
  const db = dbOverride === undefined ? getDb() : dbOverride;
  if (!db) {
    return { recorded: false, reason: "database_unconfigured" };
  }

  try {
    await db.telemetryEvent.create({
      data: {
        eventType: input.eventType,
        inputFormat: input.inputFormat ?? null,
        outputFormat: input.outputFormat ?? null,
        durationMs: input.durationMs ?? null,
        errorCode: input.errorCode ?? null,
      },
    });
    return { recorded: true };
  } catch {
    return { recorded: false, reason: "database_error" };
  }
}

export async function getAdminTelemetryStats(
  windowDays = 30,
  dbOverride?: PrismaClient | null
): Promise<AdminTelemetryStats> {
  const safeDays = Math.max(1, Math.min(90, Math.round(windowDays)));
  const db = dbOverride === undefined ? getDb() : dbOverride;

  const empty: AdminTelemetryStats = {
    databaseConfigured: false,
    windowDays: safeDays,
    totalEvents: 0,
    conversionsCount: 0,
    exportsCount: 0,
    bgRemovalsCount: 0,
    errorsCount: 0,
    avgDurationMs: null,
    byInputFormat: [],
    byOutputFormat: [],
    recentEvents: [],
  };

  if (!db) {
    return empty;
  }

  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const whereWindow = { createdAt: { gte: since } };

  try {
    const [
      byEventType,
      durationAgg,
      inputGroups,
      outputGroups,
      recentRows,
    ] = await Promise.all([
      db.telemetryEvent.groupBy({
        by: ["eventType"],
        where: whereWindow,
        _count: { _all: true },
      }),
      db.telemetryEvent.aggregate({
        where: { ...whereWindow, durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
      db.telemetryEvent.groupBy({
        by: ["inputFormat"],
        where: { ...whereWindow, inputFormat: { not: null } },
        _count: { inputFormat: true },
        orderBy: { _count: { inputFormat: "desc" } },
        take: 8,
      }),
      db.telemetryEvent.groupBy({
        by: ["outputFormat"],
        where: { ...whereWindow, outputFormat: { not: null } },
        _count: { outputFormat: true },
        orderBy: { _count: { outputFormat: "desc" } },
        take: 8,
      }),
      db.telemetryEvent.findMany({
        where: whereWindow,
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const countFor = (type: string): number =>
      byEventType.find((row) => row.eventType === type)?._count._all ?? 0;

    const totalEvents = byEventType.reduce(
      (sum, row) => sum + row._count._all,
      0
    );

    return {
      databaseConfigured: true,
      windowDays: safeDays,
      totalEvents,
      conversionsCount: countFor("conversion"),
      exportsCount: countFor("export"),
      bgRemovalsCount: countFor("bg_removal"),
      errorsCount: countFor("error"),
      avgDurationMs:
        durationAgg._avg.durationMs !== null
          ? Math.round(durationAgg._avg.durationMs)
          : null,
      byInputFormat: inputGroups
        .filter((row) => row.inputFormat !== null)
        .map((row) => ({
          format: row.inputFormat as string,
          count: row._count.inputFormat,
        })),
      byOutputFormat: outputGroups
        .filter((row) => row.outputFormat !== null)
        .map((row) => ({
          format: row.outputFormat as string,
          count: row._count.outputFormat,
        })),
      recentEvents: recentRows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        inputFormat: row.inputFormat,
        outputFormat: row.outputFormat,
        durationMs: row.durationMs,
        errorCode: row.errorCode,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  } catch {
    return {
      ...empty,
      databaseConfigured: true,
    };
  }
}

export async function getAdminAuditLogs(
  params: { limit: number; offset: number; action?: string },
  dbOverride?: PrismaClient | null
): Promise<AdminAuditLogPage> {
  const db = dbOverride === undefined ? getDb() : dbOverride;
  if (!db) {
    return {
      databaseConfigured: false,
      total: 0,
      limit: params.limit,
      offset: params.offset,
      logs: [],
    };
  }

  const where = params.action ? { action: params.action } : undefined;

  try {
    const [total, rows] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit,
        skip: params.offset,
      }),
    ]);

    return {
      databaseConfigured: true,
      total,
      limit: params.limit,
      offset: params.offset,
      logs: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        target: row.target,
        metadata: row.metadata,
        ipHash: row.ipHash,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  } catch {
    return {
      databaseConfigured: true,
      total: 0,
      limit: params.limit,
      offset: params.offset,
      logs: [],
    };
  }
}
