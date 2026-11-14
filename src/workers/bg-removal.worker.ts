import * as ort from "onnxruntime-web/wasm";
import {
  postprocessU2NetMask,
  prepareU2NetInputTensor,
  U2NET_INPUT_SIZE,
} from "@/lib/media/u2net-preprocess";

export interface BgRemovalWorkerRequest {
  id: number;
  width: number;
  height: number;
  rgbaBuffer: ArrayBuffer;
}

export type BgRemovalWorkerMessage =
  | {
      id: number;
      type: "progress";
      stage: "LOADING_ONNX_MODEL" | "REMOVING_BACKGROUND";
      progress: number;
      message: string;
    }
  | {
      id: number;
      type: "result";
      alphaBuffer: ArrayBuffer;
      foregroundBuffer: ArrayBuffer;
      inferenceMs: number;
    }
  | {
      id: number;
      type: "error";
      error: string;
    };

interface WorkerScopeLike {
  onmessage: ((event: MessageEvent<BgRemovalWorkerRequest>) => void) | null;
  postMessage: (message: BgRemovalWorkerMessage, transfer?: Transferable[]) => void;
}

const workerScope = globalThis as unknown as WorkerScopeLike;

let sessionPromise: Promise<ort.InferenceSession> | null = null;

async function getOrCreateSession(id: number): Promise<ort.InferenceSession> {
  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    workerScope.postMessage({
      id,
      type: "progress",
      stage: "LOADING_ONNX_MODEL",
      progress: 20,
      message: "Loading local U-2-Netp segmentation runtime (4.4 MB)...",
    });

    const origin = globalThis.location.origin;
    ort.env.wasm.wasmPaths = {
      mjs: new URL("/wasm/ort/ort-wasm-simd-threaded.mjs", origin).href,
      wasm: new URL("/wasm/ort/ort-wasm-simd-threaded.wasm", origin).href,
    };
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    const modelUrl = new URL("/wasm/models/u2netp.onnx", origin).href;
    const response = await fetch(modelUrl, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`Failed to fetch local segmentation model (${response.status}).`);
    }

    const modelBytes = new Uint8Array(await response.arrayBuffer());
    return ort.InferenceSession.create(modelBytes, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
  })().catch((error) => {
    sessionPromise = null;
    throw error;
  });

  return sessionPromise;
}

function toOwnedBuffer(view: Uint8Array | Uint8ClampedArray): ArrayBuffer {
  if (
    view.buffer instanceof ArrayBuffer &&
    view.byteOffset === 0 &&
    view.byteLength === view.buffer.byteLength
  ) {
    return view.buffer;
  }
  return new Uint8Array(view).buffer;
}

workerScope.onmessage = async (event: MessageEvent<BgRemovalWorkerRequest>) => {
  const { id, width, height, rgbaBuffer } = event.data;
  const startedAt = performance.now();

  try {
    const session = await getOrCreateSession(id);

    workerScope.postMessage({
      id,
      type: "progress",
      stage: "REMOVING_BACKGROUND",
      progress: 55,
      message: "Running local ONNX foreground segmentation...",
    });

    const srcRgba = new Uint8ClampedArray(rgbaBuffer);
    const prepared = prepareU2NetInputTensor(
      srcRgba,
      width,
      height,
      U2NET_INPUT_SIZE
    );

    const inputName = session.inputNames[0] ?? "input.1";
    const outputName = session.outputNames[0] ?? "1959";

    const inputTensor = new ort.Tensor("float32", prepared.tensorData, [
      1,
      3,
      U2NET_INPUT_SIZE,
      U2NET_INPUT_SIZE,
    ]);

    let outputs: ort.InferenceSession.OnnxValueMapType | null = null;
    try {
      outputs = await session.run({ [inputName]: inputTensor });
      const outputTensor = outputs[outputName];
      if (!outputTensor || !(outputTensor.data instanceof Float32Array)) {
        throw new Error("Segmentation model did not return a float32 alpha tensor.");
      }

      workerScope.postMessage({
        id,
        type: "progress",
        stage: "REMOVING_BACKGROUND",
        progress: 85,
        message: "Compositing foreground alpha matte...",
      });

      const { alphaMask, foregroundRgba } = postprocessU2NetMask(
        outputTensor.data,
        srcRgba,
        prepared
      );

      const alphaBuffer = toOwnedBuffer(alphaMask);
      const foregroundBuffer = toOwnedBuffer(foregroundRgba);
      const inferenceMs = Math.max(1, Math.round(performance.now() - startedAt));

      workerScope.postMessage(
        {
          id,
          type: "result",
          alphaBuffer,
          foregroundBuffer,
          inferenceMs,
        },
        [alphaBuffer, foregroundBuffer]
      );
    } finally {
      inputTensor.dispose();
      if (outputs) {
        for (const tensor of Object.values(outputs)) {
          tensor.dispose();
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Background removal failed inside Web Worker.";
    workerScope.postMessage({
      id,
      type: "error",
      error: message,
    });
  }
};
