import type { SUPPORTED_VIDEO_EXTENSIONS } from "@/lib/constants";

export type SupportedVideoExtension =
  (typeof SUPPORTED_VIDEO_EXTENSIONS)[number];

export type VideoExportFormat = "mp4" | "gif";
export type VideoPaletteMode = "locked-palette" | "per-frame";
export type VideoLuminanceMode = "locked-first-frame" | "per-frame";

export type VideoProcessingStage =
  | "IDLE"
  | "VALIDATING"
  | "LOADING_FFMPEG"
  | "EXTRACTING_FRAMES"
  | "RENDERING_ASCII"
  | "ENCODING_OUTPUT"
  | "READY"
  | "ERROR";

export type VideoErrorCode =
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "UNSUPPORTED_FORMAT"
  | "SIGNATURE_MISMATCH"
  | "DURATION_EXCEEDED"
  | "RESOLUTION_EXCEEDED"
  | "FPS_EXCEEDED"
  | "VIDEO_DECODE_FAILED"
  | "ENCODE_FAILED"
  | "CANCELLED"
  | "FEATURE_DISABLED";

export class VideoProcessingError extends Error {
  readonly code: VideoErrorCode;
  readonly recoverable: boolean;

  constructor(code: VideoErrorCode, message: string, recoverable = true) {
    super(message);
    this.name = "VideoProcessingError";
    this.code = code;
    this.recoverable = recoverable;
  }
}

export interface VideoMetadata {
  width: number;
  height: number;
  durationSec: number;
  estimatedFps: number;
  format: SupportedVideoExtension;
}

export interface FrameConsistencyConfig {
  temporalSmoothing: number;
  hysteresisThreshold: number;
  luminanceMode: VideoLuminanceMode;
  paletteMode: VideoPaletteMode;
}

export interface VideoConversionOptions {
  outputFormat: VideoExportFormat;
  targetFps: number;
  targetMaxWidthPx: number;
  trimStartSec: number;
  trimEndSec: number;
  consistency: FrameConsistencyConfig;
}

export interface VideoProgressUpdate {
  stage: VideoProcessingStage;
  progress: number;
  message: string;
}

export interface SampledVideoFrame {
  index: number;
  timestampSec: number;
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export interface VideoEncodeResult {
  format: VideoExportFormat;
  mimeType: string;
  fileName: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  frameCount: number;
  decodeMs: number;
  renderMs: number;
  encodeMs: number;
  totalMs: number;
}
