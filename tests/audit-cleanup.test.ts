import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "..", relativePath),
    "utf8"
  );
}

describe("full-stack cleanup and route boundaries", () => {
  it("excludes removed unused gsap dependency from package.json", () => {
    const pkg = JSON.parse(readRepoFile("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.gsap).toBeUndefined();
    expect(pkg.devDependencies?.gsap).toBeUndefined();
    expect(pkg.dependencies?.motion).toBeDefined();
  });

  it("configures robots.txt rules to keep /admin and /api out of search indexes", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(["/admin", "/api/"]);
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("publishes sitemap.xml entries only for public routes", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith("/convert"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/convert/photo"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/video"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/guide"))).toBe(true);
    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(urls.some((url) => url.includes("/api"))).toBe(false);
  });

  it("provides branded 404 and error boundaries obeying strict design rules", () => {
    for (const file of ["src/app/not-found.tsx", "src/app/error.tsx"]) {
      const source = readRepoFile(file);
      expect(source).toContain("dittoh-btn");
      expect(source).not.toContain("rounded-full");
      expect(source).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("keeps dead legacy exports and outdated studio/format references pruned", () => {
    const brandMark = readRepoFile("src/components/BrandMark.tsx");
    for (const removed of [
      "IconArrowRight",
      "IconLayersCut",
      "IconSlidersGrid",
      "IconShieldLock",
    ]) {
      expect(brandMark).not.toContain(removed);
    }

    const localProcessor = readRepoFile("src/lib/media/local-processor.ts");
    expect(localProcessor).not.toContain("formatKindBadge");
    expect(localProcessor).not.toContain("TIFF/raster");

    const telemetryStats = readRepoFile("src/lib/telemetry-stats.ts");
    expect(telemetryStats).not.toContain("writeAuditLog");

    const adminClient = readRepoFile("src/components/admin/AdminDashboardClient.tsx");
    expect(adminClient).not.toContain("OPEN STUDIO");
    expect(adminClient).toContain("OPEN CONVERTER");

    const bgPanel = readRepoFile("src/components/studio/BackgroundRemovalPanel.tsx");
    expect(bgPanel).toContain('setHexDraft("#000000")');
    expect(bgPanel).toContain("onBlur");
  });
});
