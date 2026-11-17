"use client";

import { useMemo, useState } from "react";
import {
  computeGridMetrics,
  exportAsciiAsTxt,
  resolveSafeExportConfig,
} from "@/lib/ascii/exporters";
import type {
  AsciiConversionSettings,
  AsciiExportFormat,
  AsciiGridResult,
} from "@/lib/ascii/types";

interface AsciiExportPanelProps {
  grid: AsciiGridResult | null;
  settings: AsciiConversionSettings;
  exportWidthPx: number;
  onChangeExportWidthPx: (widthPx: number) => void;
  onExport: (format: AsciiExportFormat) => Promise<void>;
  isExporting: AsciiExportFormat | null;
  exportNotice: string | null;
}

const EXPORT_FORMATS: ReadonlyArray<{
  format: AsciiExportFormat;
  label: string;
  spec: string;
}> = [
  { format: "png", label: "PNG", spec: "Image" },
  { format: "txt", label: "TXT", spec: "Plain text" },
  { format: "md", label: "MD", spec: "Markdown" },
  { format: "svg", label: "SVG", spec: "Vector" },
  { format: "html", label: "HTML", spec: "Webpage" },
];

const WIDTH_PRESETS = [800, 1400, 2400, 3200] as const;
const CHAT_CHARACTER_LIMIT = 2000;

export function AsciiExportPanel({
  grid,
  settings,
  exportWidthPx,
  onChangeExportWidthPx,
  onExport,
  isExporting,
  exportNotice,
}: AsciiExportPanelProps) {
  const [copied, setCopied] = useState(false);

  const plainTextLength = useMemo(() => {
    if (!grid) {
      return 0;
    }
    return exportAsciiAsTxt(grid).length;
  }, [grid]);

  const fitsChatLimit = plainTextLength > 0 && plainTextLength <= CHAT_CHARACTER_LIMIT;

  const outputDimensions = useMemo(() => {
    if (!grid) {
      return null;
    }
    const config = resolveSafeExportConfig(grid, {
      targetWidthPx: exportWidthPx,
      fontSizePx: settings.fontSizePx,
      characterSpacingPx: settings.characterSpacingPx,
    });
    const metrics = computeGridMetrics(grid, config);
    return { width: metrics.width, height: metrics.height };
  }, [exportWidthPx, grid, settings.characterSpacingPx, settings.fontSizePx]);

  const handleCopyText = async () => {
    if (!grid || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(exportAsciiAsTxt(grid));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="border border-[#d4d4d4] bg-[#ffffff] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
        <div>
          <h2 className="font-sans text-lg font-medium text-[#000000]">
            Download or Copy
          </h2>
          <p className="mt-1 text-xs text-[#525252]">
            Copy plain text or pick a file format below.
          </p>
        </div>

        <button
          type="button"
          disabled={!grid}
          onClick={() => {
            void handleCopyText();
          }}
          className="dottoh-btn border border-[#000000] bg-[#000000] px-5 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-40"
        >
          {copied ? "Copied!" : "Copy Text"}
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {grid && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 border px-4 py-2.5 text-xs ${
              fitsChatLimit
                ? "border-[#e5e5e5] bg-[#f4f4f4] text-[#000000]"
                : "border-[#d71921] bg-[#ffffff] text-[#d71921]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-[2px] ${
                  fitsChatLimit ? "bg-[#000000]" : "bg-[#d71921]"
                }`}
              />
              <span>
                {fitsChatLimit
                  ? "Fits Discord and chat messages (under 2,000 characters)."
                  : "Over 2,000 characters. Lower Detail on Step 3 for Discord or chat paste, or download a file."}
              </span>
            </div>
            <span className="font-mono text-[11px] tabular-nums">
              {plainTextLength.toLocaleString()} / {CHAT_CHARACTER_LIMIT.toLocaleString()} chars
            </span>
          </div>
        )}

        <div className="space-y-2.5 border border-[#e5e5e5] bg-[#f4f4f4] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <label htmlFor="export-width-px" className="font-medium text-[#000000]">
              Image width (PNG, SVG, HTML)
            </label>
            <span className="font-mono text-[#525252]">
              {outputDimensions
                ? `${outputDimensions.width} x ${outputDimensions.height} px`
                : `${exportWidthPx} px`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {WIDTH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeExportWidthPx(preset)}
                className={`dottoh-btn border px-3 py-1.5 text-[11px] ${
                  exportWidthPx === preset
                    ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                    : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                }`}
              >
                {preset}px
              </button>
            ))}
            <input
              id="export-width-px"
              type="number"
              min={240}
              max={4096}
              step={20}
              value={exportWidthPx}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (Number.isFinite(parsed)) {
                  onChangeExportWidthPx(Math.max(240, Math.min(4096, parsed)));
                }
              }}
              className="w-24 border border-[#d4d4d4] bg-[#ffffff] px-2.5 py-1.5 font-mono text-xs text-[#000000]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {EXPORT_FORMATS.map((item) => {
            const busy = isExporting === item.format;
            return (
              <button
                key={item.format}
                type="button"
                disabled={!grid || isExporting !== null}
                onClick={() => {
                  void onExport(item.format);
                }}
                className="dottoh-btn flex flex-col items-start border border-[#d4d4d4] bg-[#ffffff] px-4 py-3.5 text-left text-[#000000] hover:border-[#000000] hover:bg-[#000000] hover:text-[#ffffff] disabled:opacity-40"
              >
                <span className="font-mono text-sm font-medium">
                  {busy ? "Saving..." : item.label}
                </span>
                <span className="mt-0.5 text-[11px] opacity-70">
                  {item.spec}
                </span>
              </button>
            );
          })}
        </div>

        {exportNotice && (
          <div
            role="status"
            aria-live="polite"
            className="border border-[#000000] bg-[#f4f4f4] px-4 py-2.5 text-xs text-[#000000]"
          >
            {exportNotice}
          </div>
        )}
      </div>
    </div>
  );
}
