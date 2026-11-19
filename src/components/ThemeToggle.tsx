"use client";

import { useSyncExternalStore } from "react";
import { IconMoonGrid, IconSunGrid } from "@/components/BrandMark";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "dottoh-theme";
const THEME_CHANGE_EVENT = "dottoh-theme-change";

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

export function applyThemeMode(next: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore restricted storage contexts
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
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
      onClick={() => applyThemeMode(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Light mode" : "Dark mode"}
      className="dottoh-btn min-h-[38px] border border-[#d4d4d4] bg-[#ffffff]/90 px-2.5 py-2 font-mono text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4] sm:px-3"
    >
      {isDark ? (
        <IconSunGrid className="h-3.5 w-3.5" />
      ) : (
        <IconMoonGrid className="h-3.5 w-3.5" />
      )}
      <span className="hidden md:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
