import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "@/lib/security-headers";

describe("security headers and CSP", () => {
  it("builds production CSP with wasm-unsafe-eval and without unsafe-eval", () => {
    const csp = buildContentSecurityPolicy({ isProduction: true });
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("includes all mandatory hardening headers", () => {
    const headers = Object.fromEntries(
      buildSecurityHeaders({ isProduction: true }).map((h) => [h.key, h.value])
    );

    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Content-Security-Policy"]).toBeTruthy();
  });
});
