import {
  computeWorkingDimensions,
  DEFAULT_MAX_WORKING_DIMENSION,
} from "@/lib/media/pixel-utils";
import type { MediaFormatKind } from "@/lib/media/types";

export interface DecodeWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  mimeType: string;
  extension: string;
  kind: MediaFormatKind;
  maxWorkingDimension?: number;
}

export type DecodeWorkerResponse =
  | {
      id: number;
      ok: true;
      width: number;
      height: number;
      originalWidth: number;
      originalHeight: number;
      wasDownsampled: boolean;
      rgbaBuffer: ArrayBuffer;
    }
  | {
      id: number;
      ok: false;
      fallbackToMainThread: boolean;
      error: string;
    };

interface WorkerScopeLike {
  onmessage: ((event: MessageEvent<DecodeWorkerRequest>) => void) | null;
  postMessage: (message: DecodeWorkerResponse, transfer?: Transferable[]) => void;
}

const workerScope = globalThis as unknown as WorkerScopeLike;

function toOwnedBuffer(rgba: Uint8ClampedArray): ArrayBuffer {
  if (
    rgba.buffer instanceof ArrayBuffer &&
    rgba.byteOffset === 0 &&
    rgba.byteLength === rgba.buffer.byteLength
  ) {
    return rgba.buffer;
  }
  const copy = new Uint8ClampedArray(rgba);
  return copy.buffer;
}

workerScope.onmessage = async (event: MessageEvent<DecodeWorkerRequest>) => {
  const { id, buffer, mimeType, kind, maxWorkingDimension } = event.data;
  const maxDim = maxWorkingDimension ?? DEFAULT_MAX_WORKING_DIMENSION;

  try {
    if (
      typeof createImageBitmap !== "function" ||
      typeof OffscreenCanvas === "undefined"
    ) {
      workerScope.postMessage({
        id,
        ok: false,
        fallbackToMainThread: true,
        error: "OffscreenCanvas image decoding unavailable in worker.",
      });
      return;
    }

    const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
    const bitmap = await createImageBitmap(blob);

    try {
      const originalWidth = bitmap.width;
      const originalHeight = bitmap.height;
      const target = computeWorkingDimensions(originalWidth, originalHeight, maxDim);

      const canvas = new OffscreenCanvas(target.width, target.height);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not acquire 2D canvas context inside worker.");
      }

      ctx.drawImage(bitmap, 0, 0, target.width, target.height);
      const imageData = ctx.getImageData(0, 0, target.width, target.height);
      const rgbaBuffer = toOwnedBuffer(imageData.data);

      workerScope.postMessage(
        {
          id,
          ok: true,
          width: target.width,
          height: target.height,
          originalWidth,
          originalHeight,
          wasDownsampled: target.wasDownsampled,
          rgbaBuffer,
        },
        [rgbaBuffer]
      );
    } finally {
      bitmap.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to decode image in worker.";
    workerScope.postMessage({
      id,
      ok: false,
      fallbackToMainThread: kind === "heic",
      error: message,
    });
  }
};
