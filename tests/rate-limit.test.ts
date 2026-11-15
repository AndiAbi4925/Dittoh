import { beforeEach, describe, expect, it } from "vitest";
import {
  checkMemoryRateLimit,
  extractClientIp,
  hashClientIp,
  resetMemoryRateLimiterForTests,
} from "@/lib/rate-limit";
import {
  adminAuditQuerySchema,
  allowlistCreateSchema,
  appConfigPatchSchema,
  telemetryEventSchema,
} from "@/lib/validation/admin";

describe("rate limiter and IP hashing", () => {
  beforeEach(() => {
    resetMemoryRateLimiterForTests();
  });

  it("enforces sliding window limits and recovers after window expiry", () => {
    const start = 1_700_000_000_000;
    const first = checkMemoryRateLimit("telemetry:abc", 2, 60_000, start);
    const second = checkMemoryRateLimit("telemetry:abc", 2, 60_000, start + 1_000);
    const blocked = checkMemoryRateLimit("telemetry:abc", 2, 60_000, start + 2_000);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    const recovered = checkMemoryRateLimit("telemetry:abc", 2, 60_000, start + 61_000);
    expect(recovered.allowed).toBe(true);
  });

  it("extracts client IPs safely and hashes without exposing raw IP strings", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "198.51.100.2",
    });
    const ip = extractClientIp(headers);
    expect(ip).toBe("203.0.113.10");

    const hashA = hashClientIp(ip, "test-salt");
    const hashB = hashClientIp("198.51.100.2", "test-salt");
    expect(hashA).toHaveLength(24);
    expect(hashA).not.toContain("203.0.113.10");
    expect(hashA).not.toBe(hashB);
  });
});

describe("Zod admin and telemetry validation schemas", () => {
  it("validates strict telemetry events and rejects unexpected PII fields", () => {
    const valid = telemetryEventSchema.safeParse({
      eventType: "export",
      inputFormat: "arw",
      outputFormat: "svg",
      durationMs: 14,
    });
    expect(valid.success).toBe(true);

    const extraPii = telemetryEventSchema.safeParse({
      eventType: "conversion",
      fileName: "secret-photo.png",
    });
    expect(extraPii.success).toBe(false);

    const xssFormat = telemetryEventSchema.safeParse({
      eventType: "export",
      outputFormat: "<script>alert(1)</script>",
    });
    expect(xssFormat.success).toBe(false);
  });

  it("validates AppConfig patches and rejects empty or unsupported updates", () => {
    const valid = appConfigPatchSchema.safeParse({
      maxImageSizeMb: 75,
      enabledRawFormats: ["arw", "dng", "arw"],
      rateLimitPerMin: 45,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.enabledRawFormats).toEqual(["arw", "dng"]);
    }

    expect(appConfigPatchSchema.safeParse({}).success).toBe(false);
    expect(
      appConfigPatchSchema.safeParse({ enabledRawFormats: ["exe"] }).success
    ).toBe(false);
    expect(
      appConfigPatchSchema.safeParse({ maxImageSizeMb: 999 }).success
    ).toBe(false);
  });

  it("validates audit query pagination and numeric allowlist IDs", () => {
    const query = adminAuditQuerySchema.safeParse({ limit: "20", offset: "0" });
    expect(query.success).toBe(true);
    expect(
      adminAuditQuerySchema.safeParse({ action: "bad; DROP TABLE" }).success
    ).toBe(false);

    expect(
      allowlistCreateSchema.safeParse({
        githubId: "12345678",
        username: "andi-admin",
      }).success
    ).toBe(true);
    expect(
      allowlistCreateSchema.safeParse({
        githubId: "andi-admin",
        username: "andi-admin",
      }).success
    ).toBe(false);
  });
});
