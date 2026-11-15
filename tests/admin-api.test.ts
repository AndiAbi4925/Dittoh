import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  getAdminAppConfig,
  getPublicAppConfig,
  updateAppConfig,
} from "@/lib/app-config";
import { resetMemoryRateLimiterForTests } from "@/lib/rate-limit";
import {
  getAdminAuditLogs,
  getAdminTelemetryStats,
} from "@/lib/telemetry-stats";

const mocks = vi.hoisted(() => ({
  authSession: null as {
    user?: { githubId?: string; githubUsername?: string };
  } | null,
  allowlistResult: false,
  dbClient: null as PrismaClient | null,
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mocks.authSession),
}));

vi.mock("@/lib/auth-allowlist", () => ({
  isGithubIdAllowlisted: vi.fn(async () => mocks.allowlistResult),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mocks.dbClient),
  requireDb: vi.fn(() => {
    if (!mocks.dbClient) {
      throw new Error("Database not configured");
    }
    return mocks.dbClient;
  }),
  checkDatabaseHealth: vi.fn(async () =>
    mocks.dbClient ? { status: "ok", latencyMs: 3 } : { status: "unconfigured" }
  ),
}));

import { GET as getAuditLogs } from "@/app/api/admin/audit-logs/route";
import {
  GET as getAdminSettings,
  PATCH as patchAdminSettings,
} from "@/app/api/admin/settings/route";
import { GET as getAdminStats } from "@/app/api/admin/stats/route";
import { GET as getConfig } from "@/app/api/config/route";
import { POST as postTelemetry } from "@/app/api/telemetry/route";

describe("AppConfig and telemetry services", () => {
  it("falls back safely when database is null and updates transactionally with audit logs when DB exists", async () => {
    const publicDefaults = await getPublicAppConfig(null);
    expect(publicDefaults.maxImageSizeMb).toBe(50);
    expect(publicDefaults.source).toBe("default");
    expect("updatedBy" in publicDefaults).toBe(false);

    const adminDefaults = await getAdminAppConfig(null);
    expect(adminDefaults.databaseConfigured).toBe(false);

    const auditCreated = vi.fn(async () => ({}));
    const upsertRow = vi.fn(async () => ({
      id: "default",
      maxImageSizeMb: 80,
      maxVideoSizeMb: 100,
      maxVideoDurationSec: 30,
      enabledRawFormats: ["arw", "dng", "raf"],
      enableVideoConverter: false,
      rateLimitPerMin: 40,
      updatedAt: new Date("2026-11-15T05:00:00Z"),
      updatedBy: "123456",
    }));

    const fakeDb = {
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          appConfig: { upsert: upsertRow },
          auditLog: { create: auditCreated },
        })
      ),
      telemetryEvent: {
        groupBy: vi.fn(async ({ by }: { by: string[] }) => {
          if (by[0] === "eventType") {
            return [{ eventType: "export", _count: { _all: 5 } }];
          }
          if (by[0] === "inputFormat") {
            return [{ inputFormat: "png", _count: { inputFormat: 5 } }];
          }
          return [{ outputFormat: "svg", _count: { outputFormat: 5 } }];
        }),
        aggregate: vi.fn(async () => ({ _avg: { durationMs: 12.4 } })),
        findMany: vi.fn(async () => []),
      },
      auditLog: {
        count: vi.fn(async () => 1),
        findMany: vi.fn(async () => [
          {
            id: "audit_1",
            actorId: "123456",
            action: "APP_CONFIG_UPDATED",
            target: "app_config:default",
            metadata: { maxImageSizeMb: 80 },
            ipHash: "abcd",
            createdAt: new Date("2026-11-15T05:00:00Z"),
          },
        ]),
      },
    } as unknown as PrismaClient;

    const updated = await updateAppConfig(
      { maxImageSizeMb: 80, enabledRawFormats: ["arw", "dng", "raf"] },
      { githubId: "123456", ipHash: "hash1" },
      fakeDb
    );
    expect(updated.maxImageSizeMb).toBe(80);
    expect(updated.source).toBe("database");
    expect(auditCreated).toHaveBeenCalledTimes(1);

    const stats = await getAdminTelemetryStats(30, fakeDb);
    expect(stats.databaseConfigured).toBe(true);
    expect(stats.exportsCount).toBe(5);
    expect(stats.avgDurationMs).toBe(12);

    const logs = await getAdminAuditLogs({ limit: 10, offset: 0 }, fakeDb);
    expect(logs.total).toBe(1);
    expect(logs.logs[0]?.action).toBe("APP_CONFIG_UPDATED");
  });
});

describe("Public and Admin API route authorization and rate limiting", () => {
  beforeEach(() => {
    resetMemoryRateLimiterForTests();
    mocks.authSession = null;
    mocks.allowlistResult = false;
    mocks.dbClient = null;
  });

  it("serves public config safely without leaking admin metadata", async () => {
    const res = await getConfig();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.maxImageSizeMb).toBe(50);
    expect(json.updatedBy).toBeUndefined();
  });

  it("validates, accepts, and rate-limits /api/telemetry submissions", async () => {
    const badReq = new NextRequest("http://localhost:3000/api/telemetry", {
      method: "POST",
      body: JSON.stringify({ eventType: "invalid_type" }),
      headers: { "content-type": "application/json", "x-real-ip": "198.51.100.7" },
    });
    const badRes = await postTelemetry(badReq);
    expect(badRes.status).toBe(400);

    for (let i = 0; i < 30; i += 1) {
      const okReq = new NextRequest("http://localhost:3000/api/telemetry", {
        method: "POST",
        body: JSON.stringify({ eventType: "conversion", inputFormat: "png" }),
        headers: {
          "content-type": "application/json",
          "x-real-ip": "198.51.100.8",
        },
      });
      const okRes = await postTelemetry(okReq);
      expect(okRes.status).toBe(202);
    }

    const limitedReq = new NextRequest("http://localhost:3000/api/telemetry", {
      method: "POST",
      body: JSON.stringify({ eventType: "conversion", inputFormat: "png" }),
      headers: { "content-type": "application/json", "x-real-ip": "198.51.100.8" },
    });
    const limitedRes = await postTelemetry(limitedReq);
    expect(limitedRes.status).toBe(429);
    expect(limitedRes.headers.get("retry-after")).toBeTruthy();
  });

  it("blocks unauthenticated and non-allowlisted callers on /api/admin/* endpoints", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/settings");
    const unauthSettings = await getAdminSettings(req);
    const unauthStats = await getAdminStats(
      new NextRequest("http://localhost:3000/api/admin/stats")
    );
    const unauthLogs = await getAuditLogs(
      new NextRequest("http://localhost:3000/api/admin/audit-logs")
    );
    expect(unauthSettings.status).toBe(401);
    expect(unauthStats.status).toBe(401);
    expect(unauthLogs.status).toBe(401);
    expect(unauthSettings.headers.get("cache-control")).toBe("no-store");

    mocks.authSession = { user: { githubId: "999", githubUsername: "intruder" } };
    mocks.allowlistResult = false;
    const forbiddenRes = await getAdminSettings(req);
    expect(forbiddenRes.status).toBe(403);
  });

  it("grants allowlisted admin access and enforces 503 when DB is absent on PATCH", async () => {
    mocks.authSession = { user: { githubId: "777", githubUsername: "andi" } };
    mocks.allowlistResult = true;

    const settingsRes = await getAdminSettings(
      new NextRequest("http://localhost:3000/api/admin/settings")
    );
    expect(settingsRes.status).toBe(200);

    const statsRes = await getAdminStats(
      new NextRequest("http://localhost:3000/api/admin/stats?days=7")
    );
    expect(statsRes.status).toBe(200);

    const logsRes = await getAuditLogs(
      new NextRequest("http://localhost:3000/api/admin/audit-logs?limit=10")
    );
    expect(logsRes.status).toBe(200);

    const patchNoDb = await patchAdminSettings(
      new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ maxImageSizeMb: 60 }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(patchNoDb.status).toBe(503);
  });
});
