import {
  DEFAULT_GIF_EXPORT_MAX_DURATION_SEC,
  DEFAULT_MAX_VIDEO_DURATION_SEC,
  DEFAULT_MAX_VIDEO_INPUT_FPS,
  DEFAULT_MAX_VIDEO_INPUT_HEIGHT_PX,
  DEFAULT_MAX_VIDEO_INPUT_WIDTH_PX,
  DEFAULT_MAX_VIDEO_SIZE_MB,
  DEFAULT_MP4_EXPORT_MAX_FPS,
  DEFAULT_MP4_EXPORT_MAX_HEIGHT_PX,
  DEFAULT_MP4_EXPORT_MAX_WIDTH_PX,
  SUPPORTED_VIDEO_EXTENSIONS,
} from "@/lib/constants";
import {
  type FrameConsistencyConfig,
  type SupportedVideoExtension,
  type VideoConversionOptions,
  type VideoMetadata,
  VideoProcessingError,
} from "@/lib/video/types";

export interface VideoFileCandidate {
  name: string;
  size: number;
  type?: string;
  headerBytes?: Uint8Array;
}

export type VideoSignatureKind =
  | "mp4"
  | "mov"
  | "gif"
  | "webm"
  | "isobmff-other"
  | "unknown";

const VIDEO_EXT_SET = new Set<string>(SUPPORTED_VIDEO_EXTENSIONS);

const MIME_BY_VIDEO_EXT: Record<SupportedVideoExtension, string> = {
  mp4: "video/mp4",
  gif: "image/gif",
  mov: "video/quicktime",
  webm: "video/webm",
};

const EXT_BY_VIDEO_MIME: Record<string, SupportedVideoExtension> = {
  "video/mp4": "mp4",
  "image/gif": "gif",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const DEFAULT_FRAME_CONSISTENCY: FrameConsistencyConfig = {
  temporalSmoothing: 0.35,
  hysteresisThreshold: 0.025,
  luminanceMode: "locked-first-frame",
  paletteMode: "locked-palette",
};

function matchesAscii(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) {
    return false;
  }
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[offset + i] !== text.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

/**
 * Sniffs video and animated GIF magic bytes to reject disguised extensions early.
 */
export function detectVideoSignature(bytes: Uint8Array): VideoSignatureKind {
  if (bytes.length < 4) {
    return "unknown";
  }

  if (
    matchesAscii(bytes, 0, "GIF87a") ||
    matchesAscii(bytes, 0, "GIF89a")
  ) {
    return "gif";
  }

  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "webm";
  }

  if (matchesAscii(bytes, 4, "ftyp") && bytes.length >= 12) {
    const brand = String.fromCharCode(
      bytes[8] ?? 0,
      bytes[9] ?? 0,
      bytes[10] ?? 0,
      bytes[11] ?? 0
    );
    if (brand === "qt  ") {
      return "mov";
    }
    if (
      brand === "isom" ||
      brand === "iso2" ||
      brand === "mp41" ||
      brand === "mp42" ||
      brand === "avc1" ||
      brand === "hev1" ||
      brand === "hvc1" ||
      brand === "M4V "
    ) {
      return "mp4";
    }
    return "isobmff-other";
  }

  if (
    matchesAscii(bytes, 4, "moov") ||
    matchesAscii(bytes, 4, "mdat") ||
    matchesAscii(bytes, 4, "wide")
  ) {
    return "mov";
  }

  return "unknown";
}

function isSignatureCompatible(
  ext: SupportedVideoExtension,
  sig: VideoSignatureKind
): boolean {
  if (sig === "unknown") {
    return false;
  }
  if (ext === "gif") return sig === "gif";
  if (ext === "webm") return sig === "webm";
  if (ext === "mp4") return sig === "mp4" || sig === "mov";
  if (ext === "mov") return sig === "mov" || sig === "mp4";
  return false;
}

export function extractVideoExtension(
  fileName: string,
  mimeType?: string
): SupportedVideoExtension | null {
  const cleanName = fileName.trim().toLowerCase();
  const dotIdx = cleanName.lastIndexOf(".");
  if (dotIdx !== -1 && dotIdx < cleanName.length - 1) {
    const ext = cleanName.slice(dotIdx + 1);
    if (VIDEO_EXT_SET.has(ext)) {
      return ext as SupportedVideoExtension;
    }
  }
  const normalizedMime = mimeType?.toLowerCase().trim() ?? "";
  return EXT_BY_VIDEO_MIME[normalizedMime] ?? null;
}

export function buildVideoAcceptAttribute(): string {
  return ".mp4,.gif,.mov,.webm,video/mp4,image/gif,video/quicktime,video/webm";
}

export function validateVideoCandidate(
  candidate: VideoFileCandidate,
  maxVideoSizeMb = DEFAULT_MAX_VIDEO_SIZE_MB
): { extension: SupportedVideoExtension; mimeType: string } {
  if (candidate.size <= 0) {
    throw new VideoProcessingError(
      "EMPTY_FILE",
      "Selected video or GIF file is empty (0 bytes).",
      false
    );
  }

  const maxBytes = maxVideoSizeMb * 1024 * 1024;
  if (candidate.size > maxBytes) {
    const actualMb = (candidate.size / (1024 * 1024)).toFixed(1);
    throw new VideoProcessingError(
      "FILE_TOO_LARGE",
      `File size ${actualMb} MB exceeds the configured ${maxVideoSizeMb} MB limit for browser video processing.`,
      false
    );
  }

  const extension = extractVideoExtension(candidate.name, candidate.type);
  if (!extension) {
    throw new VideoProcessingError(
      "UNSUPPORTED_FORMAT",
      "Unsupported media extension. Phase 2 supports .mp4, .gif, .mov, and .webm.",
      false
    );
  }

  if (candidate.headerBytes && candidate.headerBytes.length >= 6) {
    const sig = detectVideoSignature(candidate.headerBytes);
    if (!isSignatureCompatible(extension, sig)) {
      throw new VideoProcessingError(
        "SIGNATURE_MISMATCH",
        `File header signature (${sig}) does not match .${extension.toUpperCase()} format.`,
        false
      );
    }
  }

  return {
    extension,
    mimeType: candidate.type || MIME_BY_VIDEO_EXT[extension],
  };
}

export function validateVideoMetadata(
  meta: VideoMetadata,
  limits: {
    maxDurationSec?: number;
    maxWidthPx?: number;
    maxHeightPx?: number;
    maxFps?: number;
  } = {}
): void {
  const maxDurationSec = limits.maxDurationSec ?? DEFAULT_MAX_VIDEO_DURATION_SEC;
  const maxWidthPx = limits.maxWidthPx ?? DEFAULT_MAX_VIDEO_INPUT_WIDTH_PX;
  const maxHeightPx = limits.maxHeightPx ?? DEFAULT_MAX_VIDEO_INPUT_HEIGHT_PX;
  const maxFps = limits.maxFps ?? DEFAULT_MAX_VIDEO_INPUT_FPS;

  if (meta.durationSec <= 0 || !Number.isFinite(meta.durationSec)) {
    throw new VideoProcessingError(
      "VIDEO_DECODE_FAILED",
      "Could not determine a valid duration for the input video.",
      false
    );
  }

  if (meta.durationSec > maxDurationSec + 0.25) {
    throw new VideoProcessingError(
      "DURATION_EXCEEDED",
      `Video duration (${meta.durationSec.toFixed(1)}s) exceeds the ${maxDurationSec}s limit.`,
      false
    );
  }

  const longerEdge = Math.max(meta.width, meta.height);
  const shorterEdge = Math.min(meta.width, meta.height);
  if (
    longerEdge > Math.max(maxWidthPx, maxHeightPx) ||
    shorterEdge > Math.min(maxWidthPx, maxHeightPx)
  ) {
    throw new VideoProcessingError(
      "RESOLUTION_EXCEEDED",
      `Video resolution (${meta.width}x${meta.height}) exceeds the 1080p input ceiling.`,
      false
    );
  }

  if (meta.estimatedFps > maxFps + 1) {
    throw new VideoProcessingError(
      "FPS_EXCEEDED",
      `Input frame rate (~${Math.round(meta.estimatedFps)} FPS) exceeds the ${maxFps} FPS ceiling.`,
      false
    );
  }
}

export function clampVideoConversionOptions(
  options: VideoConversionOptions,
  sourceDurationSec: number
): VideoConversionOptions {
  const safeDuration = Math.max(
    0.5,
    Math.min(sourceDurationSec, DEFAULT_MAX_VIDEO_DURATION_SEC)
  );
  const trimStartSec = Math.max(0, Math.min(options.trimStartSec, safeDuration - 0.5));
  const rawMaxClip =
    options.outputFormat === "gif"
      ? DEFAULT_GIF_EXPORT_MAX_DURATION_SEC
      : DEFAULT_MAX_VIDEO_DURATION_SEC;
  const minEnd = Math.min(safeDuration, trimStartSec + 0.5);
  const maxEnd = Math.min(safeDuration, trimStartSec + rawMaxClip);
  const trimEndSec = Math.max(minEnd, Math.min(options.trimEndSec, maxEnd));

  const targetFps = Math.max(
    4,
    Math.min(DEFAULT_MP4_EXPORT_MAX_FPS, Math.round(options.targetFps))
  );

  const targetMaxWidthPx = Math.max(
    320,
    Math.min(DEFAULT_MP4_EXPORT_MAX_WIDTH_PX, Math.round(options.targetMaxWidthPx))
  );

  return {
    outputFormat: options.outputFormat,
    targetFps,
    targetMaxWidthPx,
    trimStartSec,
    trimEndSec,
    consistency: {
      temporalSmoothing: Math.max(
        0,
        Math.min(0.8, options.consistency.temporalSmoothing)
      ),
      hysteresisThreshold: Math.max(
        0,
        Math.min(0.15, options.consistency.hysteresisThreshold)
      ),
      luminanceMode: options.consistency.luminanceMode,
      paletteMode: options.consistency.paletteMode,
    },
  };
}

/**
 * Computes aspect-preserving even dimensions bounded by max 720p (1280x720) for yuv420p H.264 compatibility.
 */
export function computeEvenTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidthPx = DEFAULT_MP4_EXPORT_MAX_WIDTH_PX,
  maxHeightPx = DEFAULT_MP4_EXPORT_MAX_HEIGHT_PX
): { width: number; height: number } {
  const boundedMaxW = Math.min(maxWidthPx, DEFAULT_MP4_EXPORT_MAX_WIDTH_PX);
  const boundedMaxH = Math.min(maxHeightPx, DEFAULT_MP4_EXPORT_MAX_HEIGHT_PX);
  const safeSrcW = Math.max(16, srcWidth);
  const safeSrcH = Math.max(16, srcHeight);
  const scale = Math.min(boundedMaxW / safeSrcW, boundedMaxH / safeSrcH, 1);

  const rawW = Math.max(16, Math.round(safeSrcW * scale));
  const rawH = Math.max(16, Math.round(safeSrcH * scale));
  return {
    width: Math.max(16, rawW & ~1),
    height: Math.max(16, rawH & ~1),
  };
}
