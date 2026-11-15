import { convertRgbaToAsciiGrid } from "@/lib/ascii/engine";
import type { AsciiConversionSettings, AsciiGridResult } from "@/lib/ascii/types";
import type {
  AsciiWorkerRequest,
  AsciiWorkerResponse,
} from "@/workers/ascii-render.worker";

interface PendingRequest {
  resolve: (grid: AsciiGridResult) => void;
  reject: (err: Error) => void;
}

export class AsciiWorkerClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  private ensureWorker(): Worker | null {
    if (typeof Worker === "undefined") {
      return null;
    }
    if (this.worker) {
      return this.worker;
    }

    const worker = new Worker(
      new URL("../../workers/ascii-render.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<AsciiWorkerResponse>) => {
      const payload = event.data;
      const entry = this.pending.get(payload.id);
      if (!entry) {
        return;
      }
      this.pending.delete(payload.id);

      if (!payload.ok) {
        entry.reject(new Error(payload.error));
        return;
      }

      entry.resolve({
        columns: payload.columns,
        rows: payload.rows,
        lines: payload.lines,
        cellRgba: new Uint8ClampedArray(payload.cellRgbaBuffer),
        backgroundColorHex: payload.backgroundColorHex,
        defaultForegroundHex: payload.defaultForegroundHex,
        renderMs: payload.renderMs,
      });
    };

    worker.onerror = () => {
      for (const entry of this.pending.values()) {
        entry.reject(new Error("ASCII Web Worker encountered an execution error."));
      }
      this.pending.clear();
      this.worker = null;
    };

    this.worker = worker;
    return worker;
  }

  public async render(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    settings: AsciiConversionSettings
  ): Promise<AsciiGridResult> {
    const worker = this.ensureWorker();
    if (!worker) {
      return convertRgbaToAsciiGrid(rgba, width, height, settings);
    }

    const id = this.nextId++;
    const rgbaCopy = rgba.slice();
    const request: AsciiWorkerRequest = {
      id,
      rgbaBuffer: rgbaCopy.buffer,
      width,
      height,
      settings,
    };

    return new Promise<AsciiGridResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage(request, [request.rgbaBuffer]);
    });
  }

  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const entry of this.pending.values()) {
      entry.reject(new Error("ASCII worker disposed."));
    }
    this.pending.clear();
  }
}
