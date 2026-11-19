import { describe, expect, it } from "vitest";
import {
  exportAsciiAsHtml,
  exportAsciiAsMarkdown,
  exportAsciiAsSvg,
  exportAsciiAsTxt,
  sanitizeDownloadFilename,
} from "@/lib/ascii/exporters";
import { DEFAULT_ASCII_SETTINGS } from "@/lib/ascii/presets";
import {
  appendAsciiHistory,
  clearAsciiHistory,
  deleteCustomPreset,
  loadAsciiHistory,
  loadHistoryPreference,
  loadSavedPresets,
  saveCustomPreset,
  saveHistoryPreference,
  STORAGE_KEYS,
} from "@/lib/ascii/storage";
import type { AsciiGridResult } from "@/lib/ascii/types";

function createMemoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, val) => {
      map.set(key, val);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function makeMockGrid(
  lines: string[],
  backgroundColorHex: string | null = "#ffffff"
): AsciiGridResult {
  const rows = lines.length;
  const columns = lines[0]?.length ?? 1;
  const cellRgba = new Uint8ClampedArray(columns * rows * 4);
  for (let i = 0; i < columns * rows; i += 1) {
    cellRgba[i * 4] = 215;
    cellRgba[i * 4 + 1] = 25;
    cellRgba[i * 4 + 2] = 33;
    cellRgba[i * 4 + 3] = 255;
  }

  return {
    columns,
    rows,
    lines,
    cellRgba,
    backgroundColorHex,
    defaultForegroundHex: "#d71921",
    renderMs: 2,
  };
}

describe("ASCII exporters and XSS neutralization", () => {
  it("exports TXT and prevents Markdown code-fence breakout", () => {
    const grid = makeMockGrid(["```##", "  :: "]);
    expect(exportAsciiAsTxt(grid)).toBe("```##\n  :: ");

    const md = exportAsciiAsMarkdown(grid, "sample`shot.arw");
    expect(md.startsWith("# sampleshot.arw\n\n````text\n")).toBe(true);
    expect(md.endsWith("\n````\n")).toBe(true);
  });

  it("generates transparent SVG without background rect and escapes XML payloads", () => {
    const xssGrid = makeMockGrid(["<script>alert(1)</script>"], null);
    (xssGrid as { backgroundColorHex: string | null }).backgroundColorHex =
      '"><script>alert(1)</script>';
    (xssGrid as { defaultForegroundHex: string }).defaultForegroundHex =
      "javascript:alert(1)";

    const svg = exportAsciiAsSvg(xssGrid, { targetWidthPx: 960 });
    expect(svg).not.toContain("<script>alert(1)</script>");
    expect(svg).not.toContain('width="100%" height="100%"');
    expect(svg).not.toContain("javascript:");
    expect(svg).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");

    const opaqueGrid = makeMockGrid(["#."], "#101010");
    const opaqueSvg = exportAsciiAsSvg(opaqueGrid, { targetWidthPx: 640 });
    expect(opaqueSvg).toContain('<rect width="100%" height="100%" fill="#101010" />');
  });

  it("generates standalone HTML with strict CSP meta and neutralized injection attempts", () => {
    const grid = makeMockGrid(["<img src=x onerror=alert(1)>"], "#ffffff");
    const html = exportAsciiAsHtml(
      grid,
      '</title><script>alert("xss")</script>',
      { targetWidthPx: 1200 }
    );

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("default-src 'none'; style-src 'unsafe-inline';");
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;/title&gt;&lt;script&gt;");
    expect(html).toContain("&lt;img</span>");
    expect(html).toContain("onerror=alert(1)&gt;</span>");
  });

  it("sanitizes unsafe filenames for browser download attributes", () => {
    expect(sanitizeDownloadFilename("../../../etc/passwd.png")).toBe("etc-passwd");
    expect(sanitizeDownloadFilename("My Photo (RAW).ARW")).toBe("my-photo-raw");
    expect(sanitizeDownloadFilename("...")).toBe("dittoh-ascii");
  });
});

describe("ASCII Zod-validated localStorage presets and history", () => {
  it("saves, loads, deduplicates, and deletes custom presets safely", () => {
    const storage = createMemoryStorage();
    const afterFirst = saveCustomPreset(
      "Contrast Noir",
      { ...DEFAULT_ASCII_SETTINGS, columns: 140, invert: true },
      storage
    );
    expect(afterFirst).toHaveLength(1);
    expect(loadSavedPresets(storage)[0]?.settings.columns).toBe(140);

    const updated = saveCustomPreset(
      "Contrast Noir",
      { ...DEFAULT_ASCII_SETTINGS, columns: 160 },
      storage
    );
    expect(updated).toHaveLength(1);
    expect(updated[0]?.settings.columns).toBe(160);

    const idToDelete = updated[0]?.id ?? "";
    const remaining = deleteCustomPreset(idToDelete, storage);
    expect(remaining).toHaveLength(0);
  });

  it("records history, toggles preference, clears history, and recovers from corrupt JSON", () => {
    const storage = createMemoryStorage();
    expect(loadHistoryPreference(storage)).toBe(true);
    saveHistoryPreference(false, storage);
    expect(loadHistoryPreference(storage)).toBe(false);

    const next = appendAsciiHistory(
      {
        fileName: "portrait.arw",
        format: "SVG",
        columns: 100,
        rows: 52,
        lines: ["#.:", "::."],
        settings: DEFAULT_ASCII_SETTINGS,
      },
      storage
    );
    expect(next).toHaveLength(1);
    expect(loadAsciiHistory(storage)).toHaveLength(1);

    expect(clearAsciiHistory(storage)).toHaveLength(0);
    expect(loadAsciiHistory(storage)).toHaveLength(0);

    storage.setItem(STORAGE_KEYS.presets, "{corrupt-json");
    storage.setItem(STORAGE_KEYS.history, JSON.stringify([{ bad: true }]));
    expect(loadSavedPresets(storage)).toEqual([]);
    expect(loadAsciiHistory(storage)).toEqual([]);
  });
});
