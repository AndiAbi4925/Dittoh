export const U2NET_INPUT_SIZE = 320;

const IMAGENET_MEAN = [0.485, 0.456, 0.406] as const;
const IMAGENET_STD = [0.229, 0.224, 0.225] as const;

export interface U2NetPreparedInput {
  tensorData: Float32Array;
  width: number;
  height: number;
  resizedW: number;
  resizedH: number;
  padX: number;
  padY: number;
  srcWidth: number;
  srcHeight: number;
}

export interface U2NetPostprocessOutput {
  alphaMask: Uint8Array;
  foregroundRgba: Uint8ClampedArray;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function sampleRgbaChannelBilinear(
  rgba: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  sx: number,
  sy: number
): [number, number, number] {
  const x0 = clamp(Math.floor(sx), 0, srcWidth - 1);
  const y0 = clamp(Math.floor(sy), 0, srcHeight - 1);
  const x1 = Math.min(srcWidth - 1, x0 + 1);
  const y1 = Math.min(srcHeight - 1, y0 + 1);
  const fx = clamp(sx - x0, 0, 1);
  const fy = clamp(sy - y0, 0, 1);

  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;

  const i00 = (y0 * srcWidth + x0) * 4;
  const i10 = (y0 * srcWidth + x1) * 4;
  const i01 = (y1 * srcWidth + x0) * 4;
  const i11 = (y1 * srcWidth + x1) * 4;

  const a00 = (rgba[i00 + 3] ?? 255) / 255;
  const a10 = (rgba[i10 + 3] ?? 255) / 255;
  const a01 = (rgba[i01 + 3] ?? 255) / 255;
  const a11 = (rgba[i11 + 3] ?? 255) / 255;

  const r =
    (rgba[i00] ?? 0) * a00 * w00 +
    (rgba[i10] ?? 0) * a10 * w10 +
    (rgba[i01] ?? 0) * a01 * w01 +
    (rgba[i11] ?? 0) * a11 * w11;
  const g =
    (rgba[i00 + 1] ?? 0) * a00 * w00 +
    (rgba[i10 + 1] ?? 0) * a10 * w10 +
    (rgba[i01 + 1] ?? 0) * a01 * w01 +
    (rgba[i11 + 1] ?? 0) * a11 * w11;
  const b =
    (rgba[i00 + 2] ?? 0) * a00 * w00 +
    (rgba[i10 + 2] ?? 0) * a10 * w10 +
    (rgba[i01 + 2] ?? 0) * a01 * w01 +
    (rgba[i11 + 2] ?? 0) * a11 * w11;

  return [r, g, b];
}

/**
 * Resizes with preserved aspect ratio onto a 320x320 padded canvas and builds an
 * NCHW [1, 3, 320, 320] float32 tensor normalized with ImageNet mean and std.
 */
export function prepareU2NetInputTensor(
  rgba: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  targetSize: number = U2NET_INPUT_SIZE
): U2NetPreparedInput {
  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error("Source dimensions must be positive for U2Net preprocessing.");
  }

  const scale = targetSize / Math.max(srcWidth, srcHeight);
  const resizedW = Math.max(1, Math.round(srcWidth * scale));
  const resizedH = Math.max(1, Math.round(srcHeight * scale));
  const padX = Math.floor((targetSize - resizedW) / 2);
  const padY = Math.floor((targetSize - resizedH) / 2);

  const planeSize = targetSize * targetSize;
  const tensorData = new Float32Array(3 * planeSize);

  const zeroNormR = (0 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
  const zeroNormG = (0 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
  const zeroNormB = (0 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];

  for (let i = 0; i < planeSize; i += 1) {
    tensorData[i] = zeroNormR;
    tensorData[planeSize + i] = zeroNormG;
    tensorData[2 * planeSize + i] = zeroNormB;
  }

  for (let dy = 0; dy < resizedH; dy += 1) {
    const sy = ((dy + 0.5) * srcHeight) / resizedH - 0.5;
    const outY = padY + dy;

    for (let dx = 0; dx < resizedW; dx += 1) {
      const sx = ((dx + 0.5) * srcWidth) / resizedW - 0.5;
      const outX = padX + dx;
      const outIdx = outY * targetSize + outX;

      const [r, g, b] = sampleRgbaChannelBilinear(rgba, srcWidth, srcHeight, sx, sy);
      tensorData[outIdx] = (r / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
      tensorData[planeSize + outIdx] =
        (g / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
      tensorData[2 * planeSize + outIdx] =
        (b / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
    }
  }

  return {
    tensorData,
    width: targetSize,
    height: targetSize,
    resizedW,
    resizedH,
    padX,
    padY,
    srcWidth,
    srcHeight,
  };
}

/**
 * Un-crops the padded mask region, min-max normalizes within a noise floor guard,
 * bilinearly upsamples to the original image dimensions, and produces cutout RGBA pixels.
 */
export function postprocessU2NetMask(
  rawMask: Float32Array,
  srcRgba: Uint8ClampedArray,
  prepared: U2NetPreparedInput
): U2NetPostprocessOutput {
  const { width, resizedW, resizedH, padX, padY, srcWidth, srcHeight } = prepared;
  const cropped = new Float32Array(resizedW * resizedH);

  let minVal = Number.POSITIVE_INFINITY;
  let maxVal = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < resizedH; y += 1) {
    const mapY = padY + y;
    for (let x = 0; x < resizedW; x += 1) {
      const mapX = padX + x;
      const raw = rawMask[mapY * width + mapX] ?? 0;
      const prob = raw < 0 || raw > 1 ? 1 / (1 + Math.exp(-raw)) : raw;
      const idx = y * resizedW + x;
      cropped[idx] = prob;
      if (prob < minVal) minVal = prob;
      if (prob > maxVal) maxVal = prob;
    }
  }

  const denom = Math.max(0.25, maxVal - minVal);
  for (let i = 0; i < cropped.length; i += 1) {
    const val = ((cropped[i] ?? 0) - minVal) / denom;
    cropped[i] = clamp(val, 0, 1);
  }

  const pixelCount = srcWidth * srcHeight;
  const alphaMask = new Uint8Array(pixelCount);
  const foregroundRgba = new Uint8ClampedArray(srcRgba);

  for (let y = 0; y < srcHeight; y += 1) {
    const my = clamp(((y + 0.5) * resizedH) / srcHeight - 0.5, 0, resizedH - 1);
    const y0 = Math.floor(my);
    const y1 = Math.min(resizedH - 1, y0 + 1);
    const fy = my - y0;

    for (let x = 0; x < srcWidth; x += 1) {
      const mx = clamp(((x + 0.5) * resizedW) / srcWidth - 0.5, 0, resizedW - 1);
      const x0 = Math.floor(mx);
      const x1 = Math.min(resizedW - 1, x0 + 1);
      const fx = mx - x0;

      const m00 = cropped[y0 * resizedW + x0] ?? 0;
      const m10 = cropped[y0 * resizedW + x1] ?? 0;
      const m01 = cropped[y1 * resizedW + x0] ?? 0;
      const m11 = cropped[y1 * resizedW + x1] ?? 0;

      const interp =
        m00 * (1 - fx) * (1 - fy) +
        m10 * fx * (1 - fy) +
        m01 * (1 - fx) * fy +
        m11 * fx * fy;

      const matte = clamp(Math.round(interp * 255), 0, 255);
      const dstIdx = y * srcWidth + x;
      const srcAlpha = srcRgba[dstIdx * 4 + 3] ?? 255;
      const combinedAlpha = Math.round((matte * srcAlpha) / 255);

      alphaMask[dstIdx] = combinedAlpha;
      foregroundRgba[dstIdx * 4 + 3] = combinedAlpha;
    }
  }

  return {
    alphaMask,
    foregroundRgba,
  };
}
