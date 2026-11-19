"use client";

import { useEffect, useRef } from "react";
import {
  createSpacewarState,
  renderSpacewarCanvas,
  resizeSpacewarState,
  type SpacewarThemePalette,
  stepSpacewar,
  triggerSpacewarSalvo,
} from "@/lib/spacewar-engine";

const LIGHT_BACKDROP_PALETTE: SpacewarThemePalette = {
  background: null,
  hullNear: "#171717",
  hullFar: "#737373",
  enemyNear: "#404040",
  enemyFar: "#a3a3a3",
  accent: "#d71921",
  starColor: "#d4d4d4",
  mutedGlyph: "#a3a3a3",
  alphaMultiplier: 0.18,
};

const DARK_BACKDROP_PALETTE: SpacewarThemePalette = {
  background: null,
  hullNear: "#f5f5f5",
  hullFar: "#a3a3a3",
  enemyNear: "#d4d4d4",
  enemyFar: "#737373",
  accent: "#d71921",
  starColor: "#525252",
  mutedGlyph: "#737373",
  alphaMultiplier: 0.24,
};

export function RetroSpaceBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = media.matches;
    let visible = true;
    let rafId = 0;

    const initialRect = container.getBoundingClientRect();
    const state = createSpacewarState(
      Math.max(320, Math.floor(initialRect.width)),
      Math.max(320, Math.floor(initialRect.height)),
      10,
      0
    );

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resizeSpacewarState(state, w, h);
    };

    const draw = () => {
      const palette =
        document.documentElement.dataset.theme === "dark"
          ? DARK_BACKDROP_PALETTE
          : LIGHT_BACKDROP_PALETTE;
      renderSpacewarCanvas(ctx, state, palette, 2.2);
    };

    let last = performance.now();
    const tick = (now: number) => {
      if (!visible || document.hidden || reducedMotion) {
        rafId = 0;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      stepSpacewar(state, dt);
      draw();
      rafId = window.requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (visible && !document.hidden && !reducedMotion && !rafId) {
        last = performance.now();
        rafId = window.requestAnimationFrame(tick);
      } else if ((reducedMotion || !visible || document.hidden) && rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const onMotionChange = () => {
      reducedMotion = media.matches;
      schedule();
      if (reducedMotion) {
        draw();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (reducedMotion || !visible) return;
      const rect = container.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        triggerSpacewarSalvo(
          state,
          event.clientX - rect.left,
          event.clientY - rect.top,
          2
        );
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      schedule();
    });
    intersectionObserver.observe(container);

    const themeObserver = new MutationObserver(() => {
      draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    media.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    resize();
    draw();
    schedule();

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      themeObserver.disconnect();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      media.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
