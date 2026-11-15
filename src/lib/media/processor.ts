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
 * Clean abstraction for media decoding and background segmentation.
 * LocalWorkerProcessor executes decoding and segmentation inside browser Web Workers.
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
