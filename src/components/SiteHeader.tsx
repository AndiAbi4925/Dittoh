"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  DottohMark,
  IconCloseCross,
  IconMenuGrid,
} from "@/components/BrandMark";
import { SITE_MENU_ITEMS, SITE_NAV_ITEMS } from "@/lib/site-constants";

export function SiteHeader() {
  const pathname = usePathname();
  const [openAtPath, setOpenAtPath] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const menuOpen = openAtPath === pathname;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenAtPath(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenAtPath(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const isNavItemActive = (href: string): boolean => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-2 sm:px-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-[#000000] focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-[#ffffff]"
      >
        Skip to content
      </a>

      <div ref={containerRef} className="relative mx-auto max-w-3xl">
        <div className="flex h-14 items-center justify-between gap-3 rounded-full border border-[#d4d4d4] bg-[#ffffff]/80 px-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md sm:px-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-[2px] py-1 pr-2"
            onClick={() => setOpenAtPath(null)}
          >
            <DottohMark className="h-6 w-6 shrink-0" />
            <span className="font-display text-lg tracking-wider text-[#000000]">
              DOTTOH
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
            {SITE_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenAtPath(null)}
                  className={`relative rounded-[2px] px-3.5 py-2 font-mono text-xs tracking-wide transition-colors ${
                    active
                      ? "font-medium text-[#000000]"
                      : "text-[#525252] hover:text-[#000000]"
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active-bar"
                      transition={{ type: "spring", stiffness: 450, damping: 36 }}
                      className="absolute inset-x-3.5 bottom-0.5 h-[2px] bg-[#d71921]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff]/90 px-3.5 py-2 font-mono text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
            aria-expanded={menuOpen}
            aria-controls="site-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() =>
              setOpenAtPath((prev) => (prev === pathname ? null : pathname))
            }
          >
            {menuOpen ? (
              <IconCloseCross className="h-3.5 w-3.5" />
            ) : (
              <IconMenuGrid className="h-3.5 w-3.5" />
            )}
            <span>Menu</span>
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              id="site-nav-menu"
              aria-label="Site menu"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 mt-2 w-full max-w-sm border border-[#d4d4d4] bg-[#ffffff]/95 p-2 shadow-[0_14px_32px_rgba(0,0,0,0.08)] backdrop-blur-md"
            >
              <div className="flex flex-col divide-y divide-[#e5e5e5]">
                {SITE_MENU_ITEMS.map((item) => {
                  const active = item.href.includes("?")
                    ? false
                    : isNavItemActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpenAtPath(null)}
                      className="flex items-start justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-[#f4f4f4]"
                    >
                      <div className="space-y-0.5">
                        <span className="block font-sans text-sm font-medium text-[#000000]">
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="block text-xs text-[#525252]">
                            {item.description}
                          </span>
                        )}
                      </div>
                      {active && (
                        <span
                          className="mt-1.5 inline-block h-2 w-2 shrink-0 bg-[#d71921]"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
