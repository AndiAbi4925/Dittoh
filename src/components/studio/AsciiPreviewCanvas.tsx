"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeGridMetrics,
  exportAsciiAsTxt,
  renderAsciiToCanvas,
  resolveSafeExportConfig,
} from "@/lib/ascii/exporters";
import type { AsciiConversionSettings, AsciiGridResult } from "@/lib/ascii/types";
import type { DecodedImagePayload } from "@/lib/media/types";

interface AsciiPreviewCanvasProps {
  grid: AsciiGridResult | null;
  settings: AsciiConversionSettings;
  isRendering: boolean;
  fileName: string;
  exportWidthPx: number;
  compareImage?: Pick<DecodedImagePayload, "width" | "height" | "rgba"> | null;
}

export function AsciiPreviewCanvas({
  grid,
  settings,
  isRendering,
  fileName,
  exportWidthPx,
  compareImage = null,
}: AsciiPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compareFrameRef = useRef<HTMLDivElement | null>(null);
  const [surfaceMode, setSurfaceMode] = useState<"canvas" | "text">("canvas");
  const [zoomMode, setZoomMode] = useState<"fit" | "actual">("fit");
  const [showChecker, setShowChecker] = useState(true);
  const [compareActive, setCompareActive] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

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

  useEffect(() => {
    const compareCanvas = compareCanvasRef.current;
    if (
      !compareCanvas ||
      !compareImage ||
      !compareActive ||
      surfaceMode !== "canvas"
    ) {
      return;
    }

    const { width, height, rgba } = compareImage;
    if (width <= 0 || height <= 0) {
      return;
    }

    compareCanvas.width = width;
    compareCanvas.height = height;
    const ctx = compareCanvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (settings.transparentBackground && showChecker) {
      const cell = Math.max(8, Math.round(Math.min(width, height) / 36));
      ctx.fillStyle = "#ececec";
      for (let y = 0; y < height; y += cell) {
        for (let x = 0; x < width; x += cell) {
          if (((x / cell + y / cell) & 1) === 1) {
            ctx.fillRect(x, y, cell, cell);
          }
        }
      }
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) {
      return;
    }

    const imageData = offCtx.createImageData(width, height);
    imageData.data.set(rgba);
    offCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(offscreen, 0, 0);
  }, [
    compareActive,
    compareImage,
    settings.transparentBackground,
    showChecker,
    surfaceMode,
  ]);

  const updateSplitFromClientX = (clientX: number) => {
    const frame = compareFrameRef.current;
    if (!frame) {
      return;
    }
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.min(100, Math.max(0, pct)));
  };

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

          {compareImage && surfaceMode === "canvas" && (
            <button
              type="button"
              onClick={() => setCompareActive((prev) => !prev)}
              aria-pressed={compareActive}
              className={`rounded-[2px] border px-2.5 py-1 font-mono text-[11px] ${
                compareActive
                  ? "border-[#d71921] bg-[#d71921] text-[#ffffff]"
                  : "border-[#d4d4d4] bg-[#ffffff] text-[#525252] hover:border-[#000000] hover:text-[#000000]"
              }`}
            >
              Compare
            </button>
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
            <div
              ref={compareFrameRef}
              onPointerDown={
                compareActive && compareImage
                  ? (e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setIsDraggingSplit(true);
                      updateSplitFromClientX(e.clientX);
                    }
                  : undefined
              }
              onPointerMove={
                compareActive && compareImage && isDraggingSplit
                  ? (e) => {
                      updateSplitFromClientX(e.clientX);
                    }
                  : undefined
              }
              onPointerUp={
                compareActive && compareImage
                  ? () => {
                      setIsDraggingSplit(false);
                    }
                  : undefined
              }
              onPointerCancel={
                compareActive && compareImage
                  ? () => {
                      setIsDraggingSplit(false);
                    }
                  : undefined
              }
              className={`relative max-w-full ${
                compareActive && compareImage ? "touch-none select-none cursor-ew-resize" : ""
              }`}
            >
              <canvas
                ref={canvasRef}
                aria-label={`ASCII preview (${grid.columns} by ${grid.rows} characters)`}
                className={
                  zoomMode === "fit"
                    ? "block h-auto max-h-[500px] w-auto max-w-full border border-[#e5e5e5]"
                    : "block h-auto w-auto max-w-none border border-[#e5e5e5]"
                }
              />

              {compareActive && compareImage && (
                <>
                  <canvas
                    ref={compareCanvasRef}
                    aria-hidden="true"
                    style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
                    className="pointer-events-none absolute inset-0 block h-full w-full"
                  />

                  <span className="pointer-events-none absolute top-2 left-2 rounded-[2px] border border-[#000000] bg-[#ffffff]/90 px-1.5 py-0.5 font-mono text-[10px] text-[#000000]">
                    Original
                  </span>
                  <span className="pointer-events-none absolute top-2 right-2 rounded-[2px] border border-[#000000] bg-[#000000]/85 px-1.5 py-0.5 font-mono text-[10px] text-[#ffffff]">
                    ASCII
                  </span>

                  <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Comparison split position"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(splitPercent)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                        e.preventDefault();
                        setSplitPercent((prev) => Math.max(0, prev - 5));
                      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                        e.preventDefault();
                        setSplitPercent((prev) => Math.min(100, prev + 5));
                      } else if (e.key === "Home") {
                        e.preventDefault();
                        setSplitPercent(0);
                      } else if (e.key === "End") {
                        e.preventDefault();
                        setSplitPercent(100);
                      }
                    }}
                    style={{ left: `${splitPercent}%` }}
                    className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-[#d71921] focus:outline-none"
                  >
                    <span className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2px] border border-[#000000] bg-[#ffffff] font-mono text-[10px] text-[#000000] shadow-xs">
                      {"<>"}
                    </span>
                  </div>
                </>
              )}
            </div>
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
