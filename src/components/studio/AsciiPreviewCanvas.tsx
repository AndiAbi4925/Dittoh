"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeGridMetrics,
  exportAsciiAsTxt,
  renderAsciiToCanvas,
  resolveSafeExportConfig,
} from "@/lib/ascii/exporters";
import type { AsciiConversionSettings, AsciiGridResult } from "@/lib/ascii/types";

interface AsciiPreviewCanvasProps {
  grid: AsciiGridResult | null;
  settings: AsciiConversionSettings;
  isRendering: boolean;
  fileName: string;
  exportWidthPx: number;
}

export function AsciiPreviewCanvas({
  grid,
  settings,
  isRendering,
  fileName,
  exportWidthPx,
}: AsciiPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<"canvas" | "text">("canvas");
  const [zoomMode, setZoomMode] = useState<"fit" | "actual">("fit");
  const [showChecker, setShowChecker] = useState(true);

  const renderedSize = useMemo(() => {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid || surfaceMode !== "canvas") {
      return;
    }

    const dpr =
      typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;

    renderAsciiToCanvas(canvas, grid, {
      targetWidthPx: exportWidthPx,
      fontSizePx: settings.fontSizePx,
      characterSpacingPx: settings.characterSpacingPx,
      showCheckerboardOnTransparent:
        settings.transparentBackground && showChecker,
      pixelRatio: dpr,
    });
  }, [
    exportWidthPx,
    grid,
    settings.characterSpacingPx,
    settings.fontSizePx,
    settings.transparentBackground,
    showChecker,
    surfaceMode,
  ]);

  const rawText = useMemo(() => {
    if (!grid || surfaceMode !== "text") {
      return "";
    }
    return exportAsciiAsTxt(grid);
  }, [grid, surfaceMode]);

  return (
    <div className="border border-[#d4d4d4] bg-[#ffffff]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] bg-[#f4f4f4] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-[2px] ${
              isRendering ? "bg-[#d71921]" : "bg-[#000000]"
            }`}
          />
          <span className="font-mono text-xs text-[#000000]">Preview</span>
          <span className="hidden truncate max-w-[180px] font-mono text-[11px] text-[#525252] sm:inline">
            {fileName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex border border-[#d4d4d4] bg-[#ffffff] p-0.5">
            <button
              type="button"
              onClick={() => setSurfaceMode("canvas")}
              aria-pressed={surfaceMode === "canvas"}
              className={`rounded-[2px] px-2.5 py-1 font-mono text-[11px] ${
                surfaceMode === "canvas"
                  ? "bg-[#000000] text-[#ffffff]"
                  : "text-[#525252] hover:text-[#000000]"
              }`}
            >
              Image
            </button>
            <button
              type="button"
              onClick={() => setSurfaceMode("text")}
              aria-pressed={surfaceMode === "text"}
              className={`rounded-[2px] px-2.5 py-1 font-mono text-[11px] ${
                surfaceMode === "text"
                  ? "bg-[#000000] text-[#ffffff]"
                  : "text-[#525252] hover:text-[#000000]"
              }`}
            >
              Text
            </button>
          </div>

          {surfaceMode === "canvas" && (
            <div className="inline-flex border border-[#d4d4d4] bg-[#ffffff] p-0.5">
              <button
                type="button"
                onClick={() => setZoomMode("fit")}
                aria-pressed={zoomMode === "fit"}
                className={`rounded-[2px] px-2.5 py-1 font-mono text-[11px] ${
                  zoomMode === "fit"
                    ? "bg-[#000000] text-[#ffffff]"
                    : "text-[#525252] hover:text-[#000000]"
                }`}
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoomMode("actual")}
                aria-pressed={zoomMode === "actual"}
                className={`rounded-[2px] px-2.5 py-1 font-mono text-[11px] ${
                  zoomMode === "actual"
                    ? "bg-[#000000] text-[#ffffff]"
                    : "text-[#525252] hover:text-[#000000]"
                }`}
              >
                1:1
              </button>
            </div>
          )}

          {settings.transparentBackground && surfaceMode === "canvas" && (
            <button
              type="button"
              onClick={() => setShowChecker((prev) => !prev)}
              aria-pressed={showChecker}
              className={`rounded-[2px] border px-2.5 py-1 font-mono text-[11px] ${
                showChecker
                  ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                  : "border-[#d4d4d4] bg-[#ffffff] text-[#525252]"
              }`}
            >
              Grid {showChecker ? "on" : "off"}
            </button>
          )}
        </div>
      </div>

      <div className="relative min-h-[280px] max-h-[560px] overflow-auto bg-[#fafafa] p-4">
        {!grid && (
          <div className="flex min-h-[240px] items-center justify-center text-sm text-[#525252]">
            {isRendering ? "Updating preview..." : "Waiting for a photo"}
          </div>
        )}

        {grid && surfaceMode === "canvas" && (
          <div
            className={`flex items-start ${
              zoomMode === "fit" ? "justify-center" : "justify-start"
            }`}
          >
            <canvas
              ref={canvasRef}
              aria-label={`ASCII preview (${grid.columns} by ${grid.rows} characters)`}
              className={
                zoomMode === "fit"
                  ? "h-auto max-h-[500px] w-auto max-w-full border border-[#e5e5e5]"
                  : "h-auto w-auto max-w-none border border-[#e5e5e5]"
              }
            />
          </div>
        )}

        {grid && surfaceMode === "text" && (
          <pre
            className="overflow-auto border border-[#e5e5e5] p-3 font-mono leading-[1.18] whitespace-pre"
            style={{
              backgroundColor: grid.backgroundColorHex ?? "transparent",
              color: grid.defaultForegroundHex,
              fontSize: `${settings.fontSizePx}px`,
              letterSpacing: `${settings.characterSpacingPx}px`,
            }}
          >
            {rawText}
          </pre>
        )}
      </div>

      <div
        aria-live="polite"
        className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e5e5e5] bg-[#f4f4f4] px-4 py-2 font-mono text-[11px] text-[#525252]"
      >
        <span>
          Size:{" "}
          <strong className="font-normal text-[#000000]">
            {grid ? `${grid.columns} x ${grid.rows} characters` : "..."}
          </strong>
        </span>
        <span>
          Image:{" "}
          <strong className="font-normal text-[#000000]">
            {renderedSize ? `${renderedSize.width} x ${renderedSize.height} px` : "..."}
          </strong>
        </span>
      </div>
    </div>
  );
}
