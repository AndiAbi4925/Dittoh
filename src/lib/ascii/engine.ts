import { resolvePresetRamp } from "@/lib/ascii/presets";
import type { AsciiConversionSettings, AsciiGridResult } from "@/lib/ascii/types";
import { normalizeHexColor, parseHexToRgb } from "@/lib/media/colors";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeAsciiRows(
  srcWidth: number,
  srcHeight: number,
  columns: number,
  aspectRatioCorrection: number
): number {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return 1;
  }
  const safeColumns = clamp(Math.round(columns), 8, 300);
  const safeAspect = clamp(aspectRatioCorrection, 0.25, 1.5);
  const rows = Math.round((srcHeight / srcWidth) * safeColumns * safeAspect);
  return clamp(rows, 1, 480);
}

export function applyTonalAdjustments(
  luminance01: number,
  brightness: number,
  contrast: number,
  gamma: number
): number {
  let value = clamp(luminance01, 0, 1);

  const safeBrightness = clamp(brightness, -100, 100);
  if (safeBrightness !== 0) {
    value = clamp(value + safeBrightness / 100, 0, 1);
  }

  const safeContrast = clamp(contrast, -100, 100);
  if (safeContrast !== 0) {
    const c = safeContrast * 2.55;
    const factor = (259 * (c + 255)) / (255 * (259 - c));
    value = clamp(factor * (value - 0.5) + 0.5, 0, 1);
  }

  const safeGamma = clamp(gamma, 0.25, 3.0);
  if (Math.abs(safeGamma - 1) > 1e-4) {
    value = clamp(Math.pow(value, 1 / safeGamma), 0, 1);
  }

  return value;
}

/**
 * Converts an RGBA bitmap buffer into an aligned character grid and packed per-cell RGBA colors.
 */
export function convertRgbaToAsciiGrid(
  rgba: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  settings: AsciiConversionSettings
): AsciiGridResult {
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error("Image dimensions must be positive for ASCII conversion.");
  }

  const columns = clamp(Math.round(settings.columns), 8, 300);
  const rows = computeAsciiRows(
    srcWidth,
    srcHeight,
    columns,
    settings.aspectRatioCorrection
  );
  const ramp = resolvePresetRamp(settings.presetId, settings.customCharacters);
  const rampMaxIndex = ramp.length - 1;
  const alphaThreshold = clamp(Math.round(settings.alphaThreshold), 0, 254);

  const monochromeFgHex = "#000000";
  const customFgHex = normalizeHexColor(settings.customForegroundHex) ?? "#000000";
  const customBgHex = normalizeHexColor(settings.customBackgroundHex) ?? "#ffffff";

  const backgroundColorHex = settings.transparentBackground
    ? null
    : settings.colorMode === "monochrome"
      ? "#ffffff"
      : customBgHex;

  const defaultForegroundHex =
    settings.colorMode === "custom" ? customFgHex : monochromeFgHex;

  const customFgRgb = parseHexToRgb(customFgHex) ?? { r: 0, g: 0, b: 0, a: 255 };
  const bgRgb = backgroundColorHex ? parseHexToRgb(backgroundColorHex) : null;
  const bgLuminance = bgRgb
    ? (0.2126 * bgRgb.r + 0.7152 * bgRgb.g + 0.0722 * bgRgb.b) / 255
    : 1.0;
  const darkBackground = !settings.transparentBackground && bgLuminance < 0.45;

  const cellRgba = new Uint8ClampedArray(columns * rows * 4);
  const lines: string[] = new Array<string>(rows);

  const ditherEnabled = Boolean(settings.dithering);
  let errorRow = ditherEnabled ? new Float32Array(columns) : null;
  let nextErrorRow = ditherEnabled ? new Float32Array(columns) : null;

  const cellWidth = srcWidth / columns;
  const cellHeight = srcHeight / rows;

  for (let row = 0; row < rows; row += 1) {
    const yStart = clamp(Math.floor(row * cellHeight), 0, srcHeight - 1);
    const yEnd = clamp(Math.ceil((row + 1) * cellHeight), yStart + 1, srcHeight);
    const rowChars = new Array<string>(columns);
    if (nextErrorRow) {
      nextErrorRow.fill(0);
    }

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

      const avgAlpha = pixelCount > 0 ? sumA / pixelCount : 0;
      const cellIdx = (row * columns + col) * 4;

      if (avgAlpha < alphaThreshold || weightTotal <= 0) {
        rowChars[col] = " ";
        cellRgba[cellIdx] = 0;
        cellRgba[cellIdx + 1] = 0;
        cellRgba[cellIdx + 2] = 0;
        cellRgba[cellIdx + 3] = 0;
        continue;
      }

      const r = Math.round(weightedR / weightTotal);
      const g = Math.round(weightedG / weightTotal);
      const b = Math.round(weightedB / weightTotal);

      const rawLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const adjustedLum = applyTonalAdjustments(
        rawLum,
        settings.brightness,
        settings.contrast,
        settings.gamma
      );

      let densityTone = darkBackground ? adjustedLum : 1 - adjustedLum;
      if (settings.invert) {
        densityTone = 1 - densityTone;
      }

      let targetTone = densityTone;
      if (errorRow && nextErrorRow) {
        targetTone = clamp(densityTone + (errorRow[col] ?? 0), 0, 1);
      }

      const rampIndex = clamp(Math.round(targetTone * rampMaxIndex), 0, rampMaxIndex);
      rowChars[col] = ramp[rampIndex] ?? " ";

      if (errorRow && nextErrorRow) {
        const quantizedTone = rampMaxIndex > 0 ? rampIndex / rampMaxIndex : 0;
        const quantError = targetTone - quantizedTone;
        if (col + 1 < columns) {
          errorRow[col + 1] = (errorRow[col + 1] ?? 0) + quantError * (7 / 16);
        }
        if (row + 1 < rows) {
          if (col > 0) {
            nextErrorRow[col - 1] =
              (nextErrorRow[col - 1] ?? 0) + quantError * (3 / 16);
          }
          nextErrorRow[col] = (nextErrorRow[col] ?? 0) + quantError * (5 / 16);
          if (col + 1 < columns) {
            nextErrorRow[col + 1] =
              (nextErrorRow[col + 1] ?? 0) + quantError * (1 / 16);
          }
        }
      }

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
    if (errorRow && nextErrorRow) {
      [errorRow, nextErrorRow] = [nextErrorRow, errorRow];
    }
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
