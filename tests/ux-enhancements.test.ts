import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_FAQ_ITEMS } from "@/components/GuideFaq";
import { buildPixelSquareWipeFrames } from "@/lib/theme-transition";

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(import.meta.dirname, "..", relativePath),
    "utf8"
  );
}

describe("UX enhancements: dark mode, scroll chrome, modals, loaders, and FAQ", () => {
  it("ships CSP-safe static theme initialization without dangerouslySetInnerHTML", () => {
    const bootScript = readRepoFile("public/theme-init.js");
    expect(bootScript).toContain("dittoh-theme");
    expect(bootScript).toContain("dataset.theme");

    const layout = readRepoFile("src/app/layout.tsx");
    expect(layout).toContain('src="/theme-init.js"');
    expect(layout).toContain("PageScrollChrome");
    expect(layout).not.toContain("dangerouslySetInnerHTML");

    const globals = readRepoFile("src/app/globals.css");
    expect(globals).toContain('html[data-theme="dark"]');
    expect(globals).toContain("dittoh-pixel-pulse");
    expect(globals).toContain("dittoh-theme-transition");
    expect(globals).toContain("::view-transition-new(root)");

    const wipeFrames = buildPixelSquareWipeFrames(
      { top: 20, right: 1180, bottom: 58, left: 1100 },
      1280,
      800
    );
    expect(wipeFrames.length).toBe(13);
    expect(String(wipeFrames[0]?.clipPath)).toMatch(/^inset\(\d+px \d+px \d+px \d+px round 2px\)$/);
    expect(wipeFrames[wipeFrames.length - 1]?.clipPath).toBe(
      "inset(0px 0px 0px 0px round 0px)"
    );
  });

  it("provides accessible confirmation modals for destructive actions", () => {
    const dialog = readRepoFile("src/components/ConfirmDialog.tsx");
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain("Escape");

    for (const consumer of [
      "src/components/studio/BackgroundRemovalPanel.tsx",
      "src/components/studio/AsciiPresetsHistoryPanel.tsx",
      "src/components/admin/AdminDashboardClient.tsx",
    ]) {
      expect(readRepoFile(consumer)).toContain("ConfirmDialog");
    }
  });

  it("includes route loading UI, scroll progress bar, back-to-top button, and FAQ entries", () => {
    const loading = readRepoFile("src/app/loading.tsx");
    expect(loading).toContain("PixelLoader");

    const scrollChrome = readRepoFile("src/components/PageScrollChrome.tsx");
    expect(scrollChrome).toContain('role="progressbar"');
    expect(scrollChrome).toContain('aria-label="Back to top"');

    expect(GUIDE_FAQ_ITEMS.length).toBeGreaterThanOrEqual(5);
    for (const item of GUIDE_FAQ_ITEMS) {
      expect(item.question.length).toBeGreaterThan(10);
      expect(item.answer.length).toBeGreaterThan(20);
      expect(item.answer).not.toMatch(/[\u2013\u2014]/);
    }

    for (const page of [
      "src/app/guide/page.tsx",
      "src/app/privacy/page.tsx",
      "src/app/terms/page.tsx",
    ]) {
      expect(readRepoFile(page)).toContain("Last updated:");
    }
  });
});
