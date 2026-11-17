import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  getAdminAllowlistState,
  removeAdminAllowlistEntry,
  upsertAdminAllowlistEntry,
} from "@/lib/admin-allowlist";
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

import {
  DELETE as deleteAdminAllowlist,
  GET as getAdminAllowlist,
  POST as postAdminAllowlist,
} from "@/app/api/admin/allowlist/route";
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

  it("enforces auth, fail-closed 503, self-removal guard, and audit logging on /api/admin/allowlist", async () => {
    const emptyState = await getAdminAllowlistState(null);
    expect(emptyState.databaseConfigured).toBe(false);
    expect(emptyState.entries).toEqual([]);

    // Unauthenticated caller -> 401
    const unauthAllowlist = await getAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist")
    );
    expect(unauthAllowlist.status).toBe(401);

    // Authenticated non-allowlisted -> 403
    mocks.authSession = { user: { githubId: "999", githubUsername: "intruder" } };
    mocks.allowlistResult = false;
    const forbiddenPost = await postAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist", {
        method: "POST",
        body: JSON.stringify({ githubId: "1234", username: "bob", role: "ADMIN" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(forbiddenPost.status).toBe(403);

    // Allowlisted admin without DB -> GET 200 (unconfigured), POST/DELETE 503
    mocks.authSession = { user: { githubId: "777", githubUsername: "andi" } };
    mocks.allowlistResult = true;

    const getNoDb = await getAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist")
    );
    expect(getNoDb.status).toBe(200);

    const postNoDb = await postAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist", {
        method: "POST",
        body: JSON.stringify({ githubId: "1234", username: "bob", role: "ADMIN" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(postNoDb.status).toBe(503);

    const deleteNoDb = await deleteAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist", {
        method: "DELETE",
        body: JSON.stringify({ githubId: "1234" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(deleteNoDb.status).toBe(503);

    // Database present -> transactional upsert, self-removal block, delete + audit log
    const auditActions: string[] = [];
    const storedRows = new Map<
      string,
      {
        id: string;
        githubId: string;
        username: string;
        role: string;
        createdAt: Date;
      }
    >();

    const txClient = {
      adminAllowlist: {
        upsert: vi.fn(
          async ({
            where,
            create,
            update,
          }: {
            where: { githubId: string };
            create: { githubId: string; username: string; role: string };
            update: { username: string; role: string };
          }) => {
            const existing = storedRows.get(where.githubId);
            const next = existing
              ? { ...existing, ...update }
              : {
                  id: `allow_${where.githubId}`,
                  githubId: create.githubId,
                  username: create.username,
                  role: create.role,
                  createdAt: new Date("2026-11-18T00:00:00Z"),
                };
            storedRows.set(where.githubId, next);
            return next;
          }
        ),
        findUnique: vi.fn(async ({ where }: { where: { githubId: string } }) =>
          storedRows.get(where.githubId) ?? null
        ),
        delete: vi.fn(async ({ where }: { where: { githubId: string } }) => {
          const existing = storedRows.get(where.githubId);
          storedRows.delete(where.githubId);
          return existing;
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }: { data: { action: string } }) => {
          auditActions.push(data.action);
          return {};
        }),
      },
    };

    mocks.dbClient = {
      $transaction: vi.fn(async (cb: (tx: typeof txClient) => Promise<unknown>) =>
        cb(txClient)
      ),
      adminAllowlist: {
        findMany: vi.fn(async () => Array.from(storedRows.values())),
      },
    } as unknown as PrismaClient;

    // Invalid payload -> 400
    const badPost = await postAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist", {
        method: "POST",
        body: JSON.stringify({ githubId: "not-a-number", username: "bob" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(badPost.status).toBe(400);

    // Valid POST -> 200 & audit log
    const okPost = await postAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist", {
        method: "POST",
        body: JSON.stringify({ githubId: "8888", username: "teammate", role: "VIEWER" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(okPost.status).toBe(200);
    const okPostJson = (await okPost.json()) as {
      entry: { githubId: string; role: string };
      state: { entries: Array<{ githubId: string }> };
    };
    expect(okPostJson.entry.githubId).toBe("8888");
    expect(okPostJson.entry.role).toBe("VIEWER");
    expect(okPostJson.state.entries).toHaveLength(1);
    expect(auditActions).toEqual(["ALLOWLIST_UPSERTED"]);

    // Prevent self-removal -> 400
    const selfDelete = await deleteAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist", {
        method: "DELETE",
        body: JSON.stringify({ githubId: "777" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(selfDelete.status).toBe(400);

    // Remove another allowlisted entry -> 200 & audit log
    const okDelete = await deleteAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist", {
        method: "DELETE",
        body: JSON.stringify({ githubId: "8888" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(okDelete.status).toBe(200);
    expect(auditActions).toEqual(["ALLOWLIST_UPSERTED", "ALLOWLIST_REMOVED"]);

    // Missing entry removal -> 404
    const missingDelete = await deleteAdminAllowlist(
      new NextRequest("http://localhost:3000/api/admin/allowlist", {
        method: "DELETE",
        body: JSON.stringify({ githubId: "8888" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(missingDelete.status).toBe(404);

    // Direct service helper coverage
    const upsertedDirect = await upsertAdminAllowlistEntry(
      { githubId: "9991", username: "reviewer", role: "ADMIN" },
      { githubId: "777", ipHash: "h1" },
      mocks.dbClient
    );
    expect(upsertedDirect.username).toBe("reviewer");
    await expect(
      removeAdminAllowlistEntry("777", { githubId: "777" }, mocks.dbClient)
    ).rejects.toThrow(/own active admin/i);
  });
});
