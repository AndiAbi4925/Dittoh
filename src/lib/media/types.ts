import type {
  SUPPORTED_RASTER_EXTENSIONS,
  SUPPORTED_RAW_EXTENSIONS,
} from "@/lib/constants";

export type SupportedRasterExtension =
  (typeof SUPPORTED_RASTER_EXTENSIONS)[number];

export type SupportedRawExtension =
  (typeof SUPPORTED_RAW_EXTENSIONS)[number];

export type SupportedMediaExtension =
  | SupportedRasterExtension
  | SupportedRawExtension;

export type MediaFormatKind = "raster" | "tiff" | "heic" | "raw";

export type BackgroundFillMode = "transparent" | "black" | "white" | "custom";

export interface BackgroundFillOption {
  mode: BackgroundFillMode;
  customHex: string;
}

export type ProcessingStage =
  | "IDLE"
  | "VALIDATING_FILE"
  | "DECODING_RAW"
  | "DECODING_IMAGE"
  | "LOADING_ONNX_MODEL"
  | "REMOVING_BACKGROUND"
  | "READY"
  | "ERROR";

export interface ProcessingProgress {
  stage: ProcessingStage;
  progress: number;
  message: string;
}

export interface DecodedImagePayload {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  wasDownsampled: boolean;
  rgba: Uint8ClampedArray;
  format: string;
  kind: MediaFormatKind;
  cameraModel?: string;
}

export interface BackgroundRemovalResult {
  width: number;
  height: number;
  alphaMask: Uint8Array;
  foregroundRgba: Uint8ClampedArray;
  inferenceMs: number;
}

export interface MediaValidationConfig {
  maxImageSizeMb: number;
  enabledRawFormats: readonly string[];
  maxWorkingDimension?: number;
}

export type MediaErrorCode =
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FORMAT"
  | "RAW_FORMAT_DISABLED"
  | "SIGNATURE_MISMATCH"
  | "DECODE_FAILED"
  | "BG_REMOVAL_FAILED"
  | "OUT_OF_MEMORY"
  | "CANCELLED";

export type MediaValidationResult =
  | {
      ok: true;
      extension: SupportedMediaExtension;
      mimeType: string;
      kind: MediaFormatKind;
      sizeBytes: number;
    }
  | {
      ok: false;
      code: MediaErrorCode;
      message: string;
    };

export class MediaProcessingError extends Error {
  readonly code: MediaErrorCode;

  constructor(code: MediaErrorCode, message: string) {
    super(message);
    this.name = "MediaProcessingError";
    this.code = code;
  }
}
