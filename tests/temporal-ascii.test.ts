import { describe, expect, it } from "vitest";
import { DEFAULT_ASCII_SETTINGS, resolvePresetRamp } from "@/lib/ascii/presets";
import {
  blitAsciiGridToRgbaFrame,
  buildGlyphAlphaAtlas,
  convertVideoFrameToAsciiGrid,
  createTemporalAsciiState,
} from "@/lib/video/temporal-ascii";
import { DEFAULT_FRAME_CONSISTENCY } from "@/lib/video/validation";

function makeGradientFrame(
  width: number,
  height: number,
  offset = 0,
  scale = 1
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const base = Math.round(((x / Math.max(1, width - 1)) * 220 * scale) + offset);
      const v = Math.max(0, Math.min(255, base));
      rgba[idx] = v;
      rgba[idx + 1] = v;
      rgba[idx + 2] = v;
      rgba[idx + 3] = 255;
    }
  }
  return rgba;
}

describe("Temporal ASCII frame consistency and glyph atlas blitter", () => {
  it("suppresses minor frame-to-frame luminance noise using temporal smoothing and hysteresis", () => {
    const settings = { ...DEFAULT_ASCII_SETTINGS, columns: 32 };
    const state = createTemporalAsciiState();
    const frameA = makeGradientFrame(64, 36, 16, 1);
    const frameNoisy = makeGradientFrame(64, 36, 18, 1);

    const gridA = convertVideoFrameToAsciiGrid(
      frameA,
      64,
      36,
      settings,
      {
        temporalSmoothing: 0.6,
        hysteresisThreshold: 0.05,
        luminanceMode: "locked-first-frame",
        paletteMode: "locked-palette",
      },
      state
    );

    const gridB = convertVideoFrameToAsciiGrid(
      frameNoisy,
      64,
      36,
      settings,
      {
        temporalSmoothing: 0.6,
        hysteresisThreshold: 0.05,
        luminanceMode: "locked-first-frame",
        paletteMode: "locked-palette",
      },
      state
    );

    expect(gridB.lines).toEqual(gridA.lines);
  });

  it("preserves darkened frame tone under locked-first-frame luminance anchoring", () => {
    const settings = { ...DEFAULT_ASCII_SETTINGS, columns: 24, presetId: "detailed" as const };
    const lockedState = createTemporalAsciiState();

    const brightFrame = makeGradientFrame(48, 28, 20, 1);
    const dimmedFrame = makeGradientFrame(48, 28, 0, 0.35);

    const brightGrid = convertVideoFrameToAsciiGrid(
      brightFrame,
      48,
      28,
      settings,
      {
        ...DEFAULT_FRAME_CONSISTENCY,
        temporalSmoothing: 0,
        hysteresisThreshold: 0,
        luminanceMode: "locked-first-frame",
      },
      lockedState
    );

    const dimmedGrid = convertVideoFrameToAsciiGrid(
      dimmedFrame,
      48,
      28,
      settings,
      {
        ...DEFAULT_FRAME_CONSISTENCY,
        temporalSmoothing: 0,
        hysteresisThreshold: 0,
        luminanceMode: "locked-first-frame",
      },
      lockedState
    );

    // Last character of row (right edge) should change from dense glyph in bright frame
    // to noticeably lighter/sparser glyph when overall scene dims.
    const lastBrightChar = brightGrid.lines[0]?.at(-1);
    const lastDimChar = dimmedGrid.lines[0]?.at(-1);
    expect(lastBrightChar).toBeDefined();
    expect(lastDimChar).toBeDefined();
    expect(lastDimChar).not.toBe(lastBrightChar);
  });

  it("rasterizes an ASCII grid onto an output RGBA frame buffer using GlyphAlphaAtlas", () => {
    const settings = { ...DEFAULT_ASCII_SETTINGS, columns: 20 };
    const state = createTemporalAsciiState();
    const frame = makeGradientFrame(40, 24, 30, 1);
    const grid = convertVideoFrameToAsciiGrid(
      frame,
      40,
      24,
      settings,
      DEFAULT_FRAME_CONSISTENCY,
      state
    );

    const outW = 160;
    const outH = 96;
    const cellW = Math.floor(outW / grid.columns);
    const cellH = Math.floor(outH / grid.rows);
    const ramp = resolvePresetRamp(settings.presetId, settings.customCharacters);
    const atlas = buildGlyphAlphaAtlas(ramp, cellW, cellH);

    const outRgba = new Uint8ClampedArray(outW * outH * 4);
    blitAsciiGridToRgbaFrame(grid, atlas, outW, outH, outRgba);

    let nonBgPixels = 0;
    for (let i = 0; i < outRgba.length; i += 4) {
      if ((outRgba[i] ?? 0) > 10 || (outRgba[i + 1] ?? 0) > 10 || (outRgba[i + 2] ?? 0) > 10) {
        nonBgPixels += 1;
      }
      expect(outRgba[i + 3]).toBe(255);
    }

    expect(nonBgPixels).toBeGreaterThan(50);
  });
});
