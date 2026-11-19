"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { IconMoonGrid, IconSunGrid } from "@/components/BrandMark";
import {
  buildPixelSquareWipeFrames,
  type OriginRectLike,
} from "@/lib/theme-transition";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "dittoh-theme";
const THEME_CHANGE_EVENT = "dittoh-theme-change";
const THEME_TRANSITION_CLASS = "dittoh-theme-transition";
const THEME_TRANSITION_MS = 320;
const PIXEL_WIPE_DURATION_MS = 360;

let themeTransitionTimer: number | null = null;

function readClientTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeTheme(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      const next = event.newValue === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      onStoreChange();
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function commitThemeState(next: ThemeMode): void {
  const root = document.documentElement;
  root.dataset.theme = next;
  root.style.colorScheme = next;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore restricted storage contexts
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function applyThemeMode(
  next: ThemeMode,
  originRect?: OriginRectLike
): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced || typeof window === "undefined") {
    commitThemeState(next);
    return;
  }

  if (typeof document.startViewTransition === "function") {
    root.classList.remove(THEME_TRANSITION_CLASS);
    const fallbackRect: OriginRectLike = originRect ?? {
      top: 20,
      right: window.innerWidth - 20,
      bottom: 58,
      left: window.innerWidth - 96,
    };

    try {
      const transition = document.startViewTransition(() => {
        commitThemeState(next);
      });

      void transition.ready
        .then(() => {
          const frames = buildPixelSquareWipeFrames(
            fallbackRect,
            window.innerWidth,
            window.innerHeight
          );
          root.animate(frames, {
            duration: PIXEL_WIPE_DURATION_MS,
            easing: "steps(1, end)",
            pseudoElement: "::view-transition-new(root)",
          });
        })
        .catch(() => {
          // Ignore aborted/skipped view transitions
        });
      return;
    } catch {
      // Fall through to CSS crossfade fallback
    }
  }

  root.classList.add(THEME_TRANSITION_CLASS);
  if (themeTransitionTimer !== null) {
    window.clearTimeout(themeTransitionTimer);
  }
  themeTransitionTimer = window.setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
    themeTransitionTimer = null;
  }, THEME_TRANSITION_MS);

  commitThemeState(next);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readClientTheme,
    () => "light"
  );

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        applyThemeMode(isDark ? "light" : "dark", {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
        });
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Light mode" : "Dark mode"}
      className="dittoh-btn min-h-[38px] border border-[#d4d4d4] bg-[#ffffff]/90 px-2.5 py-2 font-mono text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4] sm:px-3"
    >
      <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="sun"
              initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex"
            >
              <IconSunGrid className="h-3.5 w-3.5" />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ opacity: 0, rotate: 45, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -45, scale: 0.7 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex"
            >
              <IconMoonGrid className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="hidden md:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
