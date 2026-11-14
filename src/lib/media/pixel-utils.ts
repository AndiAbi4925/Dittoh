export const DEFAULT_MAX_WORKING_DIMENSION = 2048;
export const MOBILE_MAX_WORKING_DIMENSION = 1280;

export interface WorkingDimensions {
  width: number;
  height: number;
  wasDownsampled: boolean;
}

export function computeWorkingDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number = DEFAULT_MAX_WORKING_DIMENSION
): WorkingDimensions {
  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error("Image dimensions must be positive integers.");
  }

  const longestEdge = Math.max(srcWidth, srcHeight);
  if (longestEdge <= maxDimension) {
    return {
      width: srcWidth,
      height: srcHeight,
      wasDownsampled: false,
    };
  }

  const scale = maxDimension / longestEdge;
  return {
    width: Math.max(1, Math.round(srcWidth * scale)),
    height: Math.max(1, Math.round(srcHeight * scale)),
    wasDownsampled: true,
  };
}

/**
 * Pure bilinear RGBA downsampler for worker and Node environments without requiring DOM Canvas.
 */
export function downsampleRgbaBilinear(
  src: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Uint8ClampedArray {
  if (srcWidth === dstWidth && srcHeight === dstHeight) {
    return new Uint8ClampedArray(src);
  }

  const dst = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;

  for (let y = 0; y < dstHeight; y += 1) {
    const srcY = Math.min(srcHeight - 1, (y + 0.5) * scaleY - 0.5);
    const y0 = Math.max(0, Math.floor(srcY));
    const y1 = Math.min(srcHeight - 1, y0 + 1);
    const fy = Math.max(0, srcY - y0);

    for (let x = 0; x < dstWidth; x += 1) {
      const srcX = Math.min(srcWidth - 1, (x + 0.5) * scaleX - 0.5);
      const x0 = Math.max(0, Math.floor(srcX));
      const x1 = Math.min(srcWidth - 1, x0 + 1);
      const fx = Math.max(0, srcX - x0);

      const i00 = (y0 * srcWidth + x0) * 4;
      const i10 = (y0 * srcWidth + x1) * 4;
      const i01 = (y1 * srcWidth + x0) * 4;
      const i11 = (y1 * srcWidth + x1) * 4;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const outIdx = (y * dstWidth + x) * 4;
      for (let c = 0; c < 4; c += 1) {
        dst[outIdx + c] = Math.round(
          (src[i00 + c] ?? 0) * w00 +
            (src[i10 + c] ?? 0) * w10 +
            (src[i01 + c] ?? 0) * w01 +
            (src[i11 + c] ?? 0) * w11
        );
      }
    }
  }

  return dst;
}

/**
 * Converts LibRaw interleaved RGB/RGBA (8-bit or 16-bit) samples into 8-bit RGBA.
 */
export function convertRawSamplesToRgba(
  samples: Uint8Array | Uint16Array | Uint8ClampedArray,
  width: number,
  height: number,
  channels: number
): Uint8ClampedArray {
  const pixelCount = width * height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);
  const is16Bit = samples instanceof Uint16Array;

  for (let i = 0; i < pixelCount; i += 1) {
    const srcBase = i * channels;
    const dstBase = i * 4;

    if (channels === 1) {
      const gray = scaleSample(samples[srcBase] ?? 0, is16Bit);
      rgba[dstBase] = gray;
      rgba[dstBase + 1] = gray;
      rgba[dstBase + 2] = gray;
      rgba[dstBase + 3] = 255;
    } else {
      rgba[dstBase] = scaleSample(samples[srcBase] ?? 0, is16Bit);
      rgba[dstBase + 1] = scaleSample(samples[srcBase + 1] ?? 0, is16Bit);
      rgba[dstBase + 2] = scaleSample(samples[srcBase + 2] ?? 0, is16Bit);
      rgba[dstBase + 3] =
        channels >= 4 ? scaleSample(samples[srcBase + 3] ?? 255, is16Bit) : 255;
    }
  }

  return rgba;
}

function scaleSample(value: number, is16Bit: boolean): number {
  if (!is16Bit) {
    return value & 0xff;
  }
  return Math.min(255, value >> 8);
}

export function downscaleRgbaIfNeeded(
  rgba: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  maxDimension: number = DEFAULT_MAX_WORKING_DIMENSION
): {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  wasDownsampled: boolean;
} {
  const target = computeWorkingDimensions(srcWidth, srcHeight, maxDimension);
  if (!target.wasDownsampled) {
    return {
      rgba,
      width: srcWidth,
      height: srcHeight,
      wasDownsampled: false,
    };
  }

  return {
    rgba: downsampleRgbaBilinear(rgba, srcWidth, srcHeight, target.width, target.height),
    width: target.width,
    height: target.height,
    wasDownsampled: true,
  };
}
