"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  DottohMark,
  IconCloseCross,
  IconMenuGrid,
  IconShieldLock,
} from "@/components/BrandMark";
import { SITE_NAV_ITEMS } from "@/lib/site-config";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#b1b3b3] bg-[#ffffff]/95 backdrop-blur-xs">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-[#000000] focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-[#ffffff]"
      >
        SKIP TO CONTENT
      </a>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-[2px] py-1 pr-2"
            onClick={() => setMobileOpen(false)}
          >
            <DottohMark className="h-7 w-7 shrink-0" />
            <span className="font-display text-xl tracking-wider text-[#000000]">
              DOTTOH
            </span>
          </Link>

          <span className="hidden items-center gap-2 border border-[#b1b3b3] bg-[#f4f4f4] px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-[#000000] md:inline-flex">
            <span className="inline-block h-1.5 w-1.5 bg-[#d71921]" aria-hidden="true" />
            LOCAL BROWSER ENGINE
          </span>
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {SITE_NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-[2px] px-3.5 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                  isActive
                    ? "text-[#000000] font-medium"
                    : "text-[#525252] hover:text-[#000000]"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-bar"
                    transition={{ type: "spring", stiffness: 450, damping: 36 }}
                    className="absolute inset-x-3.5 bottom-0.5 h-[2px] bg-[#d71921]"
                  />
                )}
              </Link>
            );
          })}

          <span
            className="ml-3 inline-flex items-center gap-1.5 border border-[#000000] bg-[#000000] px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#ffffff] rounded-[2px]"
            title="Zero media files leave your browser"
          >
            <IconShieldLock className="h-3.5 w-3.5 text-[#ffffff]" />
            <span>ZERO UPLOAD</span>
          </span>
        </nav>

        <button
          type="button"
          className="dottoh-btn border border-[#b1b3b3] bg-[#f4f4f4] px-3 py-2 text-[#000000] hover:border-[#000000] md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-panel"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? (
            <IconCloseCross className="h-4 w-4" />
          ) : (
            <IconMenuGrid className="h-4 w-4" />
          )}
          <span>MENU</span>
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            id="mobile-nav-panel"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-[#b1b3b3] bg-[#f4f4f4] md:hidden"
          >
            <div className="flex flex-col divide-y divide-[#b1b3b3] px-4 py-2">
              {SITE_NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between py-3 font-mono text-xs uppercase tracking-widest text-[#000000]"
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        className="inline-block h-2 w-2 bg-[#d71921]"
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
    </header>
  );
}
