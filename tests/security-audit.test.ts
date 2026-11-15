import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as authGet, POST as authPost } from "@/app/api/auth/[...nextauth]/route";
import { POST as postTelemetry } from "@/app/api/telemetry/route";
import { exportAsciiAsHtml, exportAsciiAsSvg } from "@/lib/ascii/exporters";
import type { AsciiGridResult } from "@/lib/ascii/types";
import { evaluateApiCors } from "@/lib/cors";
import { proxy } from "@/proxy";

function walkSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "generated" || entry.name === "node_modules") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSourceFiles(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

describe("Client/server bundle isolation and static security invariants", () => {
  it("prevents client components from importing server-only env, DB, or auth modules", () => {
    const srcFiles = walkSourceFiles(path.join(process.cwd(), "src"));
    const forbiddenImports = [
      "@/lib/env",
      "@/lib/db",
      "@/lib/site-config",
      "@/lib/app-config",
      "@/lib/telemetry-stats",
      "@/auth",
    ];

    const violations: string[] = [];
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf8");
      const trimmed = content.trimStart();
      if (
        !trimmed.startsWith('"use client"') &&
        !trimmed.startsWith("'use client'")
      ) {
        continue;
      }
      for (const forbidden of forbiddenImports) {
        if (content.includes(forbidden)) {
          violations.push(`${path.relative(process.cwd(), file)} -> ${forbidden}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("contains zero dynamic code execution or dangerous HTML injection sinks in src/", () => {
    const srcFiles = walkSourceFiles(path.join(process.cwd(), "src"));
    const violations: string[] = [];

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (
        content.includes("dangerouslySetInnerHTML") ||
        /\beval\s*\(/.test(content) ||
        /\bnew\s+Function\s*\(/.test(content)
      ) {
        violations.push(path.relative(process.cwd(), file));
      }
    }

    expect(violations).toEqual([]);
  });
});

describe("API CSRF, Fetch Metadata, Content-Type, and Auth fallback hardening", () => {
  it("blocks cross-site mutating API calls while allowing same-origin and GET OAuth callbacks", () => {
    const blockedCrossSite = evaluateApiCors({
      method: "POST",
      originHeader: null,
      requestUrl: "https://dittoh.vercel.app/api/telemetry",
      secFetchSite: "cross-site",
    });
    expect(blockedCrossSite.allowed).toBe(false);

    const allowedOAuthCallback = evaluateApiCors({
      method: "GET",
      originHeader: null,
      requestUrl: "https://dittoh.vercel.app/api/auth/callback/github",
      secFetchSite: "cross-site",
    });
    expect(allowedOAuthCallback.allowed).toBe(true);

    const proxyAuth = proxy(
      new NextRequest("https://dittoh.vercel.app/api/auth/session")
    );
    expect(proxyAuth.headers.get("cache-control")).toBe("no-store");
    expect(proxyAuth.headers.get("x-frame-options")).toBe("DENY");
  });

  it("rejects non-JSON Content-Type submissions with 415 Unsupported Media Type", async () => {
    const req = new NextRequest("http://localhost:3000/api/telemetry", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "x-real-ip": "198.51.100.77",
      },
      body: JSON.stringify({ eventType: "conversion" }),
    });

    const res = await postTelemetry(req);
    expect(res.status).toBe(415);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 503 no-store instead of crashing 500 on /api/auth/* when OAuth env is absent", async () => {
    const backup = {
      AUTH_SECRET: process.env.AUTH_SECRET,
      AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
      AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
      GITHUB_ADMIN_IDS: process.env.GITHUB_ADMIN_IDS,
    };

    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_GITHUB_ID;
    delete process.env.AUTH_GITHUB_SECRET;
    delete process.env.GITHUB_ADMIN_IDS;

    try {
      const getRes = await authGet(
        new NextRequest("http://localhost:3000/api/auth/session")
      );
      const postRes = await authPost(
        new NextRequest("http://localhost:3000/api/auth/signin/github", {
          method: "POST",
        })
      );

      expect(getRes.status).toBe(503);
      expect(getRes.headers.get("cache-control")).toBe("no-store");
      expect(postRes.status).toBe(503);
      expect(postRes.headers.get("cache-control")).toBe("no-store");
    } finally {
      Object.entries(backup).forEach(([key, val]) => {
        if (val === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = val;
        }
      });
    }
  });
});

describe("SVG and HTML exporter adversarial attribute-breakout defense", () => {
  it("escapes quotes, angle brackets, and rejects non-hex colors across exports", () => {
    const grid: AsciiGridResult = {
      columns: 4,
      rows: 1,
      lines: ['"<>&'],
      cellRgba: new Uint8ClampedArray([
        0, 0, 0, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,
      ]),
      backgroundColorHex: 'black" onload="alert(1)',
      defaultForegroundHex: "expression(alert(1))",
      renderMs: 1,
    };

    const svg = exportAsciiAsSvg(grid, { targetWidthPx: 480 });
    expect(svg).not.toContain('onload="alert(1)"');
    expect(svg).not.toContain("expression(");
    expect(svg).toContain("&quot;&lt;&gt;&amp;");

    const html = exportAsciiAsHtml(grid, 'Bad "onload=alert(1)" <svg>');
    expect(html).not.toContain('<pre aria-label="Bad "onload=');
    expect(html).toContain("&quot;onload=alert(1)&quot;");
  });
});
