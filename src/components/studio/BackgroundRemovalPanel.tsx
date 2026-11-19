"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  compositeRgbaBackground,
  isValidHexColor,
  normalizeHexColor,
  resolveBackgroundFill,
} from "@/lib/media/colors";
import {
  applyBrushMask,
  applyMagicWandMask,
  createCutoutFromMask,
  createInitialAlphaMask,
  invertAlphaMask,
  type ManualMaskAction,
  type ManualMaskTool,
  type RgbSeed,
  samplePixelRgb,
} from "@/lib/media/manual-mask";
import type {
  BackgroundFillMode,
  BackgroundFillOption,
  BackgroundRemovalResult,
  DecodedImagePayload,
} from "@/lib/media/types";

type PanelTool = "view" | ManualMaskTool;

interface CursorReticle {
  cssX: number;
  cssY: number;
  cssRadiusPx: number;
}

interface BackgroundRemovalPanelProps {
  decoded: DecodedImagePayload;
  cutout: BackgroundRemovalResult | null;
  useCutout: boolean;
  fill: BackgroundFillOption;
  isBusy: boolean;
  onRunCutout: () => void;
  onApplyManualCutout?: (result: BackgroundRemovalResult) => void;
  onToggleUseCutout: (enabled: boolean) => void;
  onChangeFill: (fill: BackgroundFillOption) => void;
  onResetCutout: () => void;
}

const MAX_UNDO_STEPS = 12;

const CHECKERBOARD_STYLE = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
} as const;

export function BackgroundRemovalPanel({
  decoded,
  cutout,
  useCutout,
  fill,
  isBusy,
  onRunCutout,
  onApplyManualCutout,
  onToggleUseCutout,
  onChangeFill,
  onResetCutout,
}: BackgroundRemovalPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workingMaskRef = useRef<Uint8Array | null>(null);
  const strokeImageDataRef = useRef<ImageData | null>(null);
  const strokeSeedRef = useRef<RgbSeed | undefined>(undefined);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const preStrokeSnapshotRef = useRef<BackgroundRemovalResult | null>(null);
  const hasSnapshotRef = useRef(false);
  const isDrawingRef = useRef(false);
  const rafDrawPendingRef = useRef(false);

  const [viewMode, setViewMode] = useState<"original" | "cutout">(
    cutout && useCutout ? "cutout" : "original"
  );
  const [zoomActual, setZoomActual] = useState(false);
  const [hexDraft, setHexDraft] = useState<string>(fill.customHex || "#000000");

  const [activeTool, setActiveTool] = useState<PanelTool>("view");
  const [maskAction, setMaskAction] = useState<ManualMaskAction>("erase");
  const [tolerance, setTolerance] = useState(32);
  const [brushRadius, setBrushRadius] = useState(28);
  const [contiguousWand, setContiguousWand] = useState(true);
  const [softEdges, setSoftEdges] = useState(true);
  const [undoStack, setUndoStack] = useState<Array<BackgroundRemovalResult | null>>(
    []
  );
  const [cursorReticle, setCursorReticle] = useState<CursorReticle | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const effectiveViewMode =
    cutout && viewMode === "cutout" ? "cutout" : "original";

  const displayRgba = useMemo(() => {
    if (effectiveViewMode === "cutout" && cutout) {
      return compositeRgbaBackground(cutout.foregroundRgba, fill);
    }
    return decoded.rgba;
  }, [cutout, decoded.rgba, effectiveViewMode, fill]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const imageData = ctx.createImageData(decoded.width, decoded.height);
    imageData.data.set(displayRgba);
    ctx.putImageData(imageData, 0, 0);
  }, [decoded.height, decoded.width, displayRgba]);

  const pushUndoSnapshot = useCallback(
    (previous: BackgroundRemovalResult | null) => {
      setUndoStack((prev) => {
        const snapshot = previous
          ? {
              width: previous.width,
              height: previous.height,
              alphaMask: new Uint8Array(previous.alphaMask),
              foregroundRgba: new Uint8ClampedArray(previous.foregroundRgba),
              inferenceMs: previous.inferenceMs,
            }
          : null;
        const next = [...prev, snapshot];
        return next.length > MAX_UNDO_STEPS
          ? next.slice(next.length - MAX_UNDO_STEPS)
          : next;
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (isBusy || undoStack.length === 0) {
      return;
    }
    const previous = undoStack[undoStack.length - 1] ?? null;
    setUndoStack((prev) => prev.slice(0, -1));
    if (previous === null) {
      setViewMode("original");
      onResetCutout();
    } else {
      setViewMode("cutout");
      onApplyManualCutout?.(previous);
    }
  }, [isBusy, onApplyManualCutout, onResetCutout, undoStack]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== "z") {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (undoStack.length > 0 && !isBusy) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, isBusy, undoStack.length]);

  const flushStrokeCanvas = useCallback(() => {
    rafDrawPendingRef.current = false;
    const canvas = canvasRef.current;
    const mask = workingMaskRef.current;
    if (!canvas || !mask) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    if (
      !strokeImageDataRef.current ||
      strokeImageDataRef.current.width !== decoded.width ||
      strokeImageDataRef.current.height !== decoded.height
    ) {
      strokeImageDataRef.current = ctx.createImageData(
        decoded.width,
        decoded.height
      );
    }

    const imgData = strokeImageDataRef.current;
    const data = imgData.data;
    const src = decoded.rgba;
    const bg = resolveBackgroundFill(fill);
    const pixelCount = mask.length;

    for (let i = 0; i < pixelCount; i += 1) {
      const idx = i * 4;
      const srcR = src[idx] ?? 0;
      const srcG = src[idx + 1] ?? 0;
      const srcB = src[idx + 2] ?? 0;
      const srcA = src[idx + 3] ?? 255;
      const effectiveA = Math.min(srcA, mask[i] ?? 255);

      if (!bg) {
        data[idx] = srcR;
        data[idx + 1] = srcG;
        data[idx + 2] = srcB;
        data[idx + 3] = effectiveA;
      } else if (effectiveA === 255) {
        data[idx] = srcR;
        data[idx + 1] = srcG;
        data[idx + 2] = srcB;
        data[idx + 3] = 255;
      } else if (effectiveA === 0) {
        data[idx] = bg.r;
        data[idx + 1] = bg.g;
        data[idx + 2] = bg.b;
        data[idx + 3] = 255;
      } else {
        const inv = 255 - effectiveA;
        data[idx] = Math.round((srcR * effectiveA + bg.r * inv) / 255);
        data[idx + 1] = Math.round((srcG * effectiveA + bg.g * inv) / 255);
        data[idx + 2] = Math.round((srcB * effectiveA + bg.b * inv) / 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [decoded.height, decoded.rgba, decoded.width, fill]);

  const scheduleStrokeFlush = useCallback(() => {
    if (rafDrawPendingRef.current) {
      return;
    }
    rafDrawPendingRef.current = true;
    window.requestAnimationFrame(flushStrokeCanvas);
  }, [flushStrokeCanvas]);

  const mapPointerToImage = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const scaleX = decoded.width / rect.width;
    const scaleY = decoded.height / rect.height;
    const cssX = Math.min(rect.width, Math.max(0, clientX - rect.left));
    const cssY = Math.min(rect.height, Math.max(0, clientY - rect.top));
    return {
      imgX: cssX * scaleX,
      imgY: cssY * scaleY,
      cssX,
      cssY,
      cssRadiusPx: Math.max(2, brushRadius / Math.max(scaleX, scaleY)),
    };
  };

  const getStartingMask = () => {
    if (cutout) {
      return new Uint8Array(cutout.alphaMask);
    }
    return createInitialAlphaMask(decoded.rgba, decoded.width, decoded.height);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === "view" || isBusy) {
      return;
    }
    const mapped = mapPointerToImage(e.clientX, e.clientY);
    if (!mapped) {
      return;
    }

    setCursorReticle({
      cssX: mapped.cssX,
      cssY: mapped.cssY,
      cssRadiusPx: mapped.cssRadiusPx,
    });

    if (activeTool === "wand") {
      pushUndoSnapshot(cutout);
      const startMask = getStartingMask();
      const nextMask = applyMagicWandMask({
        srcRgba: decoded.rgba,
        alphaMask: startMask,
        width: decoded.width,
        height: decoded.height,
        seedX: mapped.imgX,
        seedY: mapped.imgY,
        tolerance,
        action: maskAction,
        contiguous: contiguousWand,
        feather: softEdges,
      });
      setViewMode("cutout");
      onApplyManualCutout?.(
        createCutoutFromMask(decoded, nextMask, cutout?.inferenceMs ?? 0)
      );
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const startMask = getStartingMask();
    workingMaskRef.current = startMask;
    preStrokeSnapshotRef.current = cutout;
    hasSnapshotRef.current = true;
    isDrawingRef.current = true;
    lastPointRef.current = { x: mapped.imgX, y: mapped.imgY };
    strokeSeedRef.current = samplePixelRgb(
      decoded.rgba,
      decoded.width,
      decoded.height,
      mapped.imgX,
      mapped.imgY
    );

    applyBrushMask({
      srcRgba: decoded.rgba,
      alphaMask: startMask,
      width: decoded.width,
      height: decoded.height,
      x0: mapped.imgX,
      y0: mapped.imgY,
      x1: mapped.imgX,
      y1: mapped.imgY,
      radius: brushRadius,
      action: maskAction,
      smart: activeTool === "smart-brush",
      tolerance,
      seedColor: strokeSeedRef.current,
      targetMaskInPlace: startMask,
    });

    scheduleStrokeFlush();
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === "view" || isBusy) {
      return;
    }
    const mapped = mapPointerToImage(e.clientX, e.clientY);
    if (!mapped) {
      return;
    }

    setCursorReticle({
      cssX: mapped.cssX,
      cssY: mapped.cssY,
      cssRadiusPx: mapped.cssRadiusPx,
    });

    if (!isDrawingRef.current || !workingMaskRef.current || !lastPointRef.current) {
      return;
    }

    applyBrushMask({
      srcRgba: decoded.rgba,
      alphaMask: workingMaskRef.current,
      width: decoded.width,
      height: decoded.height,
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: mapped.imgX,
      y1: mapped.imgY,
      radius: brushRadius,
      action: maskAction,
      smart: activeTool === "smart-brush",
      tolerance,
      seedColor: strokeSeedRef.current,
      targetMaskInPlace: workingMaskRef.current,
    });

    lastPointRef.current = { x: mapped.imgX, y: mapped.imgY };
    scheduleStrokeFlush();
  };

  const commitActiveStroke = () => {
    if (!isDrawingRef.current) {
      return;
    }
    isDrawingRef.current = false;
    const finishedMask = workingMaskRef.current;
    const prevSnapshot = preStrokeSnapshotRef.current;
    const hadSnapshot = hasSnapshotRef.current;

    workingMaskRef.current = null;
    lastPointRef.current = null;
    strokeSeedRef.current = undefined;
    preStrokeSnapshotRef.current = null;
    hasSnapshotRef.current = false;

    if (finishedMask) {
      if (hadSnapshot) {
        pushUndoSnapshot(prevSnapshot);
      }
      setViewMode("cutout");
      onApplyManualCutout?.(
        createCutoutFromMask(decoded, finishedMask, cutout?.inferenceMs ?? 0)
      );
    }
  };

  const handleInvertMask = () => {
    if (isBusy) {
      return;
    }
    pushUndoSnapshot(cutout);
    const startMask = getStartingMask();
    const inverted = invertAlphaMask(decoded.rgba, startMask);
    setViewMode("cutout");
    onApplyManualCutout?.(
      createCutoutFromMask(decoded, inverted, cutout?.inferenceMs ?? 0)
    );
  };

  const handleModeButton = (mode: BackgroundFillMode) => {
    const validCustom = normalizeHexColor(hexDraft) ?? "#000000";
    onChangeFill({
      mode,
      customHex: validCustom,
    });
  };

  const handleHexInputChange = (value: string) => {
    setHexDraft(value);
    const normalized = normalizeHexColor(value);
    if (normalized) {
      onChangeFill({
        mode: "custom",
        customHex: normalized,
      });
    }
  };

  const handleTriggerCutout = () => {
    if (cutout) {
      pushUndoSnapshot(cutout);
    }
    setViewMode("cutout");
    onRunCutout();
  };

  const isValidDraft = isValidHexColor(hexDraft);
  const isEditingTool = activeTool !== "view";
  const usesTolerance = activeTool === "wand" || activeTool === "smart-brush";
  const usesBrushSize = activeTool === "smart-brush" || activeTool === "brush";

  const activeToolHint =
    activeTool === "wand"
      ? `Click to ${maskAction} similar connected pixels`
      : activeTool === "smart-brush"
        ? `Drag to ${maskAction} while protecting contrasting edges`
        : activeTool === "brush"
          ? `Drag to ${maskAction} pixels manually`
          : effectiveViewMode === "cutout"
            ? "Background removed"
            : "Original photo";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="border border-[#d4d4d4] bg-[#ffffff] p-4 lg:col-span-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e5e5] pb-3">
          <span className="font-mono text-xs text-[#000000]">Photo Preview</span>

          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Preview toggle"
            >
              <button
                type="button"
                onClick={() => setViewMode("original")}
                aria-pressed={effectiveViewMode === "original"}
                className={`dottoh-btn border px-2.5 py-1.5 text-[11px] ${
                  effectiveViewMode === "original"
                    ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                    : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                }`}
              >
                Original
              </button>
              <button
                type="button"
                disabled={!cutout}
                onClick={() => setViewMode("cutout")}
                aria-pressed={effectiveViewMode === "cutout"}
                className={`dottoh-btn border px-2.5 py-1.5 text-[11px] disabled:opacity-40 ${
                  effectiveViewMode === "cutout"
                    ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                    : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                }`}
              >
                Cutout
              </button>
            </div>

            <button
              type="button"
              onClick={() => setZoomActual((prev) => !prev)}
              aria-pressed={zoomActual}
              className={`dottoh-btn border px-2.5 py-1.5 text-[11px] ${
                zoomActual
                  ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                  : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
              }`}
            >
              {zoomActual ? "1:1" : "Fit"}
            </button>

            <button
              type="button"
              disabled={undoStack.length === 0 || isBusy}
              onClick={handleUndo}
              className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-2.5 py-1.5 text-[11px] text-[#000000] hover:border-[#000000] disabled:opacity-40"
            >
              Undo
            </button>
          </div>
        </div>

        <div
          style={CHECKERBOARD_STYLE}
          className={`flex max-h-[420px] min-h-[260px] border border-[#e5e5e5] p-3 ${
            zoomActual
              ? "items-start justify-start overflow-auto"
              : "items-center justify-center overflow-hidden"
          }`}
        >
          <div className="relative inline-block max-w-full">
            <canvas
              ref={canvasRef}
              aria-label="Decoded photo preview"
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={commitActiveStroke}
              onPointerCancel={commitActiveStroke}
              onPointerLeave={() => {
                setCursorReticle(null);
              }}
              className={`block ${
                zoomActual
                  ? "h-auto w-auto max-w-none"
                  : "h-auto max-h-[380px] w-auto max-w-full"
              } ${
                isEditingTool
                  ? "touch-none cursor-crosshair select-none"
                  : ""
              }`}
            />

            {isEditingTool && cursorReticle && (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              >
                {usesBrushSize && (
                  <circle
                    cx={cursorReticle.cssX}
                    cy={cursorReticle.cssY}
                    r={cursorReticle.cssRadiusPx}
                    fill="none"
                    stroke={maskAction === "erase" ? "#d71921" : "#000000"}
                    strokeWidth="1.5"
                    strokeDasharray={activeTool === "smart-brush" ? "4 2" : undefined}
                  />
                )}
                <line
                  x1={cursorReticle.cssX - 5}
                  y1={cursorReticle.cssY}
                  x2={cursorReticle.cssX + 5}
                  y2={cursorReticle.cssY}
                  stroke="#d71921"
                  strokeWidth="1.25"
                />
                <line
                  x1={cursorReticle.cssX}
                  y1={cursorReticle.cssY - 5}
                  x2={cursorReticle.cssX}
                  y2={cursorReticle.cssY + 5}
                  stroke="#d71921"
                  strokeWidth="1.25"
                />
              </svg>
            )}
          </div>
        </div>

        <p className="mt-3 font-mono text-[11px] text-[#525252]">
          {isEditingTool ? "Tool active: " : "Showing: "}
          {activeToolHint}
        </p>
      </div>

      <div className="flex flex-col justify-between border border-[#d4d4d4] bg-[#ffffff] p-5 lg:col-span-5">
        <div className="space-y-5">
          <div className="border-b border-[#e5e5e5] pb-4">
            <h2 className="font-sans text-lg font-medium text-[#000000]">
              Background options
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#525252]">
              Run automatic removal, refine by hand with magic tools, or skip
              this step.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleTriggerCutout}
              className="dottoh-btn flex-1 border border-[#000000] bg-[#000000] px-4 py-3 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-50"
            >
              {cutout ? "Run Auto Again" : "Remove Background"}
            </button>

            {cutout && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setConfirmResetOpen(true)}
                className="dottoh-btn min-h-[42px] border border-[#d4d4d4] bg-[#ffffff] px-4 py-3 text-xs text-[#000000] hover:border-[#000000] disabled:opacity-50"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-3 border border-[#e5e5e5] bg-[#f4f4f4] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#000000]">
                Manual + magic tools
              </p>
              {isEditingTool && (
                <button
                  type="button"
                  onClick={() => setActiveTool("view")}
                  className="font-mono text-[11px] text-[#d71921] underline-offset-2 hover:underline"
                >
                  Done
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(
                [
                  { id: "view", label: "Off" },
                  { id: "wand", label: "Magic Wand" },
                  { id: "smart-brush", label: "Smart Brush" },
                  { id: "brush", label: "Brush" },
                ] as const
              ).map((tool) => {
                const active = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setActiveTool(tool.id);
                      if (tool.id !== "view" && cutout) {
                        setViewMode("cutout");
                      }
                    }}
                    aria-pressed={active}
                    className={`dottoh-btn border px-2 py-2 text-[11px] disabled:opacity-40 ${
                      active
                        ? "border-[#d71921] bg-[#d71921] text-[#ffffff]"
                        : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                    }`}
                  >
                    {tool.label}
                  </button>
                );
              })}
            </div>

            {isEditingTool && (
              <div className="space-y-3 border-t border-[#e5e5e5] pt-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: "erase", label: "Erase background" },
                      { id: "restore", label: "Restore photo" },
                    ] as const
                  ).map((mode) => {
                    const active = maskAction === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setMaskAction(mode.id)}
                        aria-pressed={active}
                        className={`dottoh-btn border px-2 py-1.5 text-[11px] ${
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

                {usesTolerance && (
                  <label className="block space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#000000]">
                      <span>Color tolerance</span>
                      <span>{tolerance}</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={1}
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="w-full accent-[#d71921]"
                    />
                  </label>
                )}

                {usesBrushSize && (
                  <label className="block space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#000000]">
                      <span>Brush size</span>
                      <span>{brushRadius * 2} px</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={64}
                      step={2}
                      value={brushRadius}
                      onChange={(e) => setBrushRadius(Number(e.target.value))}
                      className="w-full accent-[#d71921]"
                    />
                  </label>
                )}

                {activeTool === "wand" && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#000000]">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={contiguousWand}
                        onChange={(e) => setContiguousWand(e.target.checked)}
                        className="h-4 w-4 accent-[#d71921]"
                      />
                      <span>Connected area only</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={softEdges}
                        onChange={(e) => setSoftEdges(e.target.checked)}
                        className="h-4 w-4 accent-[#d71921]"
                      />
                      <span>Soft edges</span>
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={undoStack.length === 0 || isBusy}
                    onClick={handleUndo}
                    className="dottoh-btn flex-1 border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#000000] disabled:opacity-40"
                  >
                    Undo ({undoStack.length})
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleInvertMask}
                    className="dottoh-btn flex-1 border border-[#d4d4d4] bg-[#ffffff] px-3 py-1.5 text-[11px] text-[#000000] hover:border-[#000000] disabled:opacity-40"
                  >
                    Invert Mask
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border border-[#e5e5e5] bg-[#f4f4f4] p-3.5">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-[#000000]">Use cutout in result</span>
              <input
                type="checkbox"
                checked={useCutout}
                disabled={!cutout || isBusy}
                onChange={(e) => {
                  const next = e.target.checked;
                  onToggleUseCutout(next);
                  setViewMode(next ? "cutout" : "original");
                }}
                className="h-4 w-4 accent-[#d71921]"
              />
            </label>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-medium text-[#000000]">
              Background fill color
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: "transparent", label: "None" },
                  { id: "black", label: "Black" },
                  { id: "white", label: "White" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((item) => {
                const active = fill.mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!cutout}
                    onClick={() => handleModeButton(item.id)}
                    aria-pressed={active}
                    className={`dottoh-btn border px-2 py-2 text-[11px] disabled:opacity-40 ${
                      active
                        ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                        : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                aria-label="Pick custom background color"
                disabled={!cutout}
                value={
                  isValidDraft
                    ? normalizeHexColor(hexDraft) ?? "#000000"
                    : "#000000"
                }
                onChange={(e) => handleHexInputChange(e.target.value)}
                className="h-9 w-10 shrink-0 cursor-pointer border border-[#d4d4d4] bg-[#ffffff] p-0.5 disabled:opacity-40"
              />
              <input
                type="text"
                aria-label="Custom background hex color"
                disabled={!cutout}
                value={hexDraft}
                onChange={(e) => handleHexInputChange(e.target.value)}
                onBlur={() => {
                  if (!isValidHexColor(hexDraft)) {
                    setHexDraft(fill.customHex || "#000000");
                  }
                }}
                placeholder="#000000"
                maxLength={7}
                className={`w-full border px-3 py-2 font-mono text-xs text-[#000000] disabled:bg-[#f4f4f4] disabled:opacity-40 ${
                  isValidDraft ? "border-[#d4d4d4]" : "border-[#d71921]"
                }`}
              />
            </div>
            {!isValidDraft && cutout && (
              <p className="font-mono text-[11px] text-[#d71921]">
                Enter a valid hex code like #1a1a1a.
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 border-t border-[#e5e5e5] pt-4 text-xs text-[#525252]">
          Active image:{" "}
          <span className="font-medium text-[#000000]">
            {cutout && useCutout ? `Cutout (${fill.mode})` : "Original photo"}
          </span>
        </p>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset background cutout?"
        description="This clears your automatic cutout, manual brush strokes, and background fill color so you can start over from the original photo."
        confirmLabel="Reset cutout"
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false);
          setViewMode("original");
          setHexDraft("#000000");
          setUndoStack([]);
          setActiveTool("view");
          onResetCutout();
        }}
      />
    </div>
  );
}
