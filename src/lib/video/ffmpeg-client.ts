import {
  VideoProcessingError,
  type VideoExportFormat,
  type VideoPaletteMode,
} from "@/lib/video/types";

interface WorkerMessage {
  id: number;
  type: string;
  data?: unknown;
}

interface PendingTask {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

export interface FfmpegProgressEvent {
  progress: number;
  time: number;
}

export interface FfmpegLogEvent {
  type: string;
  message: string;
}

export function buildMp4EncodeArgs(options: {
  fps: number;
  pattern?: string;
  outputFile?: string;
}): string[] {
  const safeFps = Math.max(1, Math.min(12, Math.round(options.fps)));
  return [
    "-framerate",
    String(safeFps),
    "-i",
    options.pattern ?? "f_%04d.png",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "24",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    options.outputFile ?? "output.mp4",
  ];
}

export function buildGifEncodeArgs(options: {
  fps: number;
  paletteMode: VideoPaletteMode;
  pattern?: string;
  outputFile?: string;
}): string[] {
  const safeFps = Math.max(1, Math.min(12, Math.round(options.fps)));
  const filterGraph =
    options.paletteMode === "locked-palette"
      ? "split[s0][s1];[s0]palettegen=stats_mode=full:max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3"
      : "split[s0][s1];[s0]palettegen=stats_mode=single:max_colors=128[p];[s1][p]paletteuse=dither=floyd_steinberg:new=1";

  return [
    "-framerate",
    String(safeFps),
    "-i",
    options.pattern ?? "f_%04d.png",
    "-vf",
    filterGraph,
    "-loop",
    "0",
    options.outputFile ?? "output.gif",
  ];
}

export function buildExtractFramesArgs(options: {
  inputFile: string;
  outputFile?: string;
  trimStartSec: number;
  durationSec: number;
  fps: number;
  width: number;
  height: number;
}): string[] {
  const safeStart = Math.max(0, options.trimStartSec);
  const safeDuration = Math.max(0.25, options.durationSec);
  const safeFps = Math.max(1, Math.min(12, Math.round(options.fps)));
  const safeW = Math.max(8, Math.round(options.width));
  const safeH = Math.max(8, Math.round(options.height));

  return [
    "-ss",
    safeStart.toFixed(3),
    "-t",
    safeDuration.toFixed(3),
    "-i",
    options.inputFile,
    "-vf",
    `fps=${safeFps},scale=${safeW}:${safeH}:flags=area`,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    options.outputFile ?? "frames.raw",
  ];
}

export function resolveOutputMimeType(format: VideoExportFormat): string {
  return format === "mp4" ? "video/mp4" : "image/gif";
}

/**
 * Typed client communicating with the self-hosted /wasm/ffmpeg/worker.js module worker.
 * Never loads third-party CDNs and terminates cleanly on cancellation.
 */
export class FfmpegWorkerClient {
  private worker: Worker | null = null;
  private loaded = false;
  private nextId = 1;
  private pending = new Map<number, PendingTask>();
  private progressHandler: ((event: FfmpegProgressEvent) => void) | null = null;
  private logHandler: ((event: FfmpegLogEvent) => void) | null = null;

  onProgress(handler: ((event: FfmpegProgressEvent) => void) | null): void {
    this.progressHandler = handler;
  }

  onLog(handler: ((event: FfmpegLogEvent) => void) | null): void {
    this.logHandler = handler;
  }

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    const worker = new Worker("/wasm/ffmpeg/worker.js", { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { id, type, data } = event.data;
      if (type === "PROGRESS") {
        if (this.progressHandler && data && typeof data === "object") {
          const payload = data as Partial<FfmpegProgressEvent>;
          this.progressHandler({
            progress: typeof payload.progress === "number" ? payload.progress : 0,
            time: typeof payload.time === "number" ? payload.time : 0,
          });
        }
        return;
      }

      if (type === "LOG") {
        if (this.logHandler && data && typeof data === "object") {
          const payload = data as Partial<FfmpegLogEvent>;
          this.logHandler({
            type: typeof payload.type === "string" ? payload.type : "stderr",
            message: typeof payload.message === "string" ? payload.message : "",
          });
        }
        return;
      }

      const task = this.pending.get(id);
      if (!task) {
        return;
      }
      this.pending.delete(id);

      if (type === "ERROR") {
        task.reject(new Error(typeof data === "string" ? data : "FFmpeg worker error."));
        return;
      }

      task.resolve(data);
    };

    worker.onerror = (err: ErrorEvent) => {
      const error = new Error(err.message || "FFmpeg Web Worker crashed.");
      for (const task of this.pending.values()) {
        task.reject(error);
      }
      this.pending.clear();
    };

    this.worker = worker;
    return worker;
  }

  private send<T = unknown>(
    type: string,
    data: unknown,
    transfer: Transferable[] = [],
    signal?: AbortSignal
  ): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(
        new VideoProcessingError("CANCELLED", "Video processing cancelled.", true)
      );
    }

    const worker = this.ensureWorker();
    const id = this.nextId;
    this.nextId += 1;

    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        this.terminate();
        reject(
          new VideoProcessingError("CANCELLED", "Video processing cancelled.", true)
        );
      };

      if (signal) {
        signal.addEventListener("abort", onAbort, { once: true });
      }

      this.pending.set(id, {
        resolve: (value) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(value as T);
        },
        reject: (reason) => {
          signal?.removeEventListener("abort", onAbort);
          reject(reason);
        },
      });

      worker.postMessage({ id, type, data }, transfer);
    });
  }

  async load(signal?: AbortSignal): Promise<void> {
    if (this.loaded && this.worker) {
      return;
    }

    await this.send(
      "LOAD",
      {
        coreURL: "/wasm/ffmpeg/ffmpeg-core.js",
        wasmURL: "/wasm/ffmpeg/ffmpeg-core.wasm",
      },
      [],
      signal
    );
    this.loaded = true;
  }

  async writeFile(
    path: string,
    bytes: Uint8Array,
    signal?: AbortSignal
  ): Promise<void> {
    const copy = new Uint8Array(bytes);
    await this.send("WRITE_FILE", { path, data: copy }, [copy.buffer], signal);
  }

  async readFile(path: string, signal?: AbortSignal): Promise<Uint8Array> {
    const data = await this.send<Uint8Array | string>(
      "READ_FILE",
      { path },
      [],
      signal
    );
    if (data instanceof Uint8Array) {
      return data;
    }
    throw new VideoProcessingError(
      "ENCODE_FAILED",
      `Expected binary output reading ${path} from FFmpeg MEMFS.`,
      true
    );
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await this.send("DELETE_FILE", { path });
    } catch {
      // Ignore cleanup failures for missing scratch files.
    }
  }

  async exec(
    args: string[],
    timeoutMs = 120_000,
    signal?: AbortSignal
  ): Promise<number> {
    const exitCode = await this.send<number>(
      "EXEC",
      { args, timeout: timeoutMs },
      [],
      signal
    );
    return exitCode;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.loaded = false;
    for (const task of this.pending.values()) {
      task.reject(
        new VideoProcessingError("CANCELLED", "Video processing cancelled.", true)
      );
    }
    this.pending.clear();
  }
}
