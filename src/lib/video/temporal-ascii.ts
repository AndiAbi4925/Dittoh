import {
  applyTonalAdjustments,
  computeAsciiRows,
} from "@/lib/ascii/engine";
import { resolvePresetRamp } from "@/lib/ascii/presets";
import type { AsciiConversionSettings, AsciiGridResult } from "@/lib/ascii/types";
import { normalizeHexColor, parseHexToRgb } from "@/lib/media/colors";
import type { FrameConsistencyConfig } from "@/lib/video/types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface TemporalAsciiState {
  columns: number;
  rows: number;
  prevLuminances: Float32Array | null;
  prevRampIndices: Int16Array | null;
  prevColors: Float32Array | null;
  lockedRange: { minLum: number; maxLum: number } | null;
}

export function createTemporalAsciiState(): TemporalAsciiState {
  return {
    columns: 0,
    rows: 0,
    prevLuminances: null,
    prevRampIndices: null,
    prevColors: null,
    lockedRange: null,
  };
}

function measureLuminanceRange(
  rgba: Uint8ClampedArray
): { minLum: number; maxLum: number } {
  let minLum = 1;
  let maxLum = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] ?? 255;
    if (a < 20) continue;
    const lum =
      (0.2126 * (rgba[i] ?? 0) +
        0.7152 * (rgba[i + 1] ?? 0) +
        0.0722 * (rgba[i + 2] ?? 0)) /
      255;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  if (maxLum - minLum < 0.08) {
    return { minLum: 0, maxLum: 1 };
  }
  return { minLum, maxLum };
}

/**
 * Converts a video frame into an ASCII grid while applying temporal luminance smoothing,
 * locked frame contrast anchoring, and glyph hysteresis to prevent flicker between frames.
 */
export function convertVideoFrameToAsciiGrid(
  rgba: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  settings: AsciiConversionSettings,
  consistency: FrameConsistencyConfig,
  state: TemporalAsciiState
): AsciiGridResult {
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error("Video frame dimensions must be positive.");
  }

  const columns = clamp(Math.round(settings.columns), 8, 220);
  const rows = computeAsciiRows(
    srcWidth,
    srcHeight,
    columns,
    settings.aspectRatioCorrection
  );
  const totalCells = columns * rows;

  if (state.columns !== columns || state.rows !== rows) {
    state.columns = columns;
    state.rows = rows;
    state.prevLuminances = new Float32Array(totalCells);
    state.prevRampIndices = new Int16Array(totalCells).fill(-1);
    state.prevColors = new Float32Array(totalCells * 3);
    state.lockedRange = null;
  }

  if (
    consistency.luminanceMode === "locked-first-frame" &&
    state.lockedRange === null
  ) {
    state.lockedRange = measureLuminanceRange(rgba);
  }

  const range =
    consistency.luminanceMode === "locked-first-frame"
      ? (state.lockedRange ?? { minLum: 0, maxLum: 1 })
      : { minLum: 0, maxLum: 1 };
  const rangeSpan = Math.max(0.08, range.maxLum - range.minLum);

  const ramp = resolvePresetRamp(settings.presetId, settings.customCharacters);
  const rampMaxIndex = ramp.length - 1;
  const alphaThreshold = clamp(Math.round(settings.alphaThreshold), 0, 254);

  const customFgHex =
    normalizeHexColor(settings.customForegroundHex) ?? "#000000";
  const customBgHex =
    normalizeHexColor(settings.customBackgroundHex) ?? "#ffffff";
  const backgroundColorHex = settings.transparentBackground
    ? "#000000"
    : settings.colorMode === "monochrome"
      ? "#ffffff"
      : customBgHex;
  const defaultForegroundHex =
    settings.colorMode === "custom" ? customFgHex : "#000000";

  const customFgRgb = parseHexToRgb(customFgHex) ?? { r: 0, g: 0, b: 0, a: 255 };
  const bgRgb = parseHexToRgb(backgroundColorHex) ?? {
    r: 255,
    g: 255,
    b: 255,
    a: 255,
  };
  const bgLuminance =
    (0.2126 * bgRgb.r + 0.7152 * bgRgb.g + 0.0722 * bgRgb.b) / 255;
  const darkBackground = bgLuminance < 0.45;

  const smoothing = clamp(consistency.temporalSmoothing, 0, 0.8);
  const hysteresis = clamp(consistency.hysteresisThreshold, 0, 0.15);
  const hasPrevFrame =
    state.prevRampIndices !== null && state.prevRampIndices[0] !== -1;

  const cellRgba = new Uint8ClampedArray(totalCells * 4);
  const lines: string[] = new Array<string>(rows);
  const cellWidth = srcWidth / columns;
  const cellHeight = srcHeight / rows;

  for (let row = 0; row < rows; row += 1) {
    const yStart = clamp(Math.floor(row * cellHeight), 0, srcHeight - 1);
    const yEnd = clamp(Math.ceil((row + 1) * cellHeight), yStart + 1, srcHeight);
    const rowChars = new Array<string>(columns);

    for (let col = 0; col < columns; col += 1) {
      const xStart = clamp(Math.floor(col * cellWidth), 0, srcWidth - 1);
      const xEnd = clamp(Math.ceil((col + 1) * cellWidth), xStart + 1, srcWidth);

      let sumA = 0;
      let weightedR = 0;
      let weightedG = 0;
      let weightedB = 0;
      let weightTotal = 0;
      let pixelCount = 0;

      for (let py = yStart; py < yEnd; py += 1) {
        const rowBase = py * srcWidth;
        for (let px = xStart; px < xEnd; px += 1) {
          const idx = (rowBase + px) * 4;
          const a = rgba[idx + 3] ?? 255;
          sumA += a;
          pixelCount += 1;
          if (a > 0) {
            const w = a / 255;
            weightedR += (rgba[idx] ?? 0) * w;
            weightedG += (rgba[idx + 1] ?? 0) * w;
            weightedB += (rgba[idx + 2] ?? 0) * w;
            weightTotal += w;
          }
        }
      }

      const cellFlatIdx = row * columns + col;
      const cellIdx = cellFlatIdx * 4;
      const avgAlpha = pixelCount > 0 ? sumA / pixelCount : 0;

      if (avgAlpha < alphaThreshold || weightTotal <= 0) {
        rowChars[col] = " ";
        cellRgba[cellIdx] = 0;
        cellRgba[cellIdx + 1] = 0;
        cellRgba[cellIdx + 2] = 0;
        cellRgba[cellIdx + 3] = 0;
        if (state.prevRampIndices) {
          state.prevRampIndices[cellFlatIdx] = 0;
        }
        continue;
      }

      const rawR = weightedR / weightTotal;
      const rawG = weightedG / weightTotal;
      const rawB = weightedB / weightTotal;

      const colorBase = cellFlatIdx * 3;
      let r = Math.round(rawR);
      let g = Math.round(rawG);
      let b = Math.round(rawB);
      if (state.prevColors && hasPrevFrame && smoothing > 0) {
        const prevR = state.prevColors[colorBase] ?? rawR;
        const prevG = state.prevColors[colorBase + 1] ?? rawG;
        const prevB = state.prevColors[colorBase + 2] ?? rawB;
        r = Math.round((1 - smoothing) * rawR + smoothing * prevR);
        g = Math.round((1 - smoothing) * rawG + smoothing * prevG);
        b = Math.round((1 - smoothing) * rawB + smoothing * prevB);
      }
      if (state.prevColors) {
        state.prevColors[colorBase] = r;
        state.prevColors[colorBase + 1] = g;
        state.prevColors[colorBase + 2] = b;
      }

      const rawLum = (0.2126 * rawR + 0.7152 * rawG + 0.0722 * rawB) / 255;
      const anchoredLum =
        consistency.luminanceMode === "locked-first-frame"
          ? clamp((rawLum - range.minLum) / rangeSpan, 0, 1)
          : rawLum;

      const adjustedLum = applyTonalAdjustments(
        anchoredLum,
        settings.brightness,
        settings.contrast,
        settings.gamma
      );

      let densityTone = darkBackground ? adjustedLum : 1 - adjustedLum;
      if (settings.invert) {
        densityTone = 1 - densityTone;
      }

      if (state.prevLuminances && hasPrevFrame && smoothing > 0) {
        const prevTone = state.prevLuminances[cellFlatIdx] ?? densityTone;
        densityTone = (1 - smoothing) * densityTone + smoothing * prevTone;
      }
      if (state.prevLuminances) {
        state.prevLuminances[cellFlatIdx] = densityTone;
      }

      let rampIndex = clamp(
        Math.round(densityTone * rampMaxIndex),
        0,
        rampMaxIndex
      );

      if (state.prevRampIndices && hasPrevFrame && hysteresis > 0 && rampMaxIndex > 0) {
        const prevIndex = state.prevRampIndices[cellFlatIdx] ?? -1;
        if (prevIndex >= 0 && prevIndex <= rampMaxIndex && prevIndex !== rampIndex) {
          const prevToneCenter = prevIndex / rampMaxIndex;
          if (Math.abs(densityTone - prevToneCenter) < hysteresis) {
            rampIndex = prevIndex;
          }
        }
      }

      if (state.prevRampIndices) {
        state.prevRampIndices[cellFlatIdx] = rampIndex;
      }

      rowChars[col] = ramp[rampIndex] ?? " ";

      if (settings.colorMode === "original") {
        cellRgba[cellIdx] = r;
        cellRgba[cellIdx + 1] = g;
        cellRgba[cellIdx + 2] = b;
      } else if (settings.colorMode === "custom") {
        cellRgba[cellIdx] = customFgRgb.r;
        cellRgba[cellIdx + 1] = customFgRgb.g;
        cellRgba[cellIdx + 2] = customFgRgb.b;
      } else {
        cellRgba[cellIdx] = 0;
        cellRgba[cellIdx + 1] = 0;
        cellRgba[cellIdx + 2] = 0;
      }
      cellRgba[cellIdx + 3] = 255;
    }

    lines[row] = rowChars.join("");
  }

  const endedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    columns,
    rows,
    lines,
    cellRgba,
    backgroundColorHex,
    defaultForegroundHex,
    renderMs: Math.max(1, Math.round(endedAt - startedAt)),
  };
}

export interface GlyphAlphaAtlas {
  cellWidthPx: number;
  cellHeightPx: number;
  getGlyphAlpha(ch: string): Uint8Array;
}

/**
 * Renders each unique ASCII glyph once onto a scratch 2D canvas and caches its alpha mask
 * so hundreds of video frames can blit crisp text at high speed without repeated fillText calls.
 */
export function buildGlyphAlphaAtlas(
  rampChars: readonly string[] | string,
  cellWidthPx: number,
  cellHeightPx: number
): GlyphAlphaAtlas {
  const safeW = Math.max(4, Math.round(cellWidthPx));
  const safeH = Math.max(6, Math.round(cellHeightPx));
  const cache = new Map<string, Uint8Array>();

  const charsList =
    typeof rampChars === "string" ? Array.from(rampChars) : rampChars;
  const uniqueChars = new Set<string>([" ", ...charsList]);

  let scratchCtx: CanvasRenderingContext2D | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = safeW;
    canvas.height = safeH;
    scratchCtx = canvas.getContext("2d", { willReadFrequently: true });
  }

  const rasterizeChar = (ch: string): Uint8Array => {
    const mask = new Uint8Array(safeW * safeH);
    if (ch === " ") {
      return mask;
    }

    if (scratchCtx) {
      scratchCtx.clearRect(0, 0, safeW, safeH);
      scratchCtx.font = `500 ${Math.max(6, Math.floor(safeH * 0.86))}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      scratchCtx.textAlign = "center";
      scratchCtx.textBaseline = "middle";
      scratchCtx.fillStyle = "#ffffff";
      scratchCtx.fillText(ch, safeW * 0.5, safeH * 0.54);
      const img = scratchCtx.getImageData(0, 0, safeW, safeH).data;
      for (let i = 0; i < mask.length; i += 1) {
        mask[i] = img[i * 4 + 3] ?? 0;
      }
      return mask;
    }

    // Headless Node fallback bitmap proportional to character luminance density
    const code = ch.charCodeAt(0);
    const padX = Math.max(1, Math.floor(safeW * 0.2));
    const padY = Math.max(1, Math.floor(safeH * 0.2));
    const fillVal = Math.min(255, 110 + (code % 145));
    for (let y = padY; y < safeH - padY; y += 1) {
      for (let x = padX; x < safeW - padX; x += 1) {
        mask[y * safeW + x] = fillVal;
      }
    }
    return mask;
  };

  for (const ch of uniqueChars) {
    cache.set(ch, rasterizeChar(ch));
  }

  return {
    cellWidthPx: safeW,
    cellHeightPx: safeH,
    getGlyphAlpha(ch: string): Uint8Array {
      const existing = cache.get(ch);
      if (existing) {
        return existing;
      }
      const generated = rasterizeChar(ch);
      cache.set(ch, generated);
      return generated;
    },
  };
}

/**
 * Blits an AsciiGridResult into a preallocated RGBA output buffer of targetWidth x targetHeight
 * using the pre-baked glyph alpha atlas for fast video frame serialization.
 */
export function blitAsciiGridToRgbaFrame(
  grid: AsciiGridResult,
  atlas: GlyphAlphaAtlas,
  targetWidth: number,
  targetHeight: number,
  outRgba: Uint8ClampedArray
): void {
  const bg = parseHexToRgb(grid.backgroundColorHex ?? "#000000") ?? {
    r: 0,
    g: 0,
    b: 0,
    a: 255,
  };

  // Fill solid background cleanly across entire target frame
  for (let i = 0; i < outRgba.length; i += 4) {
    outRgba[i] = bg.r;
    outRgba[i + 1] = bg.g;
    outRgba[i + 2] = bg.b;
    outRgba[i + 3] = 255;
  }

  const gridPixelW = grid.columns * atlas.cellWidthPx;
  const gridPixelH = grid.rows * atlas.cellHeightPx;
  const offsetX = Math.max(0, Math.floor((targetWidth - gridPixelW) / 2));
  const offsetY = Math.max(0, Math.floor((targetHeight - gridPixelH) / 2));

  for (let row = 0; row < grid.rows; row += 1) {
    const rowChars = Array.from(grid.lines[row] ?? "");
    const dstYBase = offsetY + row * atlas.cellHeightPx;
    if (dstYBase >= targetHeight) break;

    for (let col = 0; col < grid.columns; col += 1) {
      const ch = rowChars[col] ?? " ";
      if (ch === " ") continue;

      const cellIdx = (row * grid.columns + col) * 4;
      const cellAlpha = grid.cellRgba[cellIdx + 3] ?? 255;
      if (cellAlpha === 0) continue;

      const fgR = grid.cellRgba[cellIdx] ?? 0;
      const fgG = grid.cellRgba[cellIdx + 1] ?? 0;
      const fgB = grid.cellRgba[cellIdx + 2] ?? 0;
      const mask = atlas.getGlyphAlpha(ch);
      const dstXBase = offsetX + col * atlas.cellWidthPx;

      for (let gy = 0; gy < atlas.cellHeightPx; gy += 1) {
        const py = dstYBase + gy;
        if (py < 0 || py >= targetHeight) continue;
        const rowPixelOffset = py * targetWidth;
        const glyphRowOffset = gy * atlas.cellWidthPx;

        for (let gx = 0; gx < atlas.cellWidthPx; gx += 1) {
          const px = dstXBase + gx;
          if (px < 0 || px >= targetWidth) continue;
          const alphaByte = mask[glyphRowOffset + gx] ?? 0;
          if (alphaByte === 0) continue;

          const outIdx = (rowPixelOffset + px) * 4;
          if (alphaByte === 255) {
            outRgba[outIdx] = fgR;
            outRgba[outIdx + 1] = fgG;
            outRgba[outIdx + 2] = fgB;
          } else {
            const a = alphaByte / 255;
            const invA = 1 - a;
            outRgba[outIdx] = Math.round(fgR * a + (outRgba[outIdx] ?? bg.r) * invA);
            outRgba[outIdx + 1] = Math.round(
              fgG * a + (outRgba[outIdx + 1] ?? bg.g) * invA
            );
            outRgba[outIdx + 2] = Math.round(
              fgB * a + (outRgba[outIdx + 2] ?? bg.b) * invA
            );
          }
        }
      }
    }
  }
}
