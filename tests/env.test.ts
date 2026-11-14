import { describe, expect, it } from "vitest";
import {
  getOptionalServerEnv,
  getPublicEnv,
  parseAdminGithubIds,
  validateBootEnv,
  validateServerEnv,
} from "@/lib/env";

const VALID_SERVER_ENV = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:supersecretpass@host.neon.tech/dottoh?sslmode=require",
  AUTH_SECRET: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  AUTH_GITHUB_ID: "Ov23liTestClientId",
  AUTH_GITHUB_SECRET: "super-secret-oauth-value",
  GITHUB_ADMIN_IDS: "148310311, 99887766",
};

describe("env configuration", () => {
  it("parses numeric GitHub admin IDs and ignores non-numeric values", () => {
    const ids = parseAdminGithubIds(" 148310311, not-an-id, , 42 ");
    expect(Array.from(ids)).toEqual(["148310311", "42"]);
    expect(parseAdminGithubIds(undefined).size).toBe(0);
  });

  it("validates complete server environment configuration", () => {
    const env = validateServerEnv(VALID_SERVER_ENV);
    expect(env.NODE_ENV).toBe("production");
    expect(env.DATABASE_URL).toContain("host.neon.tech");
  });

  it("rejects short AUTH_SECRET without leaking secret values in error text", () => {
    const shortSecret = "too-short-secret-value";
    expect(() =>
      validateServerEnv({
        ...VALID_SERVER_ENV,
        AUTH_SECRET: shortSecret,
      })
    ).toThrow(/AUTH_SECRET/);

    try {
      validateServerEnv({
        ...VALID_SERVER_ENV,
        AUTH_SECRET: shortSecret,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(shortSecret);
    }
  });

  it("rejects mismatched Upstash Redis URL and token pairs", () => {
    expect(() =>
      validateServerEnv({
        ...VALID_SERVER_ENV,
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      })
    ).toThrow(/UPSTASH_REDIS_REST_TOKEN/);
  });

  it("allows empty optional server env in local dev while validating provided values", () => {
    const empty = getOptionalServerEnv({});
    expect(empty.DATABASE_URL).toBeUndefined();

    expect(() =>
      getOptionalServerEnv({ DATABASE_URL: "mysql://invalid-scheme" })
    ).toThrow(/DATABASE_URL/);
  });

  it("returns public env defaults and parses overrides", () => {
    const defaults = getPublicEnv({});
    expect(defaults.NEXT_PUBLIC_APP_URL).toBe("https://dottoh.vercel.app");
    expect(defaults.NEXT_PUBLIC_TELEMETRY_ENABLED).toBe(true);

    const custom = getPublicEnv({
      NEXT_PUBLIC_APP_URL: "https://preview.dottoh.vercel.app",
      NEXT_PUBLIC_TELEMETRY_ENABLED: "false",
    });
    expect(custom.NEXT_PUBLIC_APP_URL).toBe(
      "https://preview.dottoh.vercel.app"
    );
    expect(custom.NEXT_PUBLIC_TELEMETRY_ENABLED).toBe(false);
  });

  it("allows boot without admin credentials while flagging missing vars and failing on invalid values", () => {
    const boot = validateBootEnv({ NODE_ENV: "production" });
    expect(boot.publicEnv.NEXT_PUBLIC_APP_URL).toBe(
      "https://dottoh.vercel.app"
    );
    expect(boot.missingAdminVars).toContain("DATABASE_URL");
    expect(boot.missingAdminVars).toContain("AUTH_SECRET");

    expect(() =>
      validateBootEnv({
        NODE_ENV: "production",
        DATABASE_URL: "http://not-postgres",
      })
    ).toThrow(/DATABASE_URL/);
  });
});
