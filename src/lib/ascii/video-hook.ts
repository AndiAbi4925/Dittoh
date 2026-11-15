import {
  DEFAULT_GIF_EXPORT_MAX_DURATION_SEC,
  DEFAULT_MAX_VIDEO_DURATION_SEC,
  DEFAULT_MAX_VIDEO_INPUT_FPS,
  DEFAULT_MAX_VIDEO_INPUT_HEIGHT_PX,
  DEFAULT_MAX_VIDEO_SIZE_MB,
  DEFAULT_MP4_EXPORT_MAX_FPS,
  DEFAULT_MP4_EXPORT_MAX_HEIGHT_PX,
  SUPPORTED_VIDEO_EXTENSIONS,
} from "@/lib/constants";

export interface VideoConversionConstraints {
  enabled: boolean;
  supportedInputExtensions: typeof SUPPORTED_VIDEO_EXTENSIONS;
  maxInputSizeBytes: number;
  maxInputDurationSec: number;
  maxInputHeightPx: number;
  maxInputFps: number;
  maxMp4ExportHeightPx: number;
  maxMp4ExportFps: number;
  maxGifExportDurationSec: number;
  frameConsistencyMode: "locked-palette" | "per-frame";
}

export interface VideoTranscodeAdapter {
  readonly id: string;
  isAvailable(): Promise<boolean>;
}

export const PHASE2_VIDEO_CONSTRAINTS: VideoConversionConstraints = {
  enabled: true,
  supportedInputExtensions: SUPPORTED_VIDEO_EXTENSIONS,
  maxInputSizeBytes: DEFAULT_MAX_VIDEO_SIZE_MB * 1024 * 1024,
  maxInputDurationSec: DEFAULT_MAX_VIDEO_DURATION_SEC,
  maxInputHeightPx: DEFAULT_MAX_VIDEO_INPUT_HEIGHT_PX,
  maxInputFps: DEFAULT_MAX_VIDEO_INPUT_FPS,
  maxMp4ExportHeightPx: DEFAULT_MP4_EXPORT_MAX_HEIGHT_PX,
  maxMp4ExportFps: DEFAULT_MP4_EXPORT_MAX_FPS,
  maxGifExportDurationSec: DEFAULT_GIF_EXPORT_MAX_DURATION_SEC,
  frameConsistencyMode: "locked-palette",
};

export function createDisabledVideoAdapter(): VideoTranscodeAdapter {
  return {
    id: "ffmpeg-wasm-phase2-pending",
    async isAvailable(): Promise<boolean> {
      return false;
    },
  };
}
