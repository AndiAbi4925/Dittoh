import { describe, expect, it } from "vitest";
import {
  applyTonalAdjustments,
  computeAsciiRows,
  convertRgbaToAsciiGrid,
} from "@/lib/ascii/engine";
import { DEFAULT_ASCII_SETTINGS, sanitizeCharacterRamp } from "@/lib/ascii/presets";
import type { AsciiConversionSettings } from "@/lib/ascii/types";

function makeSolidQuadRgba(): Uint8ClampedArray {
  // 4x2 image:
  // row 0: [black, black, white, white]
  // row 1: [red,   green, transparent, blue]
  const rgba = new Uint8ClampedArray(4 * 2 * 4);
  const pixels: Array<[number, number, number, number]> = [
    [0, 0, 0, 255],
    [0, 0, 0, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [220, 20, 20, 255],
    [20, 200, 20, 255],
    [120, 120, 120, 0],
    [20, 20, 220, 255],
  ];

  pixels.forEach(([r, g, b, a], i) => {
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  });

  return rgba;
}

describe("ASCII engine and tonal math", () => {
  it("clamps row calculation and applies tonal adjustments safely", () => {
    expect(computeAsciiRows(1000, 500, 100, 0.5)).toBe(25);
    expect(computeAsciiRows(10, 10000, 300, 1.0)).toBe(480);

    expect(applyTonalAdjustments(0.5, 100, 0, 1)).toBe(1);
    expect(applyTonalAdjustments(0.5, -100, 0, 1)).toBe(0);
    expect(applyTonalAdjustments(0.8, 0, 80, 1)).toBeGreaterThan(0.8);
    expect(applyTonalAdjustments(0.5, 0, 0, 2.0)).toBeGreaterThan(0.5);
  });

  it("strips control characters from custom character ramps", () => {
    const cleaned = sanitizeCharacterRamp("\u0000\n .+*#\u0007");
    expect(cleaned.join("")).toBe(" .+*#");

    const fallback = sanitizeCharacterRamp("a");
    expect(fallback.length).toBeGreaterThanOrEqual(2);
  });

  it("maps monochrome luminance, invert flag, and alpha transparency spaces accurately", () => {
    const rgba = makeSolidQuadRgba();
    const settings: AsciiConversionSettings = {
      ...DEFAULT_ASCII_SETTINGS,
      presetId: "binary",
      columns: 8,
      aspectRatioCorrection: 0.5,
      transparentBackground: false,
      invert: false,
    };

    const normal = convertRgbaToAsciiGrid(rgba, 4, 2, settings);
    expect(normal.columns).toBe(8);
    expect(normal.rows).toBe(2);
    // Row 0 left columns are black (darkest -> '1' in " 01" on light background), right are white (' ').
    expect(normal.lines[0]?.slice(0, 2)).toBe("11");
    expect(normal.lines[0]?.slice(-2)).toBe("  ");

    const inverted = convertRgbaToAsciiGrid(rgba, 4, 2, {
      ...settings,
      invert: true,
    });
    expect(inverted.lines[0]?.slice(0, 2)).toBe("  ");
    expect(inverted.lines[0]?.slice(-2)).toBe("11");

    // Transparent cell in row 1 col 2 (mapped around col indices 4..5 in 8-col output) stays space & alpha 0.
    const transparentCellIdx = (1 * 8 + 4) * 4;
    expect(normal.lines[1]?.charAt(4)).toBe(" ");
    expect(normal.cellRgba[transparentCellIdx + 3]).toBe(0);
  });

  it("preserves original pixel RGB and applies custom FG/BG hex sanitization", () => {
    const rgba = makeSolidQuadRgba();
    const original = convertRgbaToAsciiGrid(rgba, 4, 2, {
      ...DEFAULT_ASCII_SETTINGS,
      columns: 8,
      aspectRatioCorrection: 0.5,
      colorMode: "original",
      transparentBackground: true,
    });

    expect(original.backgroundColorHex).toBeNull();
    // Red pixel sampled into row 1 cols 0..1
    const redIdx = (1 * 8 + 0) * 4;
    expect(original.cellRgba[redIdx]).toBeGreaterThan(180);
    expect(original.cellRgba[redIdx + 1]).toBeLessThan(40);

    const custom = convertRgbaToAsciiGrid(rgba, 4, 2, {
      ...DEFAULT_ASCII_SETTINGS,
      columns: 8,
      aspectRatioCorrection: 0.5,
      colorMode: "custom",
      customForegroundHex: "#d71921",
      customBackgroundHex: "#000000",
      transparentBackground: false,
    });

    expect(custom.backgroundColorHex).toBe("#000000");
    expect(custom.defaultForegroundHex).toBe("#d71921");
    expect(custom.cellRgba[redIdx]).toBe(215);
    expect(custom.cellRgba[redIdx + 1]).toBe(25);
    expect(custom.cellRgba[redIdx + 2]).toBe(33);
  });
});
