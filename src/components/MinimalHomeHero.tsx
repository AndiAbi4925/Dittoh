"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { DotMatrixHero } from "@/components/DotMatrixHero";

export function MinimalHomeHero() {
  return (
    <div className="bg-[#ffffff] text-[#000000]">
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h1 className="font-display text-4xl leading-tight tracking-tight text-[#000000] sm:text-6xl">
            Turn photos into clean ASCII art.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#525252] sm:text-lg">
            Pick an image, adjust the text look step by step, and download or
            copy your result. Everything runs right in your browser.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/convert"
              className="dottoh-btn w-full border border-[#000000] bg-[#000000] px-8 py-4 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] sm:w-auto"
            >
              Start Converting
            </Link>
            <Link
              href="/guide"
              className="dottoh-btn w-full border border-[#d4d4d4] bg-[#ffffff] px-7 py-4 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4] sm:w-auto"
            >
              How It Works
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.08 }}
          className="mt-12 sm:mt-16"
        >
          <DotMatrixHero />
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-8 border-t border-[#e5e5e5] pt-10 sm:grid-cols-3">
          <div>
            <span className="font-mono text-xs text-[#d71921]">Step 1</span>
            <h2 className="mt-1.5 font-sans text-base font-medium text-[#000000]">
              Choose your photo
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#525252]">
              Drop a PNG, JPG, WebP, HEIC, or camera RAW file, or start with a
              sample picture.
            </p>
          </div>

          <div>
            <span className="font-mono text-xs text-[#d71921]">Step 2</span>
            <h2 className="mt-1.5 font-sans text-base font-medium text-[#000000]">
              Shape the look
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#525252]">
              Erase the background if you want, then set the size, brightness,
              and character style.
            </p>
          </div>

          <div>
            <span className="font-mono text-xs text-[#d71921]">Step 3</span>
            <h2 className="mt-1.5 font-sans text-base font-medium text-[#000000]">
              Save or copy
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#525252]">
              Grab plain text for chat, Markdown, SVG, HTML, or a crisp PNG
              image.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
