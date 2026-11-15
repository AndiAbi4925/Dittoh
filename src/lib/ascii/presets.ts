import type {
  AsciiConversionSettings,
  AsciiPresetDefinition,
  AsciiPresetId,
} from "@/lib/ascii/types";

export const ASCII_PRESETS: readonly AsciiPresetDefinition[] = [
  {
    id: "standard",
    label: "STANDARD ASCII",
    ramp: " .:-=+*#%@",
    description: "Balanced 10-step classical density ramp.",
  },
  {
    id: "detailed",
    label: "DETAILED",
    ramp: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    description: "High-precision 70-glyph tonal range for portraits and textures.",
  },
  {
    id: "minimal",
    label: "MINIMAL",
    ramp: " .oO#",
    description: "Crisp 5-step geometric dot-matrix ramp.",
  },
  {
    id: "blocks",
    label: "BLOCKS",
    ramp: " \u2591\u2592\u2593\u2588",
    description: "Solid Unicode shade blocks for bold poster graphics.",
  },
  {
    id: "binary",
    label: "BINARY",
    ramp: " 01",
    description: "Stark machine bit-stream 0/1 silhouette.",
  },
  {
    id: "custom",
    label: "CUSTOM",
    ramp: " .+*#",
    description: "Define a bespoke ordered glyph sequence.",
  },
] as const;

export const DEFAULT_ASCII_SETTINGS: AsciiConversionSettings = {
  presetId: "standard",
  customCharacters: " .:+*#%@",
  columns: 100,
  colorMode: "monochrome",
  invert: false,
  customForegroundHex: "#000000",
  customBackgroundHex: "#ffffff",
  transparentBackground: false,
  fontSizePx: 12,
  characterSpacingPx: 0,
  aspectRatioCorrection: 0.52,
  brightness: 0,
  contrast: 0,
  gamma: 1.0,
  alphaThreshold: 16,
};

/**
 * Strips non-printable control characters so user-entered ramps cannot break
 * layout or smuggle control bytes into plain/vector/HTML exports.
 */
export function sanitizeCharacterRamp(rawInput: string): string[] {
  const cleaned = rawInput.replace(/[\u0000-\u001f\u007f]/g, "");
  const glyphs = Array.from(cleaned);
  if (glyphs.length >= 2) {
    return glyphs.slice(0, 128);
  }
  return Array.from(" .+*#");
}

export function resolvePresetRamp(
  presetId: AsciiPresetId,
  customCharacters: string
): string[] {
  if (presetId === "custom") {
    return sanitizeCharacterRamp(customCharacters);
  }
  const found = ASCII_PRESETS.find((preset) => preset.id === presetId);
  return Array.from(found?.ramp ?? ASCII_PRESETS[0]?.ramp ?? " .:-=+*#%@");
}
