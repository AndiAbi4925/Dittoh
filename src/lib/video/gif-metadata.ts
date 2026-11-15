import { VideoProcessingError } from "@/lib/video/types";

export interface GifMetadataResult {
  width: number;
  height: number;
  durationSec: number;
  frameCount: number;
  estimatedFps: number;
}

/**
 * Parses animated GIF binary blocks (Logical Screen Descriptor and Graphic Control Extensions)
 * to recover exact canvas dimensions, frame count, and duration without relying on video elements.
 */
export function parseGifMetadata(bytes: Uint8Array): GifMetadataResult {
  if (bytes.length < 14) {
    throw new VideoProcessingError(
      "VIDEO_DECODE_FAILED",
      "Animated GIF file is truncated.",
      false
    );
  }

  const header = String.fromCharCode(
    bytes[0] ?? 0,
    bytes[1] ?? 0,
    bytes[2] ?? 0,
    bytes[3] ?? 0,
    bytes[4] ?? 0,
    bytes[5] ?? 0
  );
  if (header !== "GIF87a" && header !== "GIF89a") {
    throw new VideoProcessingError(
      "SIGNATURE_MISMATCH",
      "Input does not start with a valid GIF87a/GIF89a header.",
      false
    );
  }

  const width = (bytes[6] ?? 0) | ((bytes[7] ?? 0) << 8);
  const height = (bytes[8] ?? 0) | ((bytes[9] ?? 0) << 8);
  if (width <= 0 || height <= 0) {
    throw new VideoProcessingError(
      "VIDEO_DECODE_FAILED",
      "GIF dimensions are invalid.",
      false
    );
  }

  const packed = bytes[10] ?? 0;
  let offset = 13;
  if ((packed & 0x80) !== 0) {
    const gctEntries = 1 << ((packed & 0x07) + 1);
    offset += gctEntries * 3;
  }

  const skipSubBlocks = (pos: number): number => {
    let cursor = pos;
    while (cursor < bytes.length) {
      const blockSize = bytes[cursor] ?? 0;
      cursor += 1;
      if (blockSize === 0) {
        break;
      }
      cursor += blockSize;
    }
    return cursor;
  };

  let frameCount = 0;
  let totalDelayCs = 0;
  let pendingDelayCs = 10;

  while (offset < bytes.length) {
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined || marker === 0x3b) {
      break;
    }

    if (marker === 0x21) {
      const label = bytes[offset];
      offset += 1;
      if (label === 0xf9 && offset + 4 < bytes.length) {
        const blockSize = bytes[offset] ?? 0;
        if (blockSize === 4) {
          const rawDelay = (bytes[offset + 2] ?? 0) | ((bytes[offset + 3] ?? 0) << 8);
          pendingDelayCs = rawDelay <= 1 ? 10 : rawDelay;
        }
      }
      offset = skipSubBlocks(offset);
      continue;
    }

    if (marker === 0x2c) {
      if (offset + 9 >= bytes.length) {
        break;
      }
      const imgPacked = bytes[offset + 8] ?? 0;
      offset += 9;
      if ((imgPacked & 0x80) !== 0) {
        const lctEntries = 1 << ((imgPacked & 0x07) + 1);
        offset += lctEntries * 3;
      }
      // LZW minimum code size byte followed by compressed sub-blocks
      offset += 1;
      offset = skipSubBlocks(offset);
      frameCount += 1;
      totalDelayCs += pendingDelayCs;
      pendingDelayCs = 10;
      continue;
    }

    break;
  }

  const safeFrames = Math.max(1, frameCount);
  const durationSec = Math.max(0.5, totalDelayCs / 100);
  const estimatedFps = Math.max(1, safeFrames / durationSec);

  return {
    width,
    height,
    durationSec,
    frameCount: safeFrames,
    estimatedFps,
  };
}
