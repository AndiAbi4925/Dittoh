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
    <div className="border border-[#d4d4d4] bg-[#ffffff] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] pb-3">
        <h3 className="font-sans text-base font-medium text-[#000000]">
          Saved styles &amp; history
        </h3>

        <div className="inline-flex border border-[#d4d4d4] bg-[#f4f4f4] p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            aria-pressed={activeTab === "presets"}
            className={`rounded-[2px] px-3 py-1 font-mono text-[11px] ${
              activeTab === "presets"
                ? "bg-[#000000] text-[#ffffff]"
                : "text-[#525252] hover:text-[#000000]"
            }`}
          >
            Styles ({savedPresets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            aria-pressed={activeTab === "history"}
            className={`rounded-[2px] px-3 py-1 font-mono text-[11px] ${
              activeTab === "history"
                ? "bg-[#000000] text-[#ffffff]"
                : "text-[#525252] hover:text-[#000000]"
            }`}
          >
            Recent ({history.length})
          </button>
        </div>
      </div>

      {activeTab === "presets" ? (
        <div className="mt-4 space-y-4">
          <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              aria-label="New style name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              maxLength={60}
              placeholder="Style name (e.g. Clean High Contrast)"
              className="flex-1 border border-[#d4d4d4] bg-[#ffffff] px-3 py-2 text-xs text-[#000000]"
            />
            <button
              type="submit"
              disabled={presetName.trim().length === 0}
              className="dottoh-btn border border-[#000000] bg-[#000000] px-4 py-2 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-40"
            >
              Save
            </button>
          </form>

          {savedPresets.length === 0 ? (
            <p className="border border-dashed border-[#d4d4d4] bg-[#f4f4f4] p-4 text-xs text-[#525252]">
              No saved styles yet. Give your current look a name above to reuse it
              later.
            </p>
          ) : (
            <ul className="space-y-2">
              {savedPresets.map((preset) => (
                <li
                  key={preset.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-[#e5e5e5] bg-[#f4f4f4] px-3 py-2.5"
                >
                  <div>
                    <p className="text-xs font-medium text-[#000000]">
                      {preset.name}
                    </p>
                    <p className="font-mono text-[10px] text-[#525252]">
                      {preset.settings.presetId} / {preset.settings.columns} wide
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onApplyPreset(preset.settings)}
                      className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#000000] hover:border-[#000000] hover:bg-[#000000] hover:text-[#ffffff]"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePreset(preset.id)}
                      className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#525252] hover:border-[#d71921] hover:text-[#d71921]"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-[#e5e5e5] bg-[#f4f4f4] p-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-[#000000]">
              <input
                type="checkbox"
                checked={historyEnabled}
                onChange={(e) => onToggleHistoryEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#d71921]"
              />
              <span>Remember recent exports in this browser</span>
            </label>

            <button
              type="button"
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#d71921] hover:text-[#d71921] disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {history.length === 0 ? (
            <p className="border border-dashed border-[#d4d4d4] bg-[#f4f4f4] p-4 text-xs text-[#525252]">
              No recent exports yet.
            </p>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="border border-[#e5e5e5] bg-[#f4f4f4] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-[#000000]">
                        {entry.fileName} ({entry.format})
                      </p>
                      <p className="font-mono text-[10px] text-[#525252]">
                        {entry.columns} x {entry.rows} /{" "}
                        {entry.createdAt.slice(0, 19).replace("T", " ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyHistoryEntry(entry)}
                      className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-2.5 py-1 text-[11px] text-[#000000] hover:border-[#000000] hover:bg-[#000000] hover:text-[#ffffff]"
                    >
                      Use style
                    </button>
                  </div>
                  {entry.previewText && (
                    <pre className="mt-2 max-h-16 overflow-hidden border border-[#e5e5e5] bg-[#ffffff] p-1.5 font-mono text-[9px] leading-tight text-[#525252]">
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
