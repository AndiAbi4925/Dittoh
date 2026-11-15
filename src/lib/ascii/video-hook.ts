export interface VideoConversionConstraints {
  enabled: boolean;
  supportedInputExtensions: readonly ["mp4", "gif", "mov", "webm"];
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
  enabled: false,
  supportedInputExtensions: ["mp4", "gif", "mov", "webm"],
  maxInputSizeBytes: 100 * 1024 * 1024,
  maxInputDurationSec: 30,
  maxInputHeightPx: 1080,
  maxInputFps: 30,
  maxMp4ExportHeightPx: 720,
  maxMp4ExportFps: 12,
  maxGifExportDurationSec: 15,
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
