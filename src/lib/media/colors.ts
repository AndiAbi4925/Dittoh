import type { BackgroundFillOption } from "@/lib/media/types";

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const SHORT_HEX_RE = /^#?([0-9a-fA-F]{3})$/;
const FULL_HEX_RE = /^#?([0-9a-fA-F]{6})$/;

/**
 * Validates and normalizes a user-supplied hex color string into uppercase-safe `#rrggbb`.
 * Returns null if invalid.
 */
export function normalizeHexColor(input: string): string | null {
  const trimmed = input.trim();
  const fullMatch = FULL_HEX_RE.exec(trimmed);
  if (fullMatch && fullMatch[1]) {
    return `#${fullMatch[1].toLowerCase()}`;
  }

  const shortMatch = SHORT_HEX_RE.exec(trimmed);
  if (shortMatch && shortMatch[1]) {
    const [r, g, b] = shortMatch[1].toLowerCase().split("");
    if (r && g && b) {
      return `#${r}${r}${g}${g}${b}${b}`;
    }
  }

  return null;
}

export function isValidHexColor(input: string): boolean {
  return normalizeHexColor(input) !== null;
}

export function parseHexToRgb(hex: string): RgbaColor | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return { r, g, b, a: 255 };
}

/**
 * Resolves the background fill option to a solid RGB color, or null for transparency.
 */
export function resolveBackgroundFill(
  option: BackgroundFillOption
): RgbaColor | null {
  switch (option.mode) {
    case "transparent":
      return null;
    case "black":
      return { r: 0, g: 0, b: 0, a: 255 };
    case "white":
      return { r: 255, g: 255, b: 255, a: 255 };
    case "custom":
      return parseHexToRgb(option.customHex) ?? { r: 0, g: 0, b: 0, a: 255 };
  }
}

/**
 * Composites foreground straight-alpha RGBA pixels over the selected background fill.
 */
export function compositeRgbaBackground(
  foregroundRgba: Uint8ClampedArray,
  fill: BackgroundFillOption
): Uint8ClampedArray {
  const bg = resolveBackgroundFill(fill);
  if (!bg) {
    return new Uint8ClampedArray(foregroundRgba);
  }

  const output = new Uint8ClampedArray(foregroundRgba.length);
  for (let i = 0; i < foregroundRgba.length; i += 4) {
    const fgR = foregroundRgba[i] ?? 0;
    const fgG = foregroundRgba[i + 1] ?? 0;
    const fgB = foregroundRgba[i + 2] ?? 0;
    const fgA = foregroundRgba[i + 3] ?? 255;

    if (fgA === 255) {
      output[i] = fgR;
      output[i + 1] = fgG;
      output[i + 2] = fgB;
      output[i + 3] = 255;
    } else if (fgA === 0) {
      output[i] = bg.r;
      output[i + 1] = bg.g;
      output[i + 2] = bg.b;
      output[i + 3] = 255;
    } else {
      const invA = 255 - fgA;
      output[i] = Math.round((fgR * fgA + bg.r * invA) / 255);
      output[i + 1] = Math.round((fgG * fgA + bg.g * invA) / 255);
      output[i + 2] = Math.round((fgB * fgA + bg.b * invA) / 255);
      output[i + 3] = 255;
    }
  }

  return output;
}
