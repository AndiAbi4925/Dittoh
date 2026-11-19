import { z } from "zod";
import { DEFAULT_ASCII_SETTINGS, sanitizeCharacterRamp } from "@/lib/ascii/presets";
import type {
  AsciiConversionSettings,
  AsciiHistoryEntry,
  SavedAsciiPreset,
} from "@/lib/ascii/types";
import { normalizeHexColor } from "@/lib/media/colors";

export const STORAGE_KEYS = {
  presets: "dittoh:custom-presets:v1",
  history: "dittoh:history:v1",
  historyEnabled: "dittoh:history-enabled:v1",
} as const;

const MAX_SAVED_PRESETS = 24;
const MAX_HISTORY_ENTRIES = 20;

const asciiPresetIdSchema = z.enum([
  "standard",
  "detailed",
  "minimal",
  "blocks",
  "binary",
  "custom",
]);

const asciiColorModeSchema = z.enum(["monochrome", "original", "custom"]);

const hexStringSchema = z
  .string()
  .transform((val) => normalizeHexColor(val) ?? "#000000");

const asciiSettingsSchema = z.object({
  presetId: asciiPresetIdSchema,
  customCharacters: z
    .string()
    .max(128)
    .transform((val) => sanitizeCharacterRamp(val).join("")),
  columns: z.number().finite().min(8).max(300).transform((n) => Math.round(n)),
  colorMode: asciiColorModeSchema,
  invert: z.boolean(),
  customForegroundHex: hexStringSchema,
  customBackgroundHex: hexStringSchema,
  transparentBackground: z.boolean(),
  fontSizePx: z.number().finite().min(6).max(36).transform((n) => Math.round(n)),
  characterSpacingPx: z.number().finite().min(0).max(16),
  aspectRatioCorrection: z.number().finite().min(0.25).max(1.5),
  brightness: z.number().finite().min(-100).max(100),
  contrast: z.number().finite().min(-100).max(100),
  gamma: z.number().finite().min(0.25).max(3.0),
  alphaThreshold: z.number().finite().min(0).max(254).transform((n) => Math.round(n)),
  dithering: z.boolean().default(false),
});

const savedPresetSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  createdAt: z.string().min(1).max(64),
  settings: asciiSettingsSchema,
});

const savedPresetListSchema = z.array(savedPresetSchema).max(MAX_SAVED_PRESETS);

const historyEntrySchema = z.object({
  id: z.string().min(1).max(64),
  fileName: z.string().min(1).max(80),
  format: z.string().min(1).max(24),
  columns: z.number().int().min(8).max(300),
  rows: z.number().int().min(1).max(480),
  previewText: z.string().max(4000),
  createdAt: z.string().min(1).max(64),
  settings: asciiSettingsSchema,
});

const historyListSchema = z.array(historyEntrySchema).max(MAX_HISTORY_ENTRIES);

function resolveStorage(customStorage?: Pick<Storage, "getItem" | "setItem" | "removeItem">): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  if (customStorage) {
    return customStorage;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createRecordId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}`;
}

function sanitizeLabel(input: string, fallback: string, maxLen = 60): string {
  const cleaned = input.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function cloneAsciiSettings(
  settings: AsciiConversionSettings
): AsciiConversionSettings {
  const parsed = asciiSettingsSchema.safeParse(settings);
  if (parsed.success) {
    return parsed.data;
  }
  return { ...DEFAULT_ASCII_SETTINGS };
}

export function loadSavedPresets(
  storageOverride?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): SavedAsciiPreset[] {
  const storage = resolveStorage(storageOverride);
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(STORAGE_KEYS.presets);
    if (!raw) {
      return [];
    }
    const decoded: unknown = JSON.parse(raw);
    const parsed = savedPresetListSchema.safeParse(decoded);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(
  rawName: string,
  settings: AsciiConversionSettings,
  storageOverride?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): SavedAsciiPreset[] {
  const storage = resolveStorage(storageOverride);
  const existing = loadSavedPresets(storage ?? undefined);
  const entry: SavedAsciiPreset = {
    id: createRecordId("preset"),
    name: sanitizeLabel(rawName, "Custom Preset", 60),
    createdAt: new Date().toISOString(),
    settings: cloneAsciiSettings(settings),
  };

  const deduped = existing.filter(
    (item) => item.name.toLowerCase() !== entry.name.toLowerCase()
  );
  const next = [entry, ...deduped].slice(0, MAX_SAVED_PRESETS);

  if (storage) {
    try {
      storage.setItem(STORAGE_KEYS.presets, JSON.stringify(next));
    } catch {
      return existing;
    }
  }
  return next;
}

export function deleteCustomPreset(
  presetId: string,
  storageOverride?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): SavedAsciiPreset[] {
  const storage = resolveStorage(storageOverride);
  const existing = loadSavedPresets(storage ?? undefined);
  const next = existing.filter((item) => item.id !== presetId);
  if (storage) {
    try {
      storage.setItem(STORAGE_KEYS.presets, JSON.stringify(next));
    } catch {
      return existing;
    }
  }
  return next;
}

export function loadHistoryPreference(
  storageOverride?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): boolean {
  const storage = resolveStorage(storageOverride);
  if (!storage) {
    return true;
  }
  try {
    const raw = storage.getItem(STORAGE_KEYS.historyEnabled);
    if (raw === "false") {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function saveHistoryPreference(
  enabled: boolean,
  storageOverride?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): void {
  const storage = resolveStorage(storageOverride);
  if (!storage) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEYS.historyEnabled, enabled ? "true" : "false");
  } catch {
    // Ignore storage quota / privacy mode failures cleanly.
  }
}

export function loadAsciiHistory(
  storageOverride?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): AsciiHistoryEntry[] {
  const storage = resolveStorage(storageOverride);
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(STORAGE_KEYS.history);
    if (!raw) {
      return [];
    }
    const decoded: unknown = JSON.parse(raw);
    const parsed = historyListSchema.safeParse(decoded);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function appendAsciiHistory(
  input: {
    fileName: string;
    format: string;
    columns: number;
    rows: number;
    lines: string[];
    settings: AsciiConversionSettings;
  },
  storageOverride?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): AsciiHistoryEntry[] {
  const storage = resolveStorage(storageOverride);
  const existing = loadAsciiHistory(storage ?? undefined);
  const snippet = input.lines
    .slice(0, 10)
    .map((line) => line.slice(0, 72))
    .join("\n")
    .slice(0, 1200);

  const entry: AsciiHistoryEntry = {
    id: createRecordId("hist"),
    fileName: sanitizeLabel(input.fileName, "untitled", 80),
    format: sanitizeLabel(input.format, "ASCII", 24),
    columns: Math.max(8, Math.min(300, Math.round(input.columns))),
    rows: Math.max(1, Math.min(480, Math.round(input.rows))),
    previewText: snippet,
    createdAt: new Date().toISOString(),
    settings: cloneAsciiSettings(input.settings),
  };

  const next = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  if (storage) {
    try {
      storage.setItem(STORAGE_KEYS.history, JSON.stringify(next));
    } catch {
      return existing;
    }
  }
  return next;
}

export function clearAsciiHistory(
  storageOverride?: Pick<Storage, "getItem" | "setItem" | "removeItem">
): AsciiHistoryEntry[] {
  const storage = resolveStorage(storageOverride);
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEYS.history);
    } catch {
      // Ignore storage failures cleanly.
    }
  }
  return [];
}
