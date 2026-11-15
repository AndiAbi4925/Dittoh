"use client";

import { useMemo, useState } from "react";
import { IconDownloadBox } from "@/components/BrandMark";
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
import { PHASE2_VIDEO_CONSTRAINTS } from "@/lib/ascii/video-hook";

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
  { format: "png", label: ".PNG", spec: "RASTER ALPHA" },
  { format: "txt", label: ".TXT", spec: "SPACE PADDED" },
  { format: "md", label: ".MD", spec: "FENCED CODE" },
  { format: "svg", label: ".SVG", spec: "VECTOR TEXT" },
  { format: "html", label: ".HTML", spec: "STANDALONE" },
];

const WIDTH_PRESETS = [800, 1400, 2400, 3200] as const;

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
    <div className="border border-[#b1b3b3] bg-[#ffffff] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b1b3b3] pb-3">
        <div className="flex items-center gap-2.5">
          <IconDownloadBox className="h-4 w-4 text-[#000000]" />
          <div>
            <p className="font-mono text-[11px] tracking-widest text-[#d71921] uppercase">
              STAGE 05 / DETERMINISTIC EXPORTS
            </p>
            <h3 className="font-display text-lg text-[#000000]">
              EXPORT DIMENSIONS & FORMATS
            </h3>
          </div>
        </div>

        <button
          type="button"
          disabled={!grid}
          onClick={() => {
            void handleCopyText();
          }}
          className="dottoh-btn border border-[#000000] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:bg-[#000000] hover:text-[#ffffff] disabled:opacity-40"
        >
          {copied ? "COPIED ASCII" : "COPY RAW TXT"}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2 border border-[#b1b3b3] bg-[#f4f4f4] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <label htmlFor="export-width-px" className="uppercase text-[#000000]">
              OUTPUT WIDTH (PNG / SVG / HTML)
            </label>
            <span className="text-[#525252]">
              {outputDimensions
                ? `${outputDimensions.width} x ${outputDimensions.height} PX`
                : `${exportWidthPx} PX`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {WIDTH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeExportWidthPx(preset)}
                className={`dottoh-btn border px-2.5 py-1.5 text-[11px] ${
                  exportWidthPx === preset
                    ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                    : "border-[#b1b3b3] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                }`}
              >
                {preset}PX
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
              className="w-28 border border-[#b1b3b3] bg-[#ffffff] px-2.5 py-1.5 font-mono text-xs text-[#000000]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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
                className="dottoh-btn flex flex-col items-start border border-[#000000] bg-[#ffffff] px-3 py-2.5 text-left text-[#000000] hover:border-[#d71921] hover:bg-[#000000] hover:text-[#ffffff] disabled:opacity-40"
              >
                <span className="font-mono text-sm font-medium">
                  {busy ? "BUSY..." : item.label}
                </span>
                <span className="mt-0.5 font-mono text-[10px] opacity-70">
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
            className="border border-[#000000] bg-[#f4f4f4] px-3 py-2 font-mono text-xs text-[#000000]"
          >
            {exportNotice}
          </div>
        )}

        <div className="border-t border-[#b1b3b3] pt-3 font-mono text-[10px] uppercase text-[#525252]">
          MODULAR HOOK [PHASE 02]: VIDEO & GIF (
          {PHASE2_VIDEO_CONSTRAINTS.supportedInputExtensions.join("/")},{" "}
          {PHASE2_VIDEO_CONSTRAINTS.maxInputSizeBytes / (1024 * 1024)} MB CAP){" "}
          {PHASE2_VIDEO_CONSTRAINTS.enabled ? "ACTIVE" : "STANDBY PENDING BENCHMARKS"}
        </div>
      </div>
    </div>
  );
}
