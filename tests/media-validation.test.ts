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
const RAF_MAGIC = new Uint8Array([
  0x46, 0x55, 0x4a, 0x49, 0x46, 0x49, 0x4c, 0x4d,
  0x43, 0x43, 0x44, 0x2d, 0x52, 0x41, 0x57, 0x20,
]);
const CR3_MAGIC = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x63, 0x72, 0x78, 0x20,
]);
const EXE_MAGIC = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("media signature inspection and file validation", () => {
  it("identifies common raster, camera RAW, and HEIC signatures", () => {
    expect(inspectMagicBytes(PNG_MAGIC)).toBe("png");
    expect(inspectMagicBytes(JPEG_MAGIC)).toBe("jpeg");
    expect(inspectMagicBytes(TIFF_LE_MAGIC)).toBe("tiff");
    expect(inspectMagicBytes(RAF_MAGIC)).toBe("raf");
    expect(inspectMagicBytes(CR3_MAGIC)).toBe("isobmff-cr3");
    expect(inspectMagicBytes(EXE_MAGIC)).toBe("unknown");
  });

  it("rejects empty, oversized, deprecated, spoofed, and admin-disabled RAW files", () => {
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

    for (const removedExt of ["tiff", "bmp", "avif"]) {
      const removedRes = validateMediaFile(
        { name: `sample.${removedExt}`, size: 1024 },
        config
      );
      expect(removedRes.ok).toBe(false);
      if (!removedRes.ok) expect(removedRes.code).toBe("UNSUPPORTED_FORMAT");
    }

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
      { maxImageSizeMb: 50, enabledRawFormats: ["arw", "dng"] }
    );
    expect(disabledRaw.ok).toBe(false);
    if (!disabledRaw.ok) expect(disabledRaw.code).toBe("RAW_FORMAT_DISABLED");
  });

  it("accepts verified raster and camera RAW formats", () => {
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

    const cr3Res = validateMediaFile(
      { name: "canon-r6.cr3", size: 5_000_000, headerBytes: CR3_MAGIC },
      config
    );
    expect(cr3Res.ok).toBe(true);
    if (cr3Res.ok) {
      expect(cr3Res.kind).toBe("raw");
      expect(cr3Res.extension).toBe("cr3");
    }

    const rafRes = validateMediaFile(
      { name: "fuji.RAF", size: 6_500_000, headerBytes: RAF_MAGIC },
      config
    );
    expect(rafRes.ok).toBe(true);
    if (rafRes.ok) {
      expect(rafRes.kind).toBe("raw");
      expect(rafRes.extension).toBe("raf");
    }

    const accept = buildAcceptAttribute(["arw", "dng", "cr2", "cr3", "nef", "raf"]);
    expect(accept).toContain(".cr3");
    expect(accept).toContain(".raf");
    expect(accept).not.toContain(".bmp");
    expect(accept).not.toContain(".tiff");
    expect(accept).not.toContain(".avif");
  });

  it("confirms AGPL @imgly/background-removal is excluded and permissive WASM assets exist", () => {
    const root = process.cwd();
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8")
    ) as { dependencies?: Record<string, string> };

    expect(pkg.dependencies?.["@imgly/background-removal"]).toBeUndefined();
    expect(pkg.dependencies?.["onnxruntime-web"]).toBeDefined();
    expect(pkg.dependencies?.["libraw-wasm"]).toBeDefined();

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
