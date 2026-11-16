"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { DotMatrixHero } from "@/components/DotMatrixHero";

const HERO_WORDS = ["Turn", "photos", "and", "videos", "into", "clean", "ASCII", "art."] as const;
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const WORKFLOW_STEPS = [
  {
    step: "Step 1",
    title: "Pick a photo or clip",
    description:
      "Start with a PNG, JPG, WebP, HEIC, or camera RAW photo, or pick a short MP4 or GIF.",
  },
  {
    step: "Step 2",
    title: "Shape the look",
    description:
      "Erase the photo background if you want, then tune size, contrast, and character style.",
  },
  {
    step: "Step 3",
    title: "Save or copy",
    description:
      "Copy plain text, download PNG, SVG, Markdown, or HTML, or export an ASCII video.",
  },
] as const;

export function MinimalHomeHero() {
  return (
    <div className="bg-[#ffffff] text-[#000000]">
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl leading-tight tracking-tight text-[#000000] sm:text-6xl">
            {HERO_WORDS.map((word, index) => (
              <span key={`${word}-${index}`}>
                <span className="inline-block overflow-hidden align-bottom">
                  <motion.span
                    initial={{ y: "105%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    transition={{
                      duration: 0.48,
                      delay: index * 0.04,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="inline-block"
                  >
                    {word}
                  </motion.span>
                </span>
                {index < HERO_WORDS.length - 1 ? " " : ""}
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.22, ease: EASE_OUT_EXPO }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#525252] sm:text-lg"
          >
            Pick an image or clip, adjust the text look step by step, and save
            or copy your result. Everything runs right in your browser.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.3, ease: EASE_OUT_EXPO }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/convert"
                className="dottoh-btn w-full border border-[#000000] bg-[#000000] px-8 py-4 text-sm text-[#ffffff] hover:border-[#d71921] hover:bg-[#d71921] sm:w-auto"
              >
                Start Converting
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/guide"
                className="dottoh-btn w-full border border-[#d4d4d4] bg-[#ffffff] px-7 py-4 text-sm text-[#000000] hover:border-[#000000] hover:bg-[#f4f4f4] sm:w-auto"
              >
                How It Works
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.44, delay: 0.34, ease: EASE_OUT_EXPO }}
          className="mt-12 sm:mt-16"
        >
          <DotMatrixHero />
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 border-t border-[#e5e5e5] pt-10 sm:grid-cols-3">
          {WORKFLOW_STEPS.map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.34,
                delay: idx * 0.07,
                ease: EASE_OUT_EXPO,
              }}
              whileHover={{ y: -2 }}
              className="group rounded-[2px] border border-[#e5e5e5] bg-[#ffffff] p-5 transition-colors hover:border-[#000000]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#d71921]">
                  {item.step}
                </span>
                <span
                  className="h-1.5 w-1.5 bg-[#d4d4d4] transition-colors group-hover:bg-[#d71921]"
                  aria-hidden="true"
                />
              </div>
              <h2 className="mt-2 font-sans text-base font-medium text-[#000000]">
                {item.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#525252]">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
