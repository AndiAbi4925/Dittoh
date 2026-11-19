"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ASCII_PRESETS, resolvePresetRamp } from "@/lib/ascii/presets";
import type { AsciiColorMode, AsciiConversionSettings } from "@/lib/ascii/types";
import { isValidHexColor, normalizeHexColor } from "@/lib/media/colors";

interface AsciiControlsPanelProps {
  settings: AsciiConversionSettings;
  settingsEpoch: number;
  onChange: (next: AsciiConversionSettings) => void;
  onReset: () => void;
}

interface HexInputControlProps {
  label: string;
  value: string;
  disabled?: boolean;
  onValidHex: (hex: string) => void;
}

function HexInputControl({
  label,
  value,
  disabled = false,
  onValidHex,
}: HexInputControlProps) {
  const [draft, setDraft] = useState(value);
  const valid = isValidHexColor(draft);

  const handleChange = (raw: string) => {
    setDraft(raw);
    const normalized = normalizeHexColor(raw);
    if (normalized) {
      onValidHex(normalized);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-xs text-[#525252]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          disabled={disabled}
          value={normalizeHexColor(value) ?? "#000000"}
          onChange={(e) => handleChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer border border-[#d4d4d4] bg-[#ffffff] p-0.5 disabled:opacity-40"
        />
        <input
          type="text"
          aria-label={`${label} hex value`}
          disabled={disabled}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => {
            if (!isValidHexColor(draft)) {
              setDraft(value);
            }
          }}
          maxLength={7}
          placeholder="#000000"
          className={`w-full border px-2.5 py-2 font-mono text-xs text-[#000000] disabled:bg-[#f4f4f4] disabled:opacity-40 ${
            valid ? "border-[#d4d4d4]" : "border-[#d71921]"
          }`}
        />
      </div>
    </div>
  );
}

export function AsciiControlsPanel({
  settings,
  settingsEpoch,
  onChange,
  onReset,
}: AsciiControlsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const patch = (partial: Partial<AsciiConversionSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const activeRampPreview = resolvePresetRamp(
    settings.presetId,
    settings.customCharacters
  ).join("");

  return (
    <div className="border border-[#d4d4d4] bg-[#ffffff] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] pb-3.5">
        <h2 className="font-sans text-lg font-medium text-[#000000]">
          Look &amp; Style
        </h2>

        <button
          type="button"
          onClick={onReset}
          className="dittoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#000000]"
        >
          Reset
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#000000]">
              Character style
            </span>
            <span className="max-w-[160px] truncate font-mono text-[11px] text-[#525252]">
              {activeRampPreview}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ASCII_PRESETS.map((preset) => {
              const active = settings.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patch({ presetId: preset.id })}
                  className={`dittoh-btn border px-2.5 py-2 text-left text-[11px] ${
                    active
                      ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                      : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="ascii-columns-range" className="font-medium text-[#000000]">
              Detail
            </label>
            <span className="font-mono text-[#525252]">{settings.columns} wide</span>
          </div>
          <input
            id="ascii-columns-range"
            type="range"
            min={16}
            max={260}
            step={2}
            value={settings.columns}
            onChange={(e) => patch({ columns: Number(e.target.value) })}
            className="w-full accent-[#d71921]"
          />
          <div className="flex justify-between font-mono text-[10px] text-[#525252]">
            <span>Simple</span>
            <span>Balanced</span>
            <span>Detailed</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <span className="block text-xs font-medium text-[#000000]">Colors</span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "monochrome", label: "Black & White" },
                { id: "original", label: "Photo Colors" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((mode: { id: AsciiColorMode; label: string }) => {
              const active = settings.colorMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patch({ colorMode: mode.id })}
                  className={`dittoh-btn border px-2 py-2 text-[11px] ${
                    active
                      ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                      : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          {settings.colorMode === "custom" && (
            <div className="grid grid-cols-1 gap-3 border border-[#e5e5e5] bg-[#f4f4f4] p-3 sm:grid-cols-2">
              <HexInputControl
                key={`fg-${settingsEpoch}`}
                label="Text color"
                value={settings.customForegroundHex}
                onValidHex={(hex) => patch({ customForegroundHex: hex })}
              />
              <HexInputControl
                key={`bg-${settingsEpoch}`}
                label="Background color"
                value={settings.customBackgroundHex}
                disabled={settings.transparentBackground}
                onValidHex={(hex) => patch({ customBackgroundHex: hex })}
              />
            </div>
          )}

          {settings.colorMode === "original" && (
            <div className="border border-[#e5e5e5] bg-[#f4f4f4] p-3">
              <HexInputControl
                key={`orig-bg-${settingsEpoch}`}
                label="Background color"
                value={settings.customBackgroundHex}
                disabled={settings.transparentBackground}
                onValidHex={(hex) => patch({ customBackgroundHex: hex })}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-between gap-3 border border-[#e5e5e5] bg-[#f4f4f4] px-3 py-2.5">
            <span className="text-xs text-[#000000]">Flip light &amp; dark</span>
            <input
              type="checkbox"
              checked={settings.invert}
              onChange={(e) => patch({ invert: e.target.checked })}
              className="h-4 w-4 accent-[#d71921]"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 border border-[#e5e5e5] bg-[#f4f4f4] px-3 py-2.5">
            <span className="text-xs text-[#000000]">Transparent background</span>
            <input
              type="checkbox"
              checked={settings.transparentBackground}
              onChange={(e) => patch({ transparentBackground: e.target.checked })}
              className="h-4 w-4 accent-[#d71921]"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 border border-[#e5e5e5] bg-[#f4f4f4] px-3 py-2.5 sm:col-span-2">
            <span className="text-xs text-[#000000]">Smooth shading (dither)</span>
            <input
              type="checkbox"
              checked={Boolean(settings.dithering)}
              onChange={(e) => patch({ dithering: e.target.checked })}
              className="h-4 w-4 accent-[#d71921]"
            />
          </label>
        </div>

        <div className="border-t border-[#e5e5e5] pt-4">
          <button
            type="button"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="dittoh-btn flex w-full items-center justify-between border border-[#d4d4d4] bg-[#ffffff] px-3.5 py-2.5 text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
          >
            <span>More options</span>
            <span className="font-mono text-[#d71921]">
              {showAdvanced ? "Hide" : "Show"}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4 border border-[#e5e5e5] bg-[#f4f4f4] p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="ascii-custom-chars"
                        className="text-xs text-[#000000]"
                      >
                        Custom characters (light to dark)
                      </label>
                      {settings.presetId !== "custom" && (
                        <button
                          type="button"
                          onClick={() => patch({ presetId: "custom" })}
                          className="font-mono text-[10px] text-[#d71921] underline"
                        >
                          Use custom
                        </button>
                      )}
                    </div>
                    <input
                      id="ascii-custom-chars"
                      type="text"
                      maxLength={128}
                      value={settings.customCharacters}
                      onChange={(e) =>
                        patch({
                          presetId: "custom",
                          customCharacters: e.target.value,
                        })
                      }
                      placeholder=" .:+*#%@"
                      className="w-full border border-[#d4d4d4] bg-[#ffffff] px-3 py-2 font-mono text-xs text-[#000000]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label htmlFor="ascii-font-size">Text size</label>
                        <span className="font-mono">{settings.fontSizePx} px</span>
                      </div>
                      <input
                        id="ascii-font-size"
                        type="range"
                        min={6}
                        max={28}
                        step={1}
                        value={settings.fontSizePx}
                        onChange={(e) =>
                          patch({ fontSizePx: Number(e.target.value) })
                        }
                        className="w-full accent-[#d71921]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label htmlFor="ascii-char-spacing">Letter spacing</label>
                        <span className="font-mono">
                          {settings.characterSpacingPx.toFixed(1)} px
                        </span>
                      </div>
                      <input
                        id="ascii-char-spacing"
                        type="range"
                        min={0}
                        max={10}
                        step={0.5}
                        value={settings.characterSpacingPx}
                        onChange={(e) =>
                          patch({ characterSpacingPx: Number(e.target.value) })
                        }
                        className="w-full accent-[#d71921]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label htmlFor="ascii-aspect">Height balance</label>
                        <span className="font-mono">
                          {settings.aspectRatioCorrection.toFixed(2)}
                        </span>
                      </div>
                      <input
                        id="ascii-aspect"
                        type="range"
                        min={0.3}
                        max={1.1}
                        step={0.02}
                        value={settings.aspectRatioCorrection}
                        onChange={(e) =>
                          patch({ aspectRatioCorrection: Number(e.target.value) })
                        }
                        className="w-full accent-[#d71921]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label htmlFor="ascii-brightness">Brightness</label>
                        <span className="font-mono">{settings.brightness}</span>
                      </div>
                      <input
                        id="ascii-brightness"
                        type="range"
                        min={-80}
                        max={80}
                        step={2}
                        value={settings.brightness}
                        onChange={(e) =>
                          patch({ brightness: Number(e.target.value) })
                        }
                        className="w-full accent-[#d71921]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label htmlFor="ascii-contrast">Contrast</label>
                        <span className="font-mono">{settings.contrast}</span>
                      </div>
                      <input
                        id="ascii-contrast"
                        type="range"
                        min={-80}
                        max={80}
                        step={2}
                        value={settings.contrast}
                        onChange={(e) =>
                          patch({ contrast: Number(e.target.value) })
                        }
                        className="w-full accent-[#d71921]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label htmlFor="ascii-gamma">Midtones</label>
                        <span className="font-mono">{settings.gamma.toFixed(2)}</span>
                      </div>
                      <input
                        id="ascii-gamma"
                        type="range"
                        min={0.3}
                        max={2.6}
                        step={0.05}
                        value={settings.gamma}
                        onChange={(e) => patch({ gamma: Number(e.target.value) })}
                        className="w-full accent-[#d71921]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-[#e5e5e5] pt-3">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="ascii-alpha">Transparency cutoff</label>
                      <span className="font-mono">{settings.alphaThreshold}</span>
                    </div>
                    <input
                      id="ascii-alpha"
                      type="range"
                      min={0}
                      max={240}
                      step={4}
                      value={settings.alphaThreshold}
                      onChange={(e) =>
                        patch({ alphaThreshold: Number(e.target.value) })
                      }
                      className="w-full accent-[#d71921]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
