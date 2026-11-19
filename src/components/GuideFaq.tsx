"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export const GUIDE_FAQ_ITEMS: readonly FaqEntry[] = [
  {
    id: "privacy-device",
    question: "Are my photos or videos uploaded to a server?",
    answer:
      "No. Photo decoding, background removal, manual brush edits, video frame extraction, and ASCII exports all run directly on your own device inside your browser. Your media bytes never leave your phone or computer.",
  },
  {
    id: "bg-modes",
    question: "What is the difference between Auto Remove, Magic Wand, and Smart Brush?",
    answer:
      "Auto Remove uses a local segmentation model to cut out the main subject in one click. Magic Wand clears (or restores) regions with similar color when you click them. Smart Brush lets you paint freely while protecting contrasting subject edges inside the brush circle, and standard Brush edits every pixel manually.",
  },
  {
    id: "raw-support",
    question: "Why did my camera RAW photo fail to open?",
    answer:
      "Dittoh supports DNG, Canon CR2/CR3, Sony ARW, Fujifilm RAF, and standard Nikon NEF files. Very recent camera high-efficiency compression formats (such as Nikon Z6 III 8-bit HE NEF) are not yet decoded by the browser RAW library; converting those to DNG, PNG, or JPG first works immediately.",
  },
  {
    id: "discord-limit",
    question: "Why does Discord cut off my pasted ASCII art?",
    answer:
      "Standard Discord messages accept up to 2,000 characters. Step 4 (Save) shows a live character count advisor against that limit. If your art exceeds 2,000 characters, go back to Step 3 and reduce the Detail (width) slider, or download a PNG or TXT file instead.",
  },
  {
    id: "video-formats",
    question: "Which video formats and lengths work best?",
    answer:
      "The Video & GIF tool supports MP4, MOV (QuickTime), and animated GIF files. Short clips up to 15 to 30 seconds at 10 to 15 FPS convert quickest in browser memory and produce crisp MP4 or looping GIF exports.",
  },
  {
    id: "saved-styles",
    question: "How do saved styles and recent history work without an account?",
    answer:
      "Saved styles and optional export history are stored only in your browser localStorage. You can apply, delete, or clear them at any time on Step 3, and nothing is tied to a personal account.",
  },
] as const;

export function GuideFaq() {
  const [openId, setOpenId] = useState<string | null>(GUIDE_FAQ_ITEMS[0]?.id ?? null);

  return (
    <div className="divide-y divide-[#e5e5e5] border border-[#d4d4d4] bg-[#ffffff]">
      {GUIDE_FAQ_ITEMS.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;

        return (
          <div key={item.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
              className="flex min-h-[52px] w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-[#f4f4f4] sm:px-5"
            >
              <span className="font-sans text-sm font-medium text-[#000000] sm:text-base">
                {item.question}
              </span>
              <span
                aria-hidden="true"
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] border font-mono text-xs transition-colors ${
                  isOpen
                    ? "border-[#d71921] bg-[#d71921] text-[#ffffff]"
                    : "border-[#d4d4d4] bg-[#ffffff] text-[#000000]"
                }`}
              >
                {isOpen ? "-" : "+"}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="border-t border-[#e5e5e5] bg-[#f4f4f4] px-4 py-4 text-sm leading-relaxed text-[#525252] sm:px-5">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
