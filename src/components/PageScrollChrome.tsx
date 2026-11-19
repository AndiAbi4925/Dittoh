"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { IconArrowUp } from "@/components/BrandMark";

const BACK_TO_TOP_THRESHOLD_PX = 360;
const SCROLLABLE_BUFFER_PX = 48;

export function PageScrollChrome() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    let rafId = 0;

    const update = () => {
      rafId = 0;
      const doc = document.documentElement;
      const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
      const scrollable = maxScroll > SCROLLABLE_BUFFER_PX;
      const currentY = Math.max(0, window.scrollY);
      const ratio = scrollable ? Math.min(1, currentY / maxScroll) : 0;

      setIsScrollable(scrollable);
      setScrollProgress(ratio);
      setShowBackToTop(scrollable && currentY > BACK_TO_TOP_THRESHOLD_PX);
    };

    const schedule = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(update);
      }
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const handleBackToTop = () => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  return (
    <>
      {isScrollable && scrollProgress > 0.004 && (
        <div
          role="progressbar"
          aria-label="Page scroll progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(scrollProgress * 100)}
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent"
        >
          <div
            className="h-full w-full origin-left bg-[#d71921]"
            style={{ transform: `scaleX(${scrollProgress})` }}
          />
        </div>
      )}

      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={handleBackToTop}
            aria-label="Back to top"
            title="Back to top"
            className="dittoh-btn fixed right-4 bottom-5 z-40 h-11 w-11 border border-[#000000] bg-[#ffffff] p-0 text-[#000000] shadow-[0_8px_20px_rgba(0,0,0,0.14)] hover:border-[#d71921] hover:bg-[#d71921] hover:text-[#ffffff] sm:right-6 sm:bottom-6"
          >
            <IconArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
