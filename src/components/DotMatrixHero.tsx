"use client";

import { useEffect, useRef, useState } from "react";
import { IconPause, IconPlay } from "@/components/BrandMark";
import {
  createSpacewarState,
  renderSpacewarCanvas,
  resizeSpacewarState,
  type SpacewarThemePalette,
  stepSpacewar,
  triggerSpacewarSalvo,
} from "@/lib/spacewar-engine";

type VisualMode = "spacewar" | "matrix";
type RampPreset = "standard" | "blocks" | "binary";
type ScaleSetting = "coarse" | "balanced" | "fine";

const RAMP_CHARS: Record<RampPreset, string> = {
  standard: " .:-=+*#%@",
  blocks: " .oO0#",
  binary: " .01",
};

const MATRIX_CELL_SIZES: Record<ScaleSetting, number> = {
  coarse: 18,
  balanced: 14,
  fine: 11,
};

const PIXEL_SCALES: Record<ScaleSetting, number> = {
  coarse: 3,
  balanced: 2.5,
  fine: 2,
};

function resolveSpacePalette(inverted: boolean): SpacewarThemePalette {
  if (inverted) {
    return {
      background: "#f4f4f4",
      hullNear: "#000000",
      hullFar: "#737373",
      enemyNear: "#262626",
      enemyFar: "#a3a3a3",
      accent: "#d71921",
      starColor: "#a3a3a3",
      mutedGlyph: "#737373",
      alphaMultiplier: 1,
    };
  }
  return {
    background: "#000000",
    hullNear: "#ffffff",
    hullFar: "#737373",
    enemyNear: "#d4d4d4",
    enemyFar: "#525252",
    accent: "#d71921",
    starColor: "#737373",
    mutedGlyph: "#737373",
    alphaMultiplier: 1,
  };
}

export function DotMatrixHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const spaceStateRef = useRef<ReturnType<typeof createSpacewarState> | null>(
    null
  );
  const spacePointerRef = useRef({ x: 0, y: 0, active: false });
  const matrixPointerRef = useRef({ x: 0, y: 0, active: 0 });

  const [mode, setMode] = useState<VisualMode>("spacewar");
  const [preset, setPreset] = useState<RampPreset>("standard");
  const [density, setDensity] = useState<ScaleSetting>("balanced");
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

  const isPaused = userPaused || prefersReducedMotion;

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

    let frameId = 0;
    let width = 0;
    let height = 0;
    let phase = 0;
    let visible = true;

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

      if (!spaceStateRef.current) {
        spaceStateRef.current = createSpacewarState(width, height, 10, 36);
      } else {
        resizeSpacewarState(spaceStateRef.current, width, height);
      }
    };

    const drawMatrixFrame = (timePhase: number) => {
      const bg = inverted ? "#f4f4f4" : "#000000";
      const fg = inverted ? "#000000" : "#ffffff";
      const accent = "#d71921";
      const ramp = RAMP_CHARS[preset];
      const cellSize = MATRIX_CELL_SIZES[density];

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const cols = Math.floor(width / cellSize);
      const rows = Math.floor(height / cellSize);
      const offsetX = Math.floor((width - cols * cellSize) / 2);
      const offsetY = Math.floor((height - rows * cellSize) / 2);

      ctx.font = `${Math.max(9, cellSize - 3)}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const pointer = matrixPointerRef.current;
      pointer.active *= 0.94;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const nx = c / Math.max(1, cols - 1) - 0.5;
          const ny = r / Math.max(1, rows - 1) - 0.5;
          const dist = Math.hypot(nx * 1.4, ny);

          const waveA = Math.sin(dist * 10.5 - timePhase * 1.35);
          const waveB = Math.cos(nx * 6.0 + ny * 4.5 + timePhase * 0.8);
          let pointerBoost = 0;
          if (pointer.active > 0.02) {
            const dx = nx - pointer.x;
            const dy = ny - pointer.y;
            const pDist = Math.hypot(dx * 1.35, dy);
            pointerBoost = Math.max(0, 1 - pDist * 4.2) * pointer.active * 0.48;
          }

          const norm = Math.max(
            0,
            Math.min(1, (waveA + waveB + 2) * 0.25 + pointerBoost)
          );
          const charIndex = Math.min(
            ramp.length - 1,
            Math.floor(norm * ramp.length)
          );
          const glyph = ramp[charIndex] ?? " ";
          if (glyph === " ") continue;

          ctx.fillStyle = norm > 0.84 ? accent : fg;
          ctx.fillText(
            glyph,
            offsetX + c * cellSize + cellSize / 2,
            offsetY + r * cellSize + cellSize / 2
          );
        }
      }
    };

    const drawCurrentFrame = (dt: number) => {
      if (mode === "spacewar") {
        const state = spaceStateRef.current;
        if (!state) return;
        if (dt > 0) {
          stepSpacewar(state, dt, spacePointerRef.current);
        }
        renderSpacewarCanvas(
          ctx,
          state,
          resolveSpacePalette(inverted),
          PIXEL_SCALES[density],
          spacePointerRef.current
        );
      } else {
        phase += dt;
        drawMatrixFrame(phase);
      }
    };

    resize();
    drawCurrentFrame(0);

    const observer = new ResizeObserver(() => {
      resize();
      drawCurrentFrame(0);
    });
    observer.observe(container);

    let lastTimestamp = performance.now();
    const tick = (now: number) => {
      if (!visible || document.hidden || isPaused) {
        frameId = 0;
        return;
      }
      const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
      lastTimestamp = now;
      drawCurrentFrame(dt);
      frameId = window.requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (visible && !document.hidden && !isPaused && !frameId) {
        lastTimestamp = performance.now();
        frameId = window.requestAnimationFrame(tick);
      } else if ((!visible || document.hidden || isPaused) && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      schedule();
    });
    intersectionObserver.observe(container);

    schedule();
    document.addEventListener("visibilitychange", schedule);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      observer.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [mode, preset, density, inverted, isPaused]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    spacePointerRef.current = { x: px, y: py, active: true };

    if (!prefersReducedMotion) {
      matrixPointerRef.current.x = px / rect.width - 0.5;
      matrixPointerRef.current.y = py / rect.height - 0.5;
      matrixPointerRef.current.active = 1;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "spacewar" || !spaceStateRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    triggerSpacewarSalvo(spaceStateRef.current, px, py, 3);
  };

  const sizeLabel =
    mode === "spacewar"
      ? density === "coarse"
        ? "Large"
        : density === "balanced"
          ? "Medium"
          : "Small"
      : density;

  return (
    <div
      data-theme-preserve="true"
      className="rounded-[2px] border border-[#d4d4d4] bg-[#000000]"
    >
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          spacePointerRef.current.active = false;
          matrixPointerRef.current.active = 0;
        }}
        className={`relative h-72 w-full sm:h-80 ${
          mode === "spacewar" ? "cursor-crosshair" : "cursor-default"
        }`}
      >
        <canvas
          ref={canvasRef}
          aria-label={
            mode === "spacewar"
              ? "Interactive retro pixel Spacewar arena. Click to fire missiles."
              : "Interactive ASCII dot-matrix pattern"
          }
          className="block h-full w-full"
        />

        {mode === "spacewar" && (
          <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-[2px] border border-[#262626] bg-[#000000]/80 px-2.5 py-1 font-mono text-[10px] tracking-wider text-[#ffffff]">
            <span className="inline-block h-1.5 w-1.5 bg-[#d71921]" aria-hidden="true" />
            <span>CLICK TO FIRE</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#262626] bg-[#000000] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Canvas mode and style">
          {(["spacewar", "matrix"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              aria-pressed={mode === item}
              className={`dittoh-btn border px-2.5 py-1 text-[11px] ${
                mode === item
                  ? "border-[#d71921] bg-[#d71921] text-[#ffffff]"
                  : "border-[#262626] bg-[#000000] text-[#b1b3b3] hover:border-[#ffffff] hover:text-[#ffffff]"
              }`}
            >
              {item === "spacewar" ? "Spacewar" : "Wave"}
            </button>
          ))}

          {mode === "matrix" &&
            (["standard", "blocks", "binary"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPreset(item)}
                aria-pressed={preset === item}
                className={`dittoh-btn border px-2.5 py-1 text-[11px] ${
                  preset === item
                    ? "border-[#ffffff] bg-[#ffffff] text-[#000000]"
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
            className="dittoh-btn border border-[#262626] bg-[#000000] px-2.5 py-1 text-[11px] text-[#ffffff] hover:border-[#ffffff]"
          >
            Pixel: {sizeLabel}
          </button>

          <button
            type="button"
            onClick={() => setInverted((prev) => !prev)}
            aria-pressed={inverted}
            className="dittoh-btn border border-[#262626] bg-[#000000] px-2.5 py-1 text-[11px] text-[#ffffff] hover:border-[#ffffff]"
          >
            {inverted ? "Dark" : "Light"}
          </button>

          <button
            type="button"
            onClick={() => setUserPaused((prev) => !prev)}
            disabled={prefersReducedMotion}
            aria-label={isPaused ? "Play animation" : "Pause animation"}
            className="dittoh-btn border border-[#262626] bg-[#000000] px-2.5 py-1 text-[11px] text-[#ffffff] hover:border-[#ffffff] disabled:opacity-50"
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
