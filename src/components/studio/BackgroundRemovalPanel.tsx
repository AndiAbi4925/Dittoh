"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconLayersCut } from "@/components/BrandMark";
import {
  compositeRgbaBackground,
  isValidHexColor,
  normalizeHexColor,
} from "@/lib/media/colors";
import type {
  BackgroundFillMode,
  BackgroundFillOption,
  BackgroundRemovalResult,
  DecodedImagePayload,
} from "@/lib/media/types";

interface BackgroundRemovalPanelProps {
  decoded: DecodedImagePayload;
  cutout: BackgroundRemovalResult | null;
  useCutout: boolean;
  fill: BackgroundFillOption;
  isBusy: boolean;
  onRunCutout: () => void;
  onToggleUseCutout: (enabled: boolean) => void;
  onChangeFill: (fill: BackgroundFillOption) => void;
  onResetCutout: () => void;
}

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
  onToggleUseCutout,
  onChangeFill,
  onResetCutout,
}: BackgroundRemovalPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "cutout">(
    cutout && useCutout ? "cutout" : "original"
  );
  const [hexDraft, setHexDraft] = useState<string>(fill.customHex || "#000000");

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
    setViewMode("cutout");
    onRunCutout();
  };

  const isValidDraft = isValidHexColor(hexDraft);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="border border-[#000000] bg-[#ffffff] p-4 lg:col-span-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#b1b3b3] pb-3">
          <div className="flex items-center gap-2 font-mono text-xs uppercase text-[#000000]">
            <IconLayersCut className="h-4 w-4" />
            <span>SOURCE & TRANSPARENCY PREVIEW</span>
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Preview layer toggle">
            <button
              type="button"
              onClick={() => setViewMode("original")}
              aria-pressed={effectiveViewMode === "original"}
              className={`dottoh-btn border px-3 py-1.5 text-[11px] ${
                effectiveViewMode === "original"
                  ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                  : "border-[#b1b3b3] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
              }`}
            >
              ORIGINAL
            </button>
            <button
              type="button"
              disabled={!cutout}
              onClick={() => setViewMode("cutout")}
              aria-pressed={effectiveViewMode === "cutout"}
              className={`dottoh-btn border px-3 py-1.5 text-[11px] disabled:opacity-40 ${
                effectiveViewMode === "cutout"
                  ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                  : "border-[#b1b3b3] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
              }`}
            >
              CUTOUT
            </button>
          </div>
        </div>

        <div
          style={CHECKERBOARD_STYLE}
          className="flex max-h-[420px] min-h-[260px] items-center justify-center overflow-hidden border border-[#b1b3b3] p-3"
        >
          <canvas
            ref={canvasRef}
            aria-label="Decoded image preview canvas"
            className="max-h-[380px] max-w-full object-contain"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase text-[#525252]">
          <span>
            DISPLAYING:{" "}
            {effectiveViewMode === "cutout" ? "SEGMENTED CUTOUT" : "ORIGINAL DECODE"}
          </span>
          {cutout && (
            <span>INFERENCE: {cutout.inferenceMs} MS (LOCAL U-2-NETP ONNX)</span>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between border border-[#b1b3b3] bg-[#ffffff] p-5 lg:col-span-5">
        <div className="space-y-5">
          <div className="border-b border-[#b1b3b3] pb-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#d71921]">
              OPTIONAL STAGE 02
            </p>
            <h3 className="mt-1 font-display text-xl text-[#000000]">
              CLIENT BACKGROUND REMOVAL
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#525252]">
              Runs Apache-2.0 U-2-Netp ONNX weights (4.4 MB) inside an isolated
              Web Worker only when requested. Skip this step to keep original
              pixels untouched.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleTriggerCutout}
              className="dottoh-btn flex-1 border border-[#000000] bg-[#000000] px-4 py-2.5 text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] disabled:opacity-50"
            >
              {cutout ? "RE-RUN CUTOUT" : "REMOVE BACKGROUND"}
            </button>

            {cutout && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setViewMode("original");
                  onResetCutout();
                }}
                className="dottoh-btn border border-[#b1b3b3] bg-[#ffffff] px-3.5 py-2.5 text-[#000000] hover:border-[#000000] disabled:opacity-50"
              >
                DISCARD
              </button>
            )}
          </div>

          <div className="border border-[#b1b3b3] bg-[#f4f4f4] p-3.5">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="font-mono text-xs uppercase text-[#000000]">
                APPLY CUTOUT TO ASCII OUTPUT
              </span>
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
            <p className="font-mono text-xs uppercase text-[#000000]">
              CUTOUT BACKGROUND FILL
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: "transparent", label: "ALPHA" },
                  { id: "black", label: "#000000" },
                  { id: "white", label: "#FFFFFF" },
                  { id: "custom", label: "HEX" },
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
                        : "border-[#b1b3b3] bg-[#ffffff] text-[#000000] hover:border-[#000000]"
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
                aria-label="Pick custom background hex color"
                disabled={!cutout}
                value={isValidDraft ? normalizeHexColor(hexDraft) ?? "#000000" : "#000000"}
                onChange={(e) => handleHexInputChange(e.target.value)}
                className="h-9 w-10 shrink-0 cursor-pointer border border-[#b1b3b3] bg-[#ffffff] p-0.5 disabled:opacity-40"
              />
              <input
                type="text"
                aria-label="Custom background hex code"
                disabled={!cutout}
                value={hexDraft}
                onChange={(e) => handleHexInputChange(e.target.value)}
                placeholder="#000000"
                maxLength={7}
                className={`w-full border px-3 py-2 font-mono text-xs text-[#000000] disabled:bg-[#f4f4f4] disabled:opacity-40 ${
                  isValidDraft ? "border-[#b1b3b3]" : "border-[#d71921]"
                }`}
              />
            </div>
            {!isValidDraft && cutout && (
              <p className="font-mono text-[11px] text-[#d71921]">
                Enter a valid hex value such as #1a1a1a.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-[#b1b3b3] pt-4 font-mono text-[11px] uppercase text-[#525252]">
          ACTIVE BUFFER STATE:{" "}
          <span className="text-[#000000]">
            {cutout && useCutout
              ? `CUTOUT (${fill.mode.toUpperCase()})`
              : "ORIGINAL SOURCE PIXELS"}
          </span>
        </div>
      </div>
    </div>
  );
}
