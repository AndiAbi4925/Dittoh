export type AsciiPresetId =
  | "standard"
  | "detailed"
  | "minimal"
  | "blocks"
  | "binary"
  | "custom";

export type AsciiColorMode = "monochrome" | "original" | "custom";

export interface AsciiConversionSettings {
  presetId: AsciiPresetId;
  customCharacters: string;
  columns: number;
  colorMode: AsciiColorMode;
  invert: boolean;
  customForegroundHex: string;
  customBackgroundHex: string;
  transparentBackground: boolean;
  fontSizePx: number;
  characterSpacingPx: number;
  aspectRatioCorrection: number;
  brightness: number;
  contrast: number;
  gamma: number;
  alphaThreshold: number;
}

export interface AsciiPresetDefinition {
  id: AsciiPresetId;
  label: string;
  ramp: string;
  description: string;
}

export interface AsciiGridResult {
  columns: number;
  rows: number;
  lines: string[];
  cellRgba: Uint8ClampedArray;
  backgroundColorHex: string | null;
  defaultForegroundHex: string;
  renderMs: number;
}

export type AsciiExportFormat = "png" | "txt" | "md" | "svg" | "html";

export interface AsciiExportConfig {
  targetWidthPx: number;
  fontSizePx: number;
  characterSpacingPx: number;
}

export interface SavedAsciiPreset {
  id: string;
  name: string;
  createdAt: string;
  settings: AsciiConversionSettings;
}

export interface AsciiHistoryEntry {
  id: string;
  fileName: string;
  format: string;
  columns: number;
  rows: number;
  previewText: string;
  createdAt: string;
  settings: AsciiConversionSettings;
}
