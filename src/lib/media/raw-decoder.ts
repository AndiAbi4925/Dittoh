import {
  convertRawSamplesToRgba,
  DEFAULT_MAX_WORKING_DIMENSION,
  downscaleRgbaIfNeeded,
} from "@/lib/media/pixel-utils";
import { MediaProcessingError } from "@/lib/media/types";

interface LibRawWorkerResponse {
  id: number;
  out?: unknown;
  error?: string;
}

interface LibRawMetadata {
  camera_model?: string;
  make?: string;
}

interface LibRawImageData {
  width: number;
  height: number;
  colors?: number;
  data: Uint8Array | Uint16Array;
}

export interface DecodedRawResult {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  wasDownsampled: boolean;
  rgba: Uint8ClampedArray;
  cameraModel?: string;
}

interface PendingRpc {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

const LIBRAW_WORKER_URL = "/wasm/libraw/worker.js";

/**
 * Browser client for the self-hosted LibRaw WebAssembly Web Worker.
 */
export class LibRawWorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<number, PendingRpc>();
  private nextId = 0;

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    if (typeof Worker === "undefined") {
      throw new MediaProcessingError(
        "DECODE_FAILED",
        "Web Workers are unavailable in this environment."
      );
    }

    if (typeof globalThis !== "undefined" && globalThis.crossOriginIsolated === false) {
      throw new MediaProcessingError(
        "DECODE_FAILED",
        "RAW WebAssembly decoding requires Cross-Origin Isolation (SharedArrayBuffer). Reload the page directly from Dittoh or convert the RAW file to DNG/PNG."
      );
    }

    const worker = new Worker(LIBRAW_WORKER_URL, { type: "module" });
    worker.onmessage = (event: MessageEvent<LibRawWorkerResponse>) => {
      const data = event.data;
      const entry = this.pending.get(data.id);
      if (!entry) {
        return;
      }
      this.pending.delete(data.id);
      if (data.error) {
        entry.reject(new MediaProcessingError("DECODE_FAILED", data.error));
      } else {
        entry.resolve(data.out);
      }
    };
    worker.onerror = (event: ErrorEvent) => {
      this.rejectAll(
        new MediaProcessingError(
          "DECODE_FAILED",
          event.message || "LibRaw Web Worker failed unexpectedly."
        )
      );
    };
    this.worker = worker;
    return worker;
  }

  private rejectAll(error: Error): void {
    for (const entry of this.pending.values()) {
      entry.reject(error);
    }
    this.pending.clear();
  }

  private call(
    fn: string,
    args: unknown[],
    transfer: Transferable[] = []
  ): Promise<unknown> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ id, fn, args }, transfer);
    });
  }

  private async runAttempt(
    buffer: ArrayBuffer,
    extension: string,
    useHalfSize: boolean,
    options: {
      maxWorkingDimension?: number;
      signal?: AbortSignal;
    }
  ): Promise<DecodedRawResult> {
    const copy = new Uint8Array(buffer.slice(0));

    await this.call(
      "open",
      [
        copy,
        {
          useCameraWb: true,
          outputBps: 8,
          outputColor: 1,
          userFlip: -1,
          halfSize: useHalfSize,
        },
      ],
      [copy.buffer]
    );

    if (options.signal?.aborted) {
      throw new MediaProcessingError("CANCELLED", "RAW photo opening was cancelled.");
    }

    const meta = (await this.call("metadata", [false])) as
      | LibRawMetadata
      | undefined;
    const imageData = (await this.call("imageData", [])) as
      | LibRawImageData
      | undefined;

    if (
      !imageData ||
      !imageData.data ||
      imageData.width <= 0 ||
      imageData.height <= 0
    ) {
      throw new MediaProcessingError(
        "DECODE_FAILED",
        `Could not read this .${extension.toUpperCase()} camera file. Newer compressed RAW formats may not work here yet, so try saving as DNG, JPG, or PNG.`
      );
    }

    const rgbaFull = convertRawSamplesToRgba(
      imageData.data,
      imageData.width,
      imageData.height,
      imageData.colors ?? 3
    );

    const originalWidth = useHalfSize ? imageData.width * 2 : imageData.width;
    const originalHeight = useHalfSize ? imageData.height * 2 : imageData.height;

    const scaled = downscaleRgbaIfNeeded(
      rgbaFull,
      imageData.width,
      imageData.height,
      options.maxWorkingDimension ?? DEFAULT_MAX_WORKING_DIMENSION
    );

    const cameraModel = [meta?.make, meta?.camera_model]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      width: scaled.width,
      height: scaled.height,
      originalWidth,
      originalHeight,
      wasDownsampled: scaled.wasDownsampled || useHalfSize,
      rgba: scaled.rgba,
      ...(cameraModel ? { cameraModel } : {}),
    };
  }

  async decodeRawBuffer(
    buffer: ArrayBuffer,
    extension: string,
    options: {
      maxWorkingDimension?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<DecodedRawResult> {
    if (options.signal?.aborted) {
      throw new MediaProcessingError("CANCELLED", "RAW photo opening was cancelled.");
    }

    const onAbort = () => {
      this.dispose();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    const preferHalfSize =
      buffer.byteLength > 14 * 1024 * 1024 ||
      (options.maxWorkingDimension ?? DEFAULT_MAX_WORKING_DIMENSION) <= 1400;

    try {
      try {
        return await this.runAttempt(buffer, extension, preferHalfSize, options);
      } catch (firstError) {
        if (options.signal?.aborted || preferHalfSize) {
          throw firstError;
        }
        const firstMessage =
          firstError instanceof Error ? firstError.message : String(firstError);
        // Large RAW files can exceed full-resolution WASM heap; retry once at half size.
        if (/memory|allocation|oom|abort/i.test(firstMessage)) {
          this.dispose();
          return await this.runAttempt(buffer, extension, true, options);
        }
        throw firstError;
      }
    } catch (error) {
      if (options.signal?.aborted) {
        throw new MediaProcessingError("CANCELLED", "RAW photo opening was cancelled.");
      }
      if (error instanceof MediaProcessingError) {
        if (
          error.code === "DECODE_FAILED" &&
          /cannot read properties of undefined/i.test(error.message)
        ) {
          throw new MediaProcessingError(
            "DECODE_FAILED",
            `Could not read this .${extension.toUpperCase()} camera file. Newer compressed RAW formats may not work here yet, so try saving as DNG, JPG, or PNG.`
          );
        }
        throw error;
      }
      const message =
        error instanceof Error ? error.message : "Unknown RAW error.";
      if (/memory|allocation|oom/i.test(message)) {
        throw new MediaProcessingError(
          "OUT_OF_MEMORY",
          `Your browser ran out of memory opening this .${extension.toUpperCase()} photo. Try closing extra tabs or converting it to DNG, JPG, or PNG first.`
        );
      }
      throw new MediaProcessingError(
        "DECODE_FAILED",
        `Could not read this .${extension.toUpperCase()} camera file. Try saving it as DNG, JPG, or PNG first.`
      );
    } finally {
      options.signal?.removeEventListener("abort", onAbort);
    }
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.rejectAll(
      new MediaProcessingError("CANCELLED", "RAW decoder worker terminated.")
    );
  }
}
