import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const ROUTE_FILES = [
  "src/app/page.tsx",
  "src/app/convert/layout.tsx",
  "src/app/convert/page.tsx",
  "src/app/convert/photo/page.tsx",
  "src/app/convert/background/page.tsx",
  "src/app/convert/style/page.tsx",
  "src/app/convert/export/page.tsx",
  "src/app/video/page.tsx",
  "src/app/guide/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/terms/page.tsx",
];

const USER_FACING_COMPONENTS = [
  "src/components/MinimalHomeHero.tsx",
  "src/components/DotMatrixHero.tsx",
  "src/components/GuideWalkthrough.tsx",
  "src/components/SiteHeader.tsx",
  "src/components/SiteFooter.tsx",
  "src/components/studio/ConvertModeSelector.tsx",
  "src/components/studio/StepProgressHeader.tsx",
  "src/components/studio/ConvertStepViews.tsx",
  "src/components/studio/MediaDropzone.tsx",
  "src/components/studio/BackgroundRemovalPanel.tsx",
  "src/components/studio/AsciiControlsPanel.tsx",
  "src/components/studio/AsciiPreviewCanvas.tsx",
  "src/components/studio/AsciiExportPanel.tsx",
  "src/components/studio/AsciiPresetsHistoryPanel.tsx",
  "src/components/studio/VideoAsciiWorkspace.tsx",
];

const REMOVED_JARGON_AND_FORMATS = [
  /phase\s*2/i,
  /local browser engine/i,
  /zero upload/i,
  /image cap/i,
  /execution:\s*web worker/i,
  /open converter/i,
  /\btiff?\b/i,
  /\bbmp\b/i,
  /\bavif\b/i,
  /\bwebm\b/i,
  /\b(delve|tapestry|testament|realm|embark|beacon|bifurcate|symphony|crucial)\b/i,
];

describe("Step-by-step converter routes and streamlined copy", () => {
  it("provides dedicated pages for each converter step, video mode, and guide", () => {
    for (const rel of ROUTE_FILES) {
      expect(existsSync(path.join(ROOT, rel)), `${rel} must exist`).toBe(true);
    }
  });

  it("omits deprecated technical clutter, AI buzzwords, and dropped formats from UI components", () => {
    for (const rel of [...ROUTE_FILES, ...USER_FACING_COMPONENTS]) {
      const content = readFileSync(path.join(ROOT, rel), "utf8");
      for (const pattern of REMOVED_JARGON_AND_FORMATS) {
        expect(
          content,
          `${rel} matched disallowed pattern ${pattern.source}`
        ).not.toMatch(pattern);
      }
    }
  });

  it("includes visual animated walkthrough GIF assets for all 4 guide steps", () => {
    for (const gifName of [
      "public/guide/step-1-upload.gif",
      "public/guide/step-2-background.gif",
      "public/guide/step-3-style.gif",
      "public/guide/step-4-save.gif",
    ]) {
      const fullPath = path.join(ROOT, gifName);
      expect(existsSync(fullPath), `${gifName} must exist`).toBe(true);
      expect(readFileSync(fullPath).subarray(0, 6).toString("ascii")).toMatch(
        /^GIF8[79]a$/
      );
    }
  });
});
