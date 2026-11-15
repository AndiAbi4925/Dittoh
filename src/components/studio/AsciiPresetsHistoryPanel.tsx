"use client";

import { useState } from "react";
import type {
  AsciiConversionSettings,
  AsciiHistoryEntry,
  SavedAsciiPreset,
} from "@/lib/ascii/types";

interface AsciiPresetsHistoryPanelProps {
  savedPresets: SavedAsciiPreset[];
  history: AsciiHistoryEntry[];
  historyEnabled: boolean;
  onSavePreset: (name: string) => void;
  onApplyPreset: (settings: AsciiConversionSettings) => void;
  onDeletePreset: (id: string) => void;
  onToggleHistoryEnabled: (enabled: boolean) => void;
  onClearHistory: () => void;
  onApplyHistoryEntry: (entry: AsciiHistoryEntry) => void;
}

export function AsciiPresetsHistoryPanel({
  savedPresets,
  history,
  historyEnabled,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  onToggleHistoryEnabled,
  onClearHistory,
  onApplyHistoryEntry,
}: AsciiPresetsHistoryPanelProps) {
  const [presetName, setPresetName] = useState("");
  const [activeTab, setActiveTab] = useState<"presets" | "history">("presets");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = presetName.trim();
    if (!trimmed) {
      return;
    }
    onSavePreset(trimmed);
    setPresetName("");
  };

  return (
    <div className="border border-[#b1b3b3] bg-[#ffffff] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b1b3b3] pb-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-[#d71921] uppercase">
            BROWSER LOCALSTORAGE VAULT
          </p>
          <h3 className="font-display text-lg text-[#000000]">
            PRESETS & SESSION HISTORY
          </h3>
        </div>

        <div className="inline-flex border border-[#b1b3b3] bg-[#f4f4f4] p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            aria-pressed={activeTab === "presets"}
            className={`rounded-[2px] px-3 py-1 font-mono text-[11px] uppercase ${
              activeTab === "presets"
                ? "bg-[#000000] text-[#ffffff]"
                : "text-[#525252] hover:text-[#000000]"
            }`}
          >
            PRESETS ({savedPresets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            aria-pressed={activeTab === "history"}
            className={`rounded-[2px] px-3 py-1 font-mono text-[11px] uppercase ${
              activeTab === "history"
                ? "bg-[#000000] text-[#ffffff]"
                : "text-[#525252] hover:text-[#000000]"
            }`}
          >
            HISTORY ({history.length})
          </button>
        </div>
      </div>

      {activeTab === "presets" ? (
        <div className="mt-4 space-y-4">
          <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              aria-label="New custom preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              maxLength={60}
              placeholder="Name current setup (e.g. Film Grain 140c)"
              className="flex-1 border border-[#b1b3b3] bg-[#ffffff] px-3 py-2 font-mono text-xs text-[#000000]"
            />
            <button
              type="submit"
              disabled={presetName.trim().length === 0}
              className="dottoh-btn border border-[#000000] bg-[#000000] px-4 py-2 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-40"
            >
              SAVE PRESET
            </button>
          </form>

          {savedPresets.length === 0 ? (
            <p className="border border-dashed border-[#b1b3b3] bg-[#f4f4f4] p-4 font-mono text-xs text-[#525252]">
              No saved custom presets yet. Adjust controls and store configurations locally here.
            </p>
          ) : (
            <ul className="space-y-2">
              {savedPresets.map((preset) => (
                <li
                  key={preset.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-[#b1b3b3] bg-[#f4f4f4] px-3 py-2.5"
                >
                  <div>
                    <p className="font-mono text-xs text-[#000000]">
                      {preset.name}
                    </p>
                    <p className="font-mono text-[10px] text-[#525252] uppercase">
                      {preset.settings.presetId} / {preset.settings.columns} COLS /{" "}
                      {preset.settings.colorMode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApplyPreset(preset.settings)}
                      className="dottoh-btn border border-[#000000] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#000000] hover:bg-[#000000] hover:text-[#ffffff]"
                    >
                      APPLY
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePreset(preset.id)}
                      className="dottoh-btn border border-[#b1b3b3] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#525252] hover:border-[#d71921] hover:text-[#d71921]"
                    >
                      DELETE
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-[#b1b3b3] bg-[#f4f4f4] p-3">
            <label className="flex cursor-pointer items-center gap-2.5 font-mono text-xs text-[#000000] uppercase">
              <input
                type="checkbox"
                checked={historyEnabled}
                onChange={(e) => onToggleHistoryEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#d71921]"
              />
              <span>LOG LOCAL CONVERSION HISTORY</span>
            </label>

            <button
              type="button"
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="dottoh-btn border border-[#b1b3b3] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#d71921] hover:text-[#d71921] disabled:opacity-40"
            >
              CLEAR HISTORY
            </button>
          </div>

          {history.length === 0 ? (
            <p className="border border-dashed border-[#b1b3b3] bg-[#f4f4f4] p-4 font-mono text-xs text-[#525252]">
              Local export history is empty. Settings snapshots are recorded only in browser localStorage when enabled.
            </p>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="border border-[#b1b3b3] bg-[#f4f4f4] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-[#000000]">
                        {entry.fileName} [{entry.format}]
                      </p>
                      <p className="font-mono text-[10px] text-[#525252]">
                        {entry.columns} x {entry.rows} GLYPHS /{" "}
                        {entry.createdAt.slice(0, 19).replace("T", " ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyHistoryEntry(entry)}
                      className="dottoh-btn border border-[#000000] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#000000] hover:bg-[#000000] hover:text-[#ffffff]"
                    >
                      LOAD SETTINGS
                    </button>
                  </div>
                  {entry.previewText && (
                    <pre className="mt-2 max-h-16 overflow-hidden border border-[#e0e0e0] bg-[#ffffff] p-1.5 font-mono text-[9px] leading-tight text-[#525252]">
                      {entry.previewText}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
