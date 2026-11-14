import type {
  BackgroundRemovalResult,
  DecodedImagePayload,
  MediaValidationConfig,
  ProcessingProgress,
} from "@/lib/media/types";

export interface ProcessorExecutionOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ProcessingProgress) => void;
}

/**
 * Clean abstraction for client or remote media decoding and background segmentation.
 * MVP uses LocalWorkerProcessor in browser Web Workers; Phase 2 can swap in RemoteWorkerProcessor.
 */
export interface MediaProcessor {
  readonly id: string;
  decodeFile(
    file: File,
    config: MediaValidationConfig,
    options?: ProcessorExecutionOptions
  ): Promise<DecodedImagePayload>;
  removeBackground(
    image: DecodedImagePayload,
    options?: ProcessorExecutionOptions
  ): Promise<BackgroundRemovalResult>;
  dispose(): void;
}
