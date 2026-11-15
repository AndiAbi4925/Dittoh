import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAcceptAttribute,
  getDefaultValidationConfig,
  inspectMagicBytes,
  validateMediaFile,
} from "@/lib/media/validation";

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const TIFF_LE_MAGIC = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x08, 0, 0, 0, 0, 0, 0, 0]);
const EXE_MAGIC = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]);
const AVIF_MAGIC = new Uint8Array([
  0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
]);

describe("media signature inspection and file validation", () => {
  it("identifies common raster, TIFF/RAW, and ISOBMFF signatures", () => {
    expect(inspectMagicBytes(PNG_MAGIC)).toBe("png");
    expect(inspectMagicBytes(JPEG_MAGIC)).toBe("jpeg");
    expect(inspectMagicBytes(TIFF_LE_MAGIC)).toBe("tiff");
    expect(inspectMagicBytes(AVIF_MAGIC)).toBe("isobmff-avif");
    expect(inspectMagicBytes(EXE_MAGIC)).toBe("unknown");
  });

  it("rejects empty, oversized, spoofed, and disabled RAW files", () => {
    const config = getDefaultValidationConfig();

    const emptyRes = validateMediaFile(
      { name: "empty.png", size: 0, type: "image/png" },
      config
    );
    expect(emptyRes.ok).toBe(false);
    if (!emptyRes.ok) expect(emptyRes.code).toBe("EMPTY_FILE");

    const hugeRes = validateMediaFile(
      {
        name: "huge.png",
        size: 51 * 1024 * 1024,
        type: "image/png",
        headerBytes: PNG_MAGIC,
      },
      config
    );
    expect(hugeRes.ok).toBe(false);
    if (!hugeRes.ok) expect(hugeRes.code).toBe("FILE_TOO_LARGE");

    const spoofedRes = validateMediaFile(
      {
        name: "payload.png",
        size: 1024,
        type: "image/png",
        headerBytes: EXE_MAGIC,
      },
      config
    );
    expect(spoofedRes.ok).toBe(false);
    if (!spoofedRes.ok) expect(spoofedRes.code).toBe("SIGNATURE_MISMATCH");

    const disabledRaw = validateMediaFile(
      {
        name: "canon.cr2",
        size: 2048,
        headerBytes: TIFF_LE_MAGIC,
      },
      config
    );
    expect(disabledRaw.ok).toBe(false);
    if (!disabledRaw.ok) expect(disabledRaw.code).toBe("RAW_FORMAT_DISABLED");
  });

  it("accepts verified raster and enabled RAW formats", () => {
    const config = getDefaultValidationConfig();

    const pngRes = validateMediaFile(
      { name: "photo.png", size: 4096, type: "image/png", headerBytes: PNG_MAGIC },
      config
    );
    expect(pngRes.ok).toBe(true);
    if (pngRes.ok) {
      expect(pngRes.kind).toBe("raster");
      expect(pngRes.extension).toBe("png");
    }

    const arwRes = validateMediaFile(
      { name: "sony-shot.ARW", size: 12_000_000, headerBytes: TIFF_LE_MAGIC },
      config
    );
    expect(arwRes.ok).toBe(true);
    if (arwRes.ok) {
      expect(arwRes.kind).toBe("raw");
      expect(arwRes.extension).toBe("arw");
    }

    const accept = buildAcceptAttribute(["arw", "dng"]);
    expect(accept).toContain(".arw");
    expect(accept).toContain(".dng");
    expect(accept).not.toContain(".cr3");
  });

  it("confirms AGPL @imgly/background-removal is excluded and permissive WASM assets exist", () => {
    const root = process.cwd();
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8")
    ) as { dependencies?: Record<string, string> };

    expect(pkg.dependencies?.["@imgly/background-removal"]).toBeUndefined();
    expect(pkg.dependencies?.["onnxruntime-web"]).toBeDefined();
    expect(pkg.dependencies?.["libraw-wasm"]).toBeDefined();
    expect(pkg.dependencies?.["utif"]).toBeDefined();

    expect(
      fs.existsSync(path.join(root, "public/wasm/models/u2netp.onnx"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(root, "public/wasm/libraw/libraw.wasm"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(root, "public/wasm/THIRD-PARTY-LICENSES.txt"))
    ).toBe(true);

    for (const wasmJs of ["public/wasm/libraw/worker.js", "public/wasm/libraw/libraw.js"]) {
      const content = fs.readFileSync(path.join(root, wasmJs), "utf8");
      expect(content).not.toMatch(/\bnew\s+Function\b/);
      expect(content).not.toMatch(/\beval\s*\(/);
    }
  });
});
