"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface GuideStep {
  number: string;
  tabLabel: string;
  title: string;
  summary: string;
  tip: string;
  gifSrc: string;
  gifAlt: string;
  ctaLabel: string;
  ctaHref: string;
}

const FIRST_STEP: GuideStep = {
  number: "01",
  tabLabel: "Upload",
  title: "Pick a photo or video, then upload your file",
  summary:
    "Click Convert in the top bar and pick either Photo to ASCII or Video or GIF. Drag in a file from your device, click Choose Photo, or press a sample button to test right away.",
  tip: "Works with PNG, JPG, JPEG, WebP, HEIC, HEIF, camera RAW files, MP4 clips, and animated GIFs.",
  gifSrc: "/guide/step-1-upload.gif",
  gifAlt:
    "Animated walkthrough showing Convert mode selection, loading the Sphere sample photo, and moving to the next step",
  ctaLabel: "Try Step 1",
  ctaHref: "/convert",
};

const GUIDE_STEPS: readonly GuideStep[] = [
  FIRST_STEP,
  {
    number: "02",
    tabLabel: "Background",
    title: "Remove the background if you want",
    summary:
      "Optionally erase the background behind your main subject. You can leave transparency on, switch to black, white, or any custom color, or skip straight to styling.",
    tip: "Everything runs directly inside your browser so your photo never leaves your device.",
    gifSrc: "/guide/step-2-background.gif",
    gifAlt:
      "Animated walkthrough showing one-click background removal and background fill color toggles",
    ctaLabel: "Try Photo Tool",
    ctaHref: "/convert/photo?sample=sphere",
  },
  {
    number: "03",
    tabLabel: "Style",
    title: "Adjust character style, width, and colors live",
    summary:
      "Pick a character style like Standard, Detailed, or Blocks, drag the width slider to control detail, and switch between black and white, photo colors, or custom colors.",
    tip: "Use the Fit or 1:1 toggle at the top right of the preview box to inspect individual characters up close.",
    gifSrc: "/guide/step-3-style.gif",
    gifAlt:
      "Animated walkthrough showing live ASCII style preset switching, color modes, and instant preview updates",
    ctaLabel: "Open Sample in Editor",
    ctaHref: "/convert/photo?sample=monolith",
  },
  {
    number: "04",
    tabLabel: "Save & Video",
    title: "Copy text, download files, or convert a video",
    summary:
      "Copy plain text directly for chat and notes, save a high-resolution PNG, SVG, Markdown, or HTML file, or switch to the Video & GIF mode for moving ASCII clips.",
    tip: "Video mode lets you trim clips, pick frame rate, and save a new MP4 or looping GIF.",
    gifSrc: "/guide/step-4-save.gif",
    gifAlt:
      "Animated walkthrough showing text copy confirmation, file format downloads, and switching to Video and GIF mode",
    ctaLabel: "Open Video & GIF",
    ctaHref: "/video",
  },
] as const;

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function GuideWalkthrough() {
  const [activeIdx, setActiveIdx] = useState(0);
  const current: GuideStep = GUIDE_STEPS[activeIdx] ?? FIRST_STEP;

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Guide walkthrough steps"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
      >
        {GUIDE_STEPS.map((step, index) => {
          const active = index === activeIdx;
          return (
            <button
              key={step.number}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveIdx(index)}
              className={`relative flex items-center gap-2 rounded-[2px] border px-3 py-2.5 text-left transition-colors ${
                active
                  ? "border-[#000000] bg-[#000000] text-[#ffffff]"
                  : "border-[#d4d4d4] bg-[#ffffff] text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] font-mono text-[11px] ${
                  active
                    ? "bg-[#d71921] text-[#ffffff]"
                    : "bg-[#f4f4f4] text-[#525252]"
                }`}
              >
                {step.number}
              </span>
              <span className="truncate font-sans text-xs font-medium sm:text-sm">
                {step.tabLabel}
              </span>
              {active && (
                <motion.span
                  layoutId="guide-active-bar"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-x-0 -bottom-px h-[2px] bg-[#d71921]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.number}
          role="tabpanel"
          aria-label={`Step ${current.number}: ${current.tabLabel}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
          className="overflow-hidden rounded-[2px] border border-[#d4d4d4] bg-[#ffffff]"
        >
          <div className="border-b border-[#e5e5e5] bg-[#f4f4f4] p-2 sm:p-3">
            <div className="overflow-hidden rounded-[2px] border border-[#d4d4d4] bg-[#ffffff]">
              <Image
                src={current.gifSrc}
                alt={current.gifAlt}
                width={900}
                height={570}
                unoptimized
                priority={activeIdx === 0}
                className="block h-auto w-full"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-end sm:p-6">
            <div className="max-w-xl space-y-2">
              <p className="font-mono text-xs text-[#d71921]">
                STEP {current.number} / {GUIDE_STEPS.length.toString().padStart(2, "0")}
              </p>
              <h3 className="font-display text-2xl tracking-tight text-[#000000]">
                {current.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#525252]">
                {current.summary}
              </p>
              <p className="font-mono text-xs text-[#737373]">{current.tip}</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={activeIdx === 0}
                onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
                className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3.5 py-2.5 text-xs text-[#000000] hover:border-[#000000] disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveIdx((prev) => (prev + 1) % GUIDE_STEPS.length)
                }
                className="dottoh-btn border border-[#d4d4d4] bg-[#ffffff] px-3.5 py-2.5 text-xs text-[#000000] hover:border-[#000000]"
              >
                Next
              </button>
              <Link
                href={current.ctaHref}
                className="dottoh-btn border border-[#000000] bg-[#000000] px-4 py-2.5 text-xs text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
              >
                {current.ctaLabel}
              </Link>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
