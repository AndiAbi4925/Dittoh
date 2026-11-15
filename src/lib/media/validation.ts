import {
  DEFAULT_ENABLED_RAW_FORMATS,
  DEFAULT_MAX_IMAGE_SIZE_MB,
  SUPPORTED_RASTER_EXTENSIONS,
  SUPPORTED_RAW_EXTENSIONS,
} from "@/lib/constants";
import type {
  MediaFormatKind,
  MediaValidationConfig,
  MediaValidationResult,
  SupportedMediaExtension,
  SupportedRasterExtension,
  SupportedRawExtension,
} from "@/lib/media/types";

export interface MediaFileCandidate {
  name: string;
  size: number;
  type?: string;
  headerBytes?: Uint8Array;
}

export type SignatureCategory =
  | "png"
  | "jpeg"
  | "webp"
  | "tiff"
  | "isobmff-heic"
  | "isobmff-cr3"
  | "isobmff-generic"
  | "raf"
  | "unknown";

const RASTER_SET = new Set<string>(SUPPORTED_RASTER_EXTENSIONS);
const RAW_SET = new Set<string>(SUPPORTED_RAW_EXTENSIONS);

const MIME_BY_EXTENSION: Record<SupportedMediaExtension, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  arw: "image/x-sony-arw",
  dng: "image/x-adobe-dng",
  cr2: "image/x-canon-cr2",
  cr3: "image/x-canon-cr3",
  nef: "image/x-nikon-nef",
  raf: "image/x-fuji-raf",
};

const EXTENSION_BY_MIME: Record<string, SupportedMediaExtension> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/x-sony-arw": "arw",
  "image/x-adobe-dng": "dng",
};

function matchesAscii(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) {
    return false;
  }
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[offset + i] !== text.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

function startsWithBytes(bytes: Uint8Array, expected: readonly number[]): boolean {
  if (bytes.length < expected.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (bytes[i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

export function extractFileExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return "";
  }
  return trimmed.slice(lastDot + 1).toLowerCase();
}

export function inspectMagicBytes(bytes: Uint8Array): SignatureCategory {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return "jpeg";
  }
  if (matchesAscii(bytes, 0, "RIFF") && matchesAscii(bytes, 8, "WEBP")) {
    return "webp";
  }
  if (
    startsWithBytes(bytes, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWithBytes(bytes, [0x4d, 0x4d, 0x00, 0x2a]) ||
    startsWithBytes(bytes, [0x49, 0x49, 0x2b, 0x00])
  ) {
    return "tiff";
  }
  if (matchesAscii(bytes, 0, "FUJIFILMCCD-RAW")) {
    return "raf";
  }
  if (bytes.length >= 12 && matchesAscii(bytes, 4, "ftyp")) {
    const brand = String.fromCharCode(
      bytes[8] ?? 0,
      bytes[9] ?? 0,
      bytes[10] ?? 0,
      bytes[11] ?? 0
    ).toLowerCase();
    if (brand === "crx ") {
      return "isobmff-cr3";
    }
    if (
      brand === "heic" ||
      brand === "heix" ||
      brand === "hevc" ||
      brand === "hevx" ||
      brand === "mif1" ||
      brand === "msf1"
    ) {
      return "isobmff-heic";
    }
    return "isobmff-generic";
  }
  return "unknown";
}

function matchesExpectedSignature(
  extension: SupportedMediaExtension,
  signature: SignatureCategory
): boolean {
  switch (extension) {
    case "png":
      return signature === "png";
    case "jpg":
    case "jpeg":
      return signature === "jpeg";
    case "webp":
      return signature === "webp";
    case "arw":
    case "dng":
    case "cr2":
    case "nef":
      return signature === "tiff";
    case "raf":
      return signature === "raf";
    case "heic":
    case "heif":
      return signature === "isobmff-heic" || signature === "isobmff-generic";
    case "cr3":
      return signature === "isobmff-cr3" || signature === "isobmff-generic";
  }
}

export function classifyFormatKind(
  extension: SupportedMediaExtension
): MediaFormatKind {
  if (RAW_SET.has(extension)) {
    return "raw";
  }
  if (extension === "heic" || extension === "heif") {
    return "heic";
  }
  return "raster";
}

export function getDefaultValidationConfig(): MediaValidationConfig {
  return {
    maxImageSizeMb: DEFAULT_MAX_IMAGE_SIZE_MB,
    enabledRawFormats: [...DEFAULT_ENABLED_RAW_FORMATS],
  };
}

export function buildAcceptAttribute(enabledRawFormats: readonly string[]): string {
  const normalizedRaw = new Set(enabledRawFormats.map((f) => f.toLowerCase().trim()));
  const parts: string[] = [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".heic",
    ".heif",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  for (const rawExt of SUPPORTED_RAW_EXTENSIONS) {
    if (normalizedRaw.has(rawExt)) {
      parts.push(`.${rawExt}`);
    }
  }
  return parts.join(",");
}

export function validateMediaFile(
  candidate: MediaFileCandidate,
  config: MediaValidationConfig = getDefaultValidationConfig()
): MediaValidationResult {
  if (candidate.size <= 0) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      message: "This file is empty. Please pick another photo.",
    };
  }

  const maxBytes = config.maxImageSizeMb * 1024 * 1024;
  if (candidate.size > maxBytes) {
    const actualMb = (candidate.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `This file is ${actualMb} MB, which is over the ${config.maxImageSizeMb} MB limit.`,
    };
  }

  const extFromName = extractFileExtension(candidate.name);
  const normalizedMime = (candidate.type ?? "").trim().toLowerCase();
  const extFromMime = EXTENSION_BY_MIME[normalizedMime];
  const resolvedExt = extFromName || extFromMime || "";

  if (!resolvedExt) {
    return {
      ok: false,
      code: "UNSUPPORTED_FORMAT",
      message:
        "We could not recognize that image type. Use PNG, JPG, JPEG, WebP, HEIC, HEIF, or a camera RAW file.",
    };
  }

  const isRaster = RASTER_SET.has(resolvedExt);
  const isRaw = RAW_SET.has(resolvedExt);

  if (!isRaster && !isRaw) {
    const enabledRawLabel =
      config.enabledRawFormats.length > 0
        ? ` (${config.enabledRawFormats.map((f) => `.${f.toUpperCase()}`).join(", ")})`
        : "";
    return {
      ok: false,
      code: "UNSUPPORTED_FORMAT",
      message: `.${resolvedExt.toUpperCase()} files are not supported. Use PNG, JPG, JPEG, WebP, HEIC, HEIF, or RAW${enabledRawLabel}.`,
    };
  }

  if (isRaw) {
    const enabledSet = new Set(
      config.enabledRawFormats.map((item) => item.trim().toLowerCase())
    );
    if (!enabledSet.has(resolvedExt)) {
      const enabledLabel =
        enabledSet.size > 0
          ? Array.from(enabledSet)
              .map((item) => `.${item.toUpperCase()}`)
              .join(", ")
          : "none";
      return {
        ok: false,
        code: "RAW_FORMAT_DISABLED",
        message: `.${resolvedExt.toUpperCase()} camera files are not turned on yet. Supported RAW formats right now: ${enabledLabel}. You can also convert the photo to DNG, PNG, or JPG.`,
      };
    }
  }

  const typedExt = resolvedExt as SupportedRasterExtension | SupportedRawExtension;

  if (candidate.headerBytes && candidate.headerBytes.length > 0) {
    const detected = inspectMagicBytes(candidate.headerBytes);
    if (!matchesExpectedSignature(typedExt, detected)) {
      return {
        ok: false,
        code: "SIGNATURE_MISMATCH",
        message: `This file does not look like a real .${typedExt.toUpperCase()} photo. Try opening and re-saving it first.`,
      };
    }
  }

  return {
    ok: true,
    extension: typedExt,
    mimeType: normalizedMime || MIME_BY_EXTENSION[typedExt],
    kind: classifyFormatKind(typedExt),
    sizeBytes: candidate.size,
  };
}
