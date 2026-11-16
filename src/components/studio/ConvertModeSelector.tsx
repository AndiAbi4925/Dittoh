"use client";

import Link from "next/link";
import { motion } from "motion/react";

interface ConvertModeSelectorProps {
  enableVideoConverter: boolean;
  maxImageSizeMb: number;
  maxVideoSizeMb: number;
  maxVideoDurationSec: number;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function ConvertModeSelector({
  enableVideoConverter,
  maxImageSizeMb,
  maxVideoSizeMb,
  maxVideoDurationSec,
}: ConvertModeSelectorProps) {
  return (
    <div className="mx-auto max-w-4xl py-2 sm:py-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="space-y-2 border-b border-[#e5e5e5] pb-8 text-center sm:text-left"
      >
        <p className="font-mono text-xs text-[#d71921]">STEP 0 / CHOOSE MODE</p>
        <h1 className="font-display text-4xl tracking-tight text-[#000000] sm:text-5xl">
          What do you want to convert?
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[#525252]">
          Pick a still photo for the 4-step converter, or pick a short video or
          GIF for moving ASCII art.
        </p>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.06, ease: EASE_OUT_EXPO }}
          whileHover={{ y: -3 }}
          className="group flex flex-col justify-between rounded-[2px] border border-[#d4d4d4] bg-[#ffffff] p-6 transition-colors hover:border-[#000000] sm:p-8"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#525252]">
                01 / PHOTO
              </span>
              <span
                className="h-2.5 w-2.5 bg-[#000000] transition-colors group-hover:bg-[#d71921]"
                aria-hidden="true"
              />
            </div>

            <h2 className="font-display text-2xl tracking-tight text-[#000000] sm:text-3xl">
              Photo to ASCII
            </h2>

            <p className="text-sm leading-relaxed text-[#525252]">
              Pick an image, optionally remove its background, tune the style,
              and copy text or download PNG, SVG, Markdown, or HTML.
            </p>

            <div className="border-t border-[#e5e5e5] pt-4">
              <p className="font-mono text-xs text-[#000000]">
                PNG, JPG, JPEG, WebP, HEIC, HEIF, Camera RAW
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Up to {maxImageSizeMb} MB per photo, processed on your device.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/convert/photo"
              className="dottoh-btn w-full border border-[#000000] bg-[#000000] px-6 py-4 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
            >
              Choose Photo
            </Link>
            <Link
              href="/convert/photo?sample=sphere"
              className="dottoh-btn w-full border border-[#d4d4d4] bg-[#ffffff] px-6 py-3 text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
            >
              Try Sample Photo
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.12, ease: EASE_OUT_EXPO }}
          whileHover={{ y: -3 }}
          className="group flex flex-col justify-between rounded-[2px] border border-[#d4d4d4] bg-[#ffffff] p-6 transition-colors hover:border-[#000000] sm:p-8"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#525252]">
                02 / VIDEO &amp; GIF
              </span>
              <span
                className={`h-2.5 w-2.5 transition-colors ${
                  enableVideoConverter
                    ? "bg-[#000000] group-hover:bg-[#d71921]"
                    : "bg-[#d4d4d4]"
                }`}
                aria-hidden="true"
              />
            </div>

            <h2 className="font-display text-2xl tracking-tight text-[#000000] sm:text-3xl">
              Video or GIF to ASCII
            </h2>

            <p className="text-sm leading-relaxed text-[#525252]">
              Pick an MP4 or MOV video, or animated GIF, preview ASCII animation
              frame by frame, and export a new MP4 or looping GIF.
            </p>

            <div className="border-t border-[#e5e5e5] pt-4">
              <p className="font-mono text-xs text-[#000000]">
                MP4, MOV, and animated GIFs
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                {enableVideoConverter
                  ? `Up to ${maxVideoSizeMb} MB and ${maxVideoDurationSec} seconds, processed in your browser.`
                  : "Currently paused by site settings."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/video"
              className="dottoh-btn w-full border border-[#000000] bg-[#000000] px-6 py-4 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921]"
            >
              Choose Video or GIF
            </Link>
            <Link
              href="/guide"
              className="dottoh-btn w-full border border-[#d4d4d4] bg-[#ffffff] px-6 py-3 text-xs text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4]"
            >
              See Visual Guide
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
