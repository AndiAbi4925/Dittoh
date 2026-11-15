import { convertRgbaToAsciiGrid } from "@/lib/ascii/engine";
import type { AsciiConversionSettings } from "@/lib/ascii/types";

export interface AsciiWorkerRequest {
  id: number;
  rgbaBuffer: ArrayBuffer;
  width: number;
  height: number;
  settings: AsciiConversionSettings;
}

export type AsciiWorkerResponse =
  | {
      id: number;
      ok: true;
      columns: number;
      rows: number;
      lines: string[];
      cellRgbaBuffer: ArrayBuffer;
      backgroundColorHex: string | null;
      defaultForegroundHex: string;
      renderMs: number;
    }
  | {
      id: number;
      ok: false;
      error: string;
    };

interface WorkerScopeLike {
  onmessage: ((event: MessageEvent<AsciiWorkerRequest>) => void) | null;
  postMessage: (message: AsciiWorkerResponse, transfer?: Transferable[]) => void;
}

const workerScope = globalThis as unknown as WorkerScopeLike;

function toOwnedBuffer(bytes: Uint8ClampedArray): ArrayBuffer {
  if (
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) {
    return bytes.buffer;
  }
  return bytes.slice().buffer;
}

workerScope.onmessage = (event: MessageEvent<AsciiWorkerRequest>) => {
  const { id, rgbaBuffer, width, height, settings } = event.data;

  try {
    const rgba = new Uint8ClampedArray(rgbaBuffer);
    const grid = convertRgbaToAsciiGrid(rgba, width, height, settings);
    const ownedCellBuffer = toOwnedBuffer(grid.cellRgba);

    workerScope.postMessage(
      {
        id,
        ok: true,
        columns: grid.columns,
        rows: grid.rows,
        lines: grid.lines,
        cellRgbaBuffer: ownedCellBuffer,
        backgroundColorHex: grid.backgroundColorHex,
        defaultForegroundHex: grid.defaultForegroundHex,
        renderMs: grid.renderMs,
      },
      [ownedCellBuffer]
    );
  } catch (err) {
    workerScope.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : "ASCII conversion worker failed.",
    });
  }
};
