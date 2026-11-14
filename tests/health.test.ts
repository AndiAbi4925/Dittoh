import { describe, expect, it } from "vitest";
import { evaluateHealth } from "@/lib/health";

describe("health check evaluation", () => {
  it("returns 200 when database connectivity succeeds", async () => {
    const result = await evaluateHealth(
      async () => ({ status: "ok", latencyMs: 7 }),
      "production"
    );

    expect(result.statusCode).toBe(200);
    expect(result.body.status).toBe("ok");
    expect(result.body.database).toBe("ok");
    expect(result.body.latencyMs).toBe(7);
  });

  it("returns 503 when database fails or is unconfigured in production", async () => {
    const errorResult = await evaluateHealth(
      async () => ({ status: "error" }),
      "development"
    );
    expect(errorResult.statusCode).toBe(503);
    expect(errorResult.body.status).toBe("degraded");

    const prodUnconfigured = await evaluateHealth(
      async () => ({ status: "unconfigured" }),
      "production"
    );
    expect(prodUnconfigured.statusCode).toBe(503);
    expect(prodUnconfigured.body.status).toBe("degraded");
  });

  it("allows unconfigured database in non-production environments", async () => {
    const devResult = await evaluateHealth(
      async () => ({ status: "unconfigured" }),
      "development"
    );
    expect(devResult.statusCode).toBe(200);
    expect(devResult.body.status).toBe("ok");
  });
});
