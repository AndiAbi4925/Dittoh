import { describe, expect, it } from "vitest";
import { applyCorsHeaders, evaluateApiCors } from "@/lib/cors";

describe("strict API CORS policy", () => {
  it("allows same-origin browser requests and preflight checks", () => {
    const decision = evaluateApiCors({
      method: "POST",
      originHeader: "https://dottoh.vercel.app",
      requestUrl: "https://dottoh.vercel.app/api/telemetry",
      configuredAppUrl: "https://dottoh.vercel.app",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.allowOrigin).toBe("https://dottoh.vercel.app");

    const headers = new Headers();
    applyCorsHeaders(headers, decision.allowOrigin);
    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://dottoh.vercel.app"
    );
    expect(headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("blocks cross-origin browser requests and invalid preflights", () => {
    const crossOrigin = evaluateApiCors({
      method: "POST",
      originHeader: "https://evil.example.com",
      requestUrl: "https://dottoh.vercel.app/api/telemetry",
      configuredAppUrl: "https://dottoh.vercel.app",
    });
    expect(crossOrigin.allowed).toBe(false);

    const missingOriginPreflight = evaluateApiCors({
      method: "OPTIONS",
      originHeader: null,
      requestUrl: "https://dottoh.vercel.app/api/telemetry",
    });
    expect(missingOriginPreflight.allowed).toBe(false);
  });
});
