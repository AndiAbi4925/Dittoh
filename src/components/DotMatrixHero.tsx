"use client";

import { useEffect, useRef, useState } from "react";
import { IconPause, IconPlay } from "@/components/BrandMark";

type RampPreset = "standard" | "blocks" | "binary";
type MatrixDensity = "coarse" | "balanced" | "fine";

const RAMP_CHARS: Record<RampPreset, string> = {
  standard: " .:-=+*#%@",
  blocks: " .oO0#",
  binary: " .01",
};

const CELL_SIZES: Record<MatrixDensity, number> = {
  coarse: 18,
  balanced: 14,
  fine: 11,
};

export interface DotMatrixHeroProps {
  isProcessing?: boolean;
}

export function DotMatrixHero({ isProcessing = false }: DotMatrixHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [preset, setPreset] = useState<RampPreset>("standard");
  const [density, setDensity] = useState<MatrixDensity>("balanced");
  const [inverted, setInverted] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  const isPaused = userPaused || isProcessing || prefersReducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const ramp = RAMP_CHARS[preset];
    const cellSize = CELL_SIZES[density];
    let frameId = 0;
    let width = 0;
    let height = 0;
    let phase = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(280, Math.floor(rect.width));
      height = Math.max(260, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFrame = (timePhase: number) => {
      const bg = inverted ? "#f4f4f4" : "#000000";
      const fg = inverted ? "#000000" : "#ffffff";
      const accent = "#d71921";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const cols = Math.floor(width / cellSize);
      const rows = Math.floor(height / cellSize);
      const offsetX = Math.floor((width - cols * cellSize) / 2);
      const offsetY = Math.floor((height - rows * cellSize) / 2);

      ctx.font = `${Math.max(9, cellSize - 3)}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const nx = c / Math.max(1, cols - 1) - 0.5;
          const ny = r / Math.max(1, rows - 1) - 0.5;
          const dist = Math.hypot(nx * 1.4, ny);

          const waveA = Math.sin(dist * 10.5 - timePhase * 1.35);
          const waveB = Math.cos(nx * 6.0 + ny * 4.5 + timePhase * 0.8);
          const norm = Math.max(0, Math.min(1, (waveA + waveB + 2) * 0.25));

          const charIndex = Math.min(
            ramp.length - 1,
            Math.floor(norm * ramp.length)
          );
          const glyph = ramp[charIndex] ?? " ";
          if (glyph === " ") {
            continue;
          }

          ctx.fillStyle = norm > 0.86 ? accent : fg;
          ctx.fillText(
            glyph,
            offsetX + c * cellSize + cellSize / 2,
            offsetY + r * cellSize + cellSize / 2
          );
        }
      }
    };

    resize();
    drawFrame(phase);

    const observer = new ResizeObserver(() => {
      resize();
      drawFrame(phase);
    });
    observer.observe(container);

    let lastTimestamp = performance.now();
    const tick = (now: number) => {
      if (document.hidden || isPaused) {
        return;
      }
      const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
      lastTimestamp = now;
      phase += dt;
      drawFrame(phase);
      frameId = window.requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !isPaused) {
        lastTimestamp = performance.now();
        frameId = window.requestAnimationFrame(tick);
      } else {
        window.cancelAnimationFrame(frameId);
      }
    };

    if (!isPaused) {
      frameId = window.requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [preset, density, inverted, isPaused]);

  return (
    <div className="border border-[#d4d4d4] bg-[#000000]">
      <div ref={containerRef} className="relative h-72 w-full sm:h-80">
        <canvas
          ref={canvasRef}
          aria-label="Interactive ASCII dot-matrix pattern"
          className="block h-full w-full"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#262626] bg-[#000000] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Character style">
          {(["standard", "blocks", "binary"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPreset(item)}
              aria-pressed={preset === item}
              className={`dottoh-btn border px-2.5 py-1 text-[11px] ${
                preset === item
                  ? "border-[#d71921] bg-[#d71921] text-[#ffffff]"
                  : "border-[#262626] bg-[#000000] text-[#b1b3b3] hover:border-[#ffffff] hover:text-[#ffffff]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setDensity((prev) =>
                prev === "coarse"
                  ? "balanced"
                  : prev === "balanced"
                  ? "fine"
                  : "coarse"
              )
            }
            className="dottoh-btn border border-[#262626] bg-[#000000] px-2.5 py-1 text-[11px] text-[#ffffff] hover:border-[#ffffff]"
          >
            Size: {density}
          </button>

          <button
            type="button"
            onClick={() => setInverted((prev) => !prev)}
            aria-pressed={inverted}
            className="dottoh-btn border border-[#262626] bg-[#000000] px-2.5 py-1 text-[11px] text-[#ffffff] hover:border-[#ffffff]"
          >
            {inverted ? "Dark" : "Light"}
          </button>

          <button
            type="button"
            onClick={() => setUserPaused((prev) => !prev)}
            disabled={prefersReducedMotion || isProcessing}
            aria-label={isPaused ? "Play animation" : "Pause animation"}
            className="dottoh-btn border border-[#262626] bg-[#000000] px-2.5 py-1 text-[11px] text-[#ffffff] hover:border-[#ffffff] disabled:opacity-50"
          >
            {isPaused ? (
              <>
                <IconPlay className="h-3 w-3" />
                <span>Play</span>
              </>
            ) : (
              <>
                <IconPause className="h-3 w-3" />
                <span>Pause</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
