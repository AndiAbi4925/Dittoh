import {
  computeWorkingDimensions,
  DEFAULT_MAX_WORKING_DIMENSION,
  MOBILE_MAX_WORKING_DIMENSION,
} from "@/lib/media/pixel-utils";
import type {
  MediaProcessor,
  ProcessorExecutionOptions,
} from "@/lib/media/processor";
import { LibRawWorkerClient } from "@/lib/media/raw-decoder";
import {
  type BackgroundRemovalResult,
  type DecodedImagePayload,
  type MediaFormatKind,
  MediaProcessingError,
  type MediaValidationConfig,
} from "@/lib/media/types";
import { validateMediaFile } from "@/lib/media/validation";
import type {
  BgRemovalWorkerMessage,
  BgRemovalWorkerRequest,
} from "@/workers/bg-removal.worker";
import type {
  DecodeWorkerRequest,
  DecodeWorkerResponse,
} from "@/workers/media-decode.worker";

function resolveWorkingDimensionLimit(config: MediaValidationConfig): number {
  if (config.maxWorkingDimension && config.maxWorkingDimension > 0) {
    return config.maxWorkingDimension;
  }
  if (typeof navigator !== "undefined") {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowMemory =
      typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
    const narrowMobile =
      typeof window !== "undefined" && window.innerWidth > 0 && window.innerWidth < 768;
    if (lowMemory || narrowMobile) {
      return MOBILE_MAX_WORKING_DIMENSION;
    }
  }
  return DEFAULT_MAX_WORKING_DIMENSION;
}

async function decodeViaHtmlImageFallback(
  file: File,
  maxDim: number,
  signal?: AbortSignal
): Promise<{
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  wasDownsampled: boolean;
  rgba: Uint8ClampedArray;
}> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new MediaProcessingError(
      "DECODE_FAILED",
      "Main-thread image decoder is unavailable in this environment."
    );
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      const onAbort = () => {
        el.src = "";
        reject(new MediaProcessingError("CANCELLED", "Image decoding cancelled."));
      };
      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });

      el.onload = () => {
        signal?.removeEventListener("abort", onAbort);
        resolve(el);
      };
      el.onerror = () => {
        signal?.removeEventListener("abort", onAbort);
        reject(
          new MediaProcessingError(
            "DECODE_FAILED",
            `This browser cannot natively decode ${file.name}. Try exporting it to PNG or JPG first.`
          )
        );
      };
      el.src = objectUrl;
    });

    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;
    if (originalWidth <= 0 || originalHeight <= 0) {
      throw new MediaProcessingError(
        "DECODE_FAILED",
        "Decoded image reported zero dimensions."
      );
    }

    const target = computeWorkingDimensions(originalWidth, originalHeight, maxDim);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new MediaProcessingError(
        "DECODE_FAILED",
        "Could not acquire 2D canvas context for fallback decode."
      );
    }

    ctx.drawImage(img, 0, 0, target.width, target.height);
    const imageData = ctx.getImageData(0, 0, target.width, target.height);
    canvas.width = 0;
    canvas.height = 0;

    return {
      width: target.width,
      height: target.height,
      originalWidth,
      originalHeight,
      wasDownsampled: target.wasDownsampled,
      rgba: new Uint8ClampedArray(imageData.data),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Browser-only MediaProcessor running validation, LibRaw RAW decoding,
 * TIFF/raster decoding, and optional U-2-Netp background segmentation inside Web Workers.
 */
export class LocalWorkerProcessor implements MediaProcessor {
  readonly id = "local-worker-v1";
  private decodeWorker: Worker | null = null;
  private bgWorker: Worker | null = null;
  private rawClient: LibRawWorkerClient | null = null;
  private nextRequestId = 1;

  private getDecodeWorker(): Worker {
    if (this.decodeWorker) {
      return this.decodeWorker;
    }
    this.decodeWorker = new Worker(
      new URL("../../workers/media-decode.worker.ts", import.meta.url),
      { type: "module" }
    );
    return this.decodeWorker;
  }

  private getBgWorker(): Worker {
    if (this.bgWorker) {
      return this.bgWorker;
    }
    this.bgWorker = new Worker(
      new URL("../../workers/bg-removal.worker.ts", import.meta.url),
      { type: "module" }
    );
    return this.bgWorker;
  }

  private terminateDecodeWorker(): void {
    if (this.decodeWorker) {
      this.decodeWorker.terminate();
      this.decodeWorker = null;
    }
    if (this.rawClient) {
      this.rawClient.dispose();
      this.rawClient = null;
    }
  }

  private terminateBgWorker(): void {
    if (this.bgWorker) {
      this.bgWorker.terminate();
      this.bgWorker = null;
    }
  }

  async decodeFile(
    file: File,
    config: MediaValidationConfig,
    options: ProcessorExecutionOptions = {}
  ): Promise<DecodedImagePayload> {
    const { signal, onProgress } = options;
    if (signal?.aborted) {
      throw new MediaProcessingError("CANCELLED", "Operation cancelled.");
    }

    onProgress?.({
      stage: "VALIDATING_FILE",
      progress: 10,
      message: `Validating ${file.name} signature and size...`,
    });

    const headerSlice = await file.slice(0, Math.min(64, file.size)).arrayBuffer();
    const validation = validateMediaFile(
      {
        name: file.name,
        size: file.size,
        type: file.type,
        headerBytes: new Uint8Array(headerSlice),
      },
      config
    );

    if (!validation.ok) {
      throw new MediaProcessingError(validation.code, validation.message);
    }

    if (signal?.aborted) {
      throw new MediaProcessingError("CANCELLED", "Operation cancelled.");
    }

    const maxDim = resolveWorkingDimensionLimit(config);

    if (validation.kind === "raw") {
      onProgress?.({
        stage: "DECODING_RAW",
        progress: 35,
        message: `Decoding .${validation.extension.toUpperCase()} camera sensor buffer in WebAssembly...`,
      });

      const buffer = await file.arrayBuffer();
      if (!this.rawClient) {
        this.rawClient = new LibRawWorkerClient();
      }
      const rawDecoded = await this.rawClient.decodeRawBuffer(
        buffer,
        validation.extension,
        {
          maxWorkingDimension: maxDim,
          signal,
        }
      );

      onProgress?.({
        stage: "READY",
        progress: 100,
        message: rawDecoded.wasDownsampled
          ? `Decoded ${rawDecoded.cameraModel ?? "RAW"} (downsampled to ${rawDecoded.width}x${rawDecoded.height} for browser memory safety).`
          : `Decoded ${rawDecoded.cameraModel ?? "RAW"} (${rawDecoded.width}x${rawDecoded.height}).`,
      });

      return {
        width: rawDecoded.width,
        height: rawDecoded.height,
        originalWidth: rawDecoded.originalWidth,
        originalHeight: rawDecoded.originalHeight,
        wasDownsampled: rawDecoded.wasDownsampled,
        rgba: rawDecoded.rgba,
        format: validation.extension,
        kind: "raw",
        ...(rawDecoded.cameraModel ? { cameraModel: rawDecoded.cameraModel } : {}),
      };
    }

    onProgress?.({
      stage: "DECODING_IMAGE",
      progress: 40,
      message: `Decoding ${validation.extension.toUpperCase()} image buffer...`,
    });

    const buffer = await file.arrayBuffer();
    if (signal?.aborted) {
      throw new MediaProcessingError("CANCELLED", "Operation cancelled.");
    }

    const workerResult = await this.runDecodeWorker(
      {
        id: this.nextRequestId++,
        buffer,
        mimeType: validation.mimeType,
        extension: validation.extension,
        kind: validation.kind,
        maxWorkingDimension: maxDim,
      },
      signal
    );

    if (workerResult.ok) {
      onProgress?.({
        stage: "READY",
        progress: 100,
        message: workerResult.wasDownsampled
          ? `Decoded ${workerResult.width}x${workerResult.height} working bitmap.`
          : `Decoded ${workerResult.width}x${workerResult.height}.`,
      });
      return {
        width: workerResult.width,
        height: workerResult.height,
        originalWidth: workerResult.originalWidth,
        originalHeight: workerResult.originalHeight,
        wasDownsampled: workerResult.wasDownsampled,
        rgba: new Uint8ClampedArray(workerResult.rgbaBuffer),
        format: validation.extension,
        kind: validation.kind,
      };
    }

    if (workerResult.fallbackToMainThread) {
      const fallback = await decodeViaHtmlImageFallback(file, maxDim, signal);
      onProgress?.({
        stage: "READY",
        progress: 100,
        message: `Decoded ${fallback.width}x${fallback.height}.`,
      });
      return {
        ...fallback,
        format: validation.extension,
        kind: validation.kind,
      };
    }

    throw new MediaProcessingError(
      "DECODE_FAILED",
      workerResult.error || `Failed to decode ${file.name}.`
    );
  }

  private runDecodeWorker(
    request: DecodeWorkerRequest,
    signal?: AbortSignal
  ): Promise<DecodeWorkerResponse> {
    const worker = this.getDecodeWorker();

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        signal?.removeEventListener("abort", handleAbort);
      };

      const handleAbort = () => {
        cleanup();
        this.terminateDecodeWorker();
        reject(new MediaProcessingError("CANCELLED", "Image decoding cancelled."));
      };

      const handleMessage = (event: MessageEvent<DecodeWorkerResponse>) => {
        if (event.data.id !== request.id) {
          return;
        }
        cleanup();
        resolve(event.data);
      };

      const handleError = (event: ErrorEvent) => {
        cleanup();
        this.terminateDecodeWorker();
        reject(
          new MediaProcessingError(
            "DECODE_FAILED",
            event.message || "Decode Web Worker crashed."
          )
        );
      };

      if (signal?.aborted) {
        handleAbort();
        return;
      }

      signal?.addEventListener("abort", handleAbort, { once: true });
      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage(request, [request.buffer]);
    });
  }

  async removeBackground(
    image: DecodedImagePayload,
    options: ProcessorExecutionOptions = {}
  ): Promise<BackgroundRemovalResult> {
    const { signal, onProgress } = options;
    if (signal?.aborted) {
      throw new MediaProcessingError("CANCELLED", "Background removal cancelled.");
    }

    const requestId = this.nextRequestId++;
    const rgbaCopy = new Uint8ClampedArray(image.rgba);
    const worker = this.getBgWorker();

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        signal?.removeEventListener("abort", handleAbort);
      };

      const handleAbort = () => {
        cleanup();
        this.terminateBgWorker();
        reject(
          new MediaProcessingError(
            "CANCELLED",
            "Background removal was cancelled."
          )
        );
      };

      const handleMessage = (event: MessageEvent<BgRemovalWorkerMessage>) => {
        const msg = event.data;
        if (msg.id !== requestId) {
          return;
        }

        if (msg.type === "progress") {
          onProgress?.({
            stage: msg.stage,
            progress: msg.progress,
            message: msg.message,
          });
          return;
        }

        if (msg.type === "error") {
          cleanup();
          reject(new MediaProcessingError("BG_REMOVAL_FAILED", msg.error));
          return;
        }

        cleanup();
        onProgress?.({
          stage: "READY",
          progress: 100,
          message: `Background cutout complete (${msg.inferenceMs} ms).`,
        });

        resolve({
          width: image.width,
          height: image.height,
          alphaMask: new Uint8Array(msg.alphaBuffer),
          foregroundRgba: new Uint8ClampedArray(msg.foregroundBuffer),
          inferenceMs: msg.inferenceMs,
        });
      };

      const handleError = (event: ErrorEvent) => {
        cleanup();
        this.terminateBgWorker();
        reject(
          new MediaProcessingError(
            "BG_REMOVAL_FAILED",
            event.message || "Background segmentation worker failed."
          )
        );
      };

      signal?.addEventListener("abort", handleAbort, { once: true });
      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);

      const req: BgRemovalWorkerRequest = {
        id: requestId,
        width: image.width,
        height: image.height,
        rgbaBuffer: rgbaCopy.buffer,
      };
      worker.postMessage(req, [req.rgbaBuffer]);
    });
  }

  dispose(): void {
    this.terminateDecodeWorker();
    this.terminateBgWorker();
  }
}

export function formatKindBadge(kind: MediaFormatKind): string {
  switch (kind) {
    case "raw":
      return "Camera RAW";
    case "heic":
      return "Apple HEIC";
    case "raster":
      return "Photo";
  }
}
