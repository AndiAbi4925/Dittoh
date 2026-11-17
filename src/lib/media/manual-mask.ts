import type { BackgroundRemovalResult, DecodedImagePayload } from "@/lib/media/types";

export type ManualMaskTool = "wand" | "smart-brush" | "brush";
export type ManualMaskAction = "erase" | "restore";

export interface RgbSeed {
  r: number;
  g: number;
  b: number;
}

export interface MagicWandOptions {
  srcRgba: Uint8ClampedArray;
  alphaMask: Uint8Array;
  width: number;
  height: number;
  seedX: number;
  seedY: number;
  tolerance: number;
  action: ManualMaskAction;
  contiguous?: boolean;
  feather?: boolean;
}

export interface BrushStrokeOptions {
  srcRgba: Uint8ClampedArray;
  alphaMask: Uint8Array;
  width: number;
  height: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  radius: number;
  action: ManualMaskAction;
  smart: boolean;
  tolerance: number;
  seedColor?: RgbSeed;
  targetMaskInPlace?: Uint8Array;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Computes weighted perceptual RGB distance scaled cleanly into [0, 255].
 */
export function computeColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
}

/**
 * Samples an RGB triplet from decoded RGBA image data clamped to valid pixel bounds.
 */
export function samplePixelRgb(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): RgbSeed {
  const px = clamp(Math.round(x), 0, Math.max(0, width - 1));
  const py = clamp(Math.round(y), 0, Math.max(0, height - 1));
  const idx = (py * width + px) * 4;
  return {
    r: rgba[idx] ?? 0,
    g: rgba[idx + 1] ?? 0,
    b: rgba[idx + 2] ?? 0,
  };
}

/**
 * Extracts a starting 0..255 alpha mask matching the decoded source image.
 */
export function createInitialAlphaMask(
  srcRgba: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const pixelCount = Math.max(0, width * height);
  const mask = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    mask[i] = srcRgba[i * 4 + 3] ?? 255;
  }
  return mask;
}

/**
 * Combines source RGB channels with an updated 0..255 alpha mask into foreground RGBA.
 */
export function buildForegroundFromMask(
  srcRgba: Uint8ClampedArray,
  alphaMask: Uint8Array,
  targetRgba?: Uint8ClampedArray
): Uint8ClampedArray {
  const out =
    targetRgba && targetRgba.length === srcRgba.length
      ? targetRgba
      : new Uint8ClampedArray(srcRgba.length);

  if (out !== targetRgba) {
    out.set(srcRgba);
  } else {
    for (let i = 0; i < srcRgba.length; i += 4) {
      out[i] = srcRgba[i] ?? 0;
      out[i + 1] = srcRgba[i + 1] ?? 0;
      out[i + 2] = srcRgba[i + 2] ?? 0;
    }
  }

  const pixelCount = alphaMask.length;
  for (let i = 0; i < pixelCount; i += 1) {
    const srcAlpha = srcRgba[i * 4 + 3] ?? 255;
    const maskAlpha = alphaMask[i] ?? 255;
    out[i * 4 + 3] = Math.min(srcAlpha, maskAlpha);
  }

  return out;
}

/**
 * Packages decoded image metadata + updated alpha mask into a BackgroundRemovalResult.
 */
export function createCutoutFromMask(
  decoded: Pick<DecodedImagePayload, "width" | "height" | "rgba">,
  alphaMask: Uint8Array,
  inferenceMs = 0
): BackgroundRemovalResult {
  const maskCopy = new Uint8Array(alphaMask);
  return {
    width: decoded.width,
    height: decoded.height,
    alphaMask: maskCopy,
    foregroundRgba: buildForegroundFromMask(decoded.rgba, maskCopy),
    inferenceMs,
  };
}

/**
 * Applies a Magic Wand selection from (seedX, seedY) using iterative flood fill
 * or global color matching, erasing or restoring matched pixels with optional soft edges.
 */
export function applyMagicWandMask(options: MagicWandOptions): Uint8Array {
  const {
    srcRgba,
    alphaMask,
    width,
    height,
    seedX,
    seedY,
    tolerance,
    action,
    contiguous = true,
    feather = true,
  } = options;

  const pixelCount = width * height;
  const nextMask = new Uint8Array(alphaMask);
  if (width <= 0 || height <= 0 || pixelCount === 0) {
    return nextMask;
  }

  const sx = clamp(Math.round(seedX), 0, width - 1);
  const sy = clamp(Math.round(seedY), 0, height - 1);
  const seed = samplePixelRgb(srcRgba, width, height, sx, sy);

  const tol = clamp(tolerance, 1, 150);
  const softBand = feather ? Math.max(4, Math.round(tol * 0.28)) : 0;
  const maxDist = tol + softBand;

  const applyStrengthAt = (idx: number, strength: number) => {
    const current = nextMask[idx] ?? 255;
    if (action === "erase") {
      nextMask[idx] = Math.round(current * (1 - strength));
    } else {
      const origAlpha = srcRgba[idx * 4 + 3] ?? 255;
      nextMask[idx] = Math.round(current + (origAlpha - current) * strength);
    }
  };

  if (!contiguous) {
    for (let idx = 0; idx < pixelCount; idx += 1) {
      const rgbaIdx = idx * 4;
      const dist = computeColorDistance(
        srcRgba[rgbaIdx] ?? 0,
        srcRgba[rgbaIdx + 1] ?? 0,
        srcRgba[rgbaIdx + 2] ?? 0,
        seed.r,
        seed.g,
        seed.b
      );
      if (dist <= maxDist) {
        const strength =
          dist <= tol || softBand <= 0 ? 1 : 1 - (dist - tol) / softBand;
        applyStrengthAt(idx, clamp(strength, 0, 1));
      }
    }
    return nextMask;
  }

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const seedIdx = sy * width + sx;
  visited[seedIdx] = 1;
  queue[tail++] = seedIdx;

  while (head < tail) {
    const idx = queue[head++] ?? 0;
    const rgbaIdx = idx * 4;
    const dist = computeColorDistance(
      srcRgba[rgbaIdx] ?? 0,
      srcRgba[rgbaIdx + 1] ?? 0,
      srcRgba[rgbaIdx + 2] ?? 0,
      seed.r,
      seed.g,
      seed.b
    );

    if (dist > maxDist) {
      continue;
    }

    const strength =
      dist <= tol || softBand <= 0 ? 1 : 1 - (dist - tol) / softBand;
    applyStrengthAt(idx, clamp(strength, 0, 1));

    // Only expand flood fill from strongly matched interior pixels so soft fringes don't bleed.
    if (dist > tol) {
      continue;
    }

    const px = idx % width;
    const py = (idx - px) / width;

    if (px > 0) {
      const left = idx - 1;
      if (!visited[left]) {
        visited[left] = 1;
        queue[tail++] = left;
      }
    }
    if (px + 1 < width) {
      const right = idx + 1;
      if (!visited[right]) {
        visited[right] = 1;
        queue[tail++] = right;
      }
    }
    if (py > 0) {
      const up = idx - width;
      if (!visited[up]) {
        visited[up] = 1;
        queue[tail++] = up;
      }
    }
    if (py + 1 < height) {
      const down = idx + width;
      if (!visited[down]) {
        visited[down] = 1;
        queue[tail++] = down;
      }
    }
  }

  return nextMask;
}

/**
 * Applies a continuous brush stroke segment (x0,y0) -> (x1,y1).
 * In smart mode, restricts modification to pixels whose color stays within tolerance
 * of seedColor so contrasting subject boundaries stay protected.
 */
export function applyBrushMask(options: BrushStrokeOptions): Uint8Array {
  const {
    srcRgba,
    alphaMask,
    width,
    height,
    x0,
    y0,
    x1,
    y1,
    radius,
    action,
    smart,
    tolerance,
    seedColor,
    targetMaskInPlace,
  } = options;

  const nextMask = targetMaskInPlace ?? new Uint8Array(alphaMask);
  if (width <= 0 || height <= 0 || radius <= 0) {
    return nextMask;
  }

  const r = clamp(radius, 1, 200);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distTotal = Math.hypot(dx, dy);
  const stepDist = Math.max(1, r * 0.3);
  const steps = Math.max(1, Math.ceil(distTotal / stepDist));

  const tol = clamp(tolerance, 2, 150);
  const colorSoftBand = Math.max(6, Math.round(tol * 0.35));
  const effectiveSeed =
    seedColor ?? samplePixelRgb(srcRgba, width, height, x0, y0);

  const innerRadius = r * 0.65;
  const featherSpan = Math.max(0.5, r - innerRadius);

  for (let s = 0; s <= steps; s += 1) {
    const t = steps === 0 ? 0 : s / steps;
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;

    const minX = clamp(Math.floor(cx - r), 0, width - 1);
    const maxX = clamp(Math.ceil(cx + r), 0, width - 1);
    const minY = clamp(Math.floor(cy - r), 0, height - 1);
    const maxY = clamp(Math.ceil(cy + r), 0, height - 1);

    for (let py = minY; py <= maxY; py += 1) {
      const rowBase = py * width;
      const offY = py - cy;
      for (let px = minX; px <= maxX; px += 1) {
        const offX = px - cx;
        const radial = Math.hypot(offX, offY);
        if (radial > r) {
          continue;
        }

        const radialStrength =
          radial <= innerRadius ? 1 : 1 - (radial - innerRadius) / featherSpan;

        let colorStrength = 1;
        const idx = rowBase + px;
        if (smart) {
          const rgbaIdx = idx * 4;
          const colorDist = computeColorDistance(
            srcRgba[rgbaIdx] ?? 0,
            srcRgba[rgbaIdx + 1] ?? 0,
            srcRgba[rgbaIdx + 2] ?? 0,
            effectiveSeed.r,
            effectiveSeed.g,
            effectiveSeed.b
          );
          if (colorDist > tol + colorSoftBand) {
            continue;
          }
          colorStrength =
            colorDist <= tol ? 1 : 1 - (colorDist - tol) / colorSoftBand;
        }

        const strength = clamp(radialStrength * colorStrength, 0, 1);
        if (strength <= 0) {
          continue;
        }

        const current = nextMask[idx] ?? 255;
        if (action === "erase") {
          const candidate = Math.round(current * (1 - strength));
          if (candidate < current) {
            nextMask[idx] = candidate;
          }
        } else {
          const origAlpha = srcRgba[idx * 4 + 3] ?? 255;
          const candidate = Math.round(current + (origAlpha - current) * strength);
          if (candidate > current) {
            nextMask[idx] = candidate;
          }
        }
      }
    }
  }

  return nextMask;
}

/**
 * Inverts a 0..255 cutout alpha mask while respecting original transparent pixels.
 */
export function invertAlphaMask(
  srcRgba: Uint8ClampedArray,
  alphaMask: Uint8Array
): Uint8Array {
  const out = new Uint8Array(alphaMask.length);
  for (let i = 0; i < alphaMask.length; i += 1) {
    const origAlpha = srcRgba[i * 4 + 3] ?? 255;
    const inverted = 255 - (alphaMask[i] ?? 255);
    out[i] = Math.min(origAlpha, inverted);
  }
  return out;
}
